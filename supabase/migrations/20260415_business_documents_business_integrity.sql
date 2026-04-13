create or replace function public.validate_business_document_counterparties()
returns trigger
language plpgsql
as $$
declare
  v_customer_business_id uuid;
  v_supplier_business_id uuid;
begin
  if new.customer_id is not null then
    select c.business_id
      into v_customer_business_id
    from public.customers c
    where c.id = new.customer_id;

    if v_customer_business_id is null then
      raise exception using
        errcode = '23503',
        message = 'Customer referenced by business_documents does not exist.',
        detail = format('customer_id=%s', new.customer_id);
    end if;

    if v_customer_business_id <> new.business_id then
      raise exception using
        errcode = '23514',
        message = 'Customer does not belong to the same business as the document.',
        detail = format(
          'document business_id=%s, customer business_id=%s, customer_id=%s',
          new.business_id,
          v_customer_business_id,
          new.customer_id
        );
    end if;
  end if;

  if new.supplier_id is not null then
    select s.business_id
      into v_supplier_business_id
    from public.suppliers s
    where s.id = new.supplier_id;

    if v_supplier_business_id is null then
      raise exception using
        errcode = '23503',
        message = 'Supplier referenced by business_documents does not exist.',
        detail = format('supplier_id=%s', new.supplier_id);
    end if;

    if v_supplier_business_id <> new.business_id then
      raise exception using
        errcode = '23514',
        message = 'Supplier does not belong to the same business as the document.',
        detail = format(
          'document business_id=%s, supplier business_id=%s, supplier_id=%s',
          new.business_id,
          v_supplier_business_id,
          new.supplier_id
        );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_business_documents_validate_counterparties on public.business_documents;
create trigger trg_business_documents_validate_counterparties
before insert or update on public.business_documents
for each row
execute function public.validate_business_document_counterparties();

comment on function public.validate_business_document_counterparties() is
'Valida a nivel de base de datos que customer_id y supplier_id, si existen, pertenezcan al mismo business_id del documento.';
