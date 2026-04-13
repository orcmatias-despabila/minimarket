create or replace function public.clean_chilean_rut(value text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(value, ''), '[^0-9kK]', '', 'g'));
$$;

create or replace function public.normalize_chilean_rut(value text)
returns text
language plpgsql
immutable
as $$
declare
  cleaned text := public.clean_chilean_rut(value);
  body text;
  verifier text;
begin
  if cleaned = '' then
    return null;
  end if;

  if char_length(cleaned) < 2 then
    return null;
  end if;

  body := left(cleaned, char_length(cleaned) - 1);
  verifier := right(cleaned, 1);

  if body !~ '^\d{7,8}$' or verifier !~ '^[0-9K]$' then
    return null;
  end if;

  return body || '-' || verifier;
end;
$$;

create or replace function public.is_valid_chilean_rut(value text)
returns boolean
language plpgsql
immutable
as $$
declare
  normalized text := public.normalize_chilean_rut(value);
  body text;
  verifier text;
  expected text;
  digits_reversed text;
  idx integer;
  multiplier integer := 2;
  total integer := 0;
  digit integer;
  remainder integer;
begin
  if normalized is null then
    return false;
  end if;

  body := split_part(normalized, '-', 1);
  verifier := split_part(normalized, '-', 2);
  digits_reversed := reverse(body);

  for idx in 1..char_length(digits_reversed) loop
    digit := cast(substr(digits_reversed, idx, 1) as integer);
    total := total + (digit * multiplier);
    multiplier := case when multiplier = 7 then 2 else multiplier + 1 end;
  end loop;

  remainder := 11 - (total % 11);
  expected := case
    when remainder = 11 then '0'
    when remainder = 10 then 'K'
    else remainder::text
  end;

  return verifier = expected;
end;
$$;

create or replace function public.enforce_chilean_rut_fields()
returns trigger
language plpgsql
as $$
declare
  raw_value text;
  normalized_value text;
begin
  if tg_table_name = 'customers' then
    if tg_op = 'INSERT' or new.tax_id is distinct from old.tax_id then
      raw_value := coalesce(new.tax_id, '');
      normalized_value := public.normalize_chilean_rut(raw_value);

      if normalized_value is null or public.is_valid_chilean_rut(raw_value) is not true then
        raise exception 'El RUT del cliente no es valido.';
      end if;

      new.tax_id := normalized_value;
    end if;
  elsif tg_table_name = 'suppliers' then
    if tg_op = 'INSERT' or new.tax_id is distinct from old.tax_id then
      raw_value := coalesce(new.tax_id, '');
      normalized_value := public.normalize_chilean_rut(raw_value);

      if normalized_value is null or public.is_valid_chilean_rut(raw_value) is not true then
        raise exception 'El RUT del proveedor no es valido.';
      end if;

      new.tax_id := normalized_value;
    end if;
  elsif tg_table_name = 'business_documents' then
    if tg_op = 'INSERT' or new.counterparty_rut is distinct from old.counterparty_rut then
      raw_value := btrim(coalesce(new.counterparty_rut, ''));

      if raw_value = '' then
        new.counterparty_rut := null;
      else
        normalized_value := public.normalize_chilean_rut(raw_value);

        if normalized_value is null or public.is_valid_chilean_rut(raw_value) is not true then
          raise exception 'El RUT de la contraparte no es valido.';
        end if;

        new.counterparty_rut := normalized_value;
      end if;
    end if;
  elsif tg_table_name = 'business_received_dte_inbox' then
    if tg_op = 'INSERT' or new.issuer_tax_id is distinct from old.issuer_tax_id then
      raw_value := btrim(coalesce(new.issuer_tax_id, ''));

      if raw_value = '' then
        new.issuer_tax_id := null;
      else
        normalized_value := public.normalize_chilean_rut(raw_value);

        if normalized_value is null or public.is_valid_chilean_rut(raw_value) is not true then
          raise exception 'El RUT del emisor recibido no es valido.';
        end if;

        new.issuer_tax_id := normalized_value;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_customers_enforce_chilean_rut on public.customers;
create trigger trg_customers_enforce_chilean_rut
before insert or update on public.customers
for each row
execute function public.enforce_chilean_rut_fields();

drop trigger if exists trg_suppliers_enforce_chilean_rut on public.suppliers;
create trigger trg_suppliers_enforce_chilean_rut
before insert or update on public.suppliers
for each row
execute function public.enforce_chilean_rut_fields();

drop trigger if exists trg_business_documents_enforce_chilean_rut on public.business_documents;
create trigger trg_business_documents_enforce_chilean_rut
before insert or update on public.business_documents
for each row
execute function public.enforce_chilean_rut_fields();

drop trigger if exists trg_business_received_dte_inbox_enforce_chilean_rut on public.business_received_dte_inbox;
create trigger trg_business_received_dte_inbox_enforce_chilean_rut
before insert or update on public.business_received_dte_inbox
for each row
execute function public.enforce_chilean_rut_fields();

comment on function public.clean_chilean_rut(text) is
'Limpia un RUT chileno dejando solo digitos y K en mayuscula.';

comment on function public.normalize_chilean_rut(text) is
'Normaliza un RUT chileno valido al formato XXXXXXXX-X. Devuelve null si no cumple estructura base.';

comment on function public.is_valid_chilean_rut(text) is
'Valida un RUT chileno con algoritmo real de digito verificador.';

notify pgrst, 'reload schema';
