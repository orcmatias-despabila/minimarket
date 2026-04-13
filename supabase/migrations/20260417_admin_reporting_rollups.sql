create or replace view public.v_purchases_by_supplier_rollup
with (security_invoker = true) as
select
  d.business_id,
  d.supplier_id,
  coalesce(s.legal_name, d.counterparty_name, 'Proveedor no identificado') as supplier_name,
  coalesce(s.tax_id, d.counterparty_rut) as supplier_tax_id,
  count(*)::bigint as document_count,
  min(d.issue_date) as first_issue_date,
  max(d.issue_date) as last_issue_date,
  coalesce(sum(d.net_amount), 0)::numeric(14, 2) as net_amount,
  coalesce(sum(d.tax_amount), 0)::numeric(14, 2) as tax_amount,
  coalesce(sum(d.exempt_amount), 0)::numeric(14, 2) as exempt_amount,
  coalesce(sum(d.total_amount), 0)::numeric(14, 2) as total_amount
from public.business_documents d
left join public.suppliers s on s.id = d.supplier_id
where d.direction = 'received'
group by
  d.business_id,
  d.supplier_id,
  coalesce(s.legal_name, d.counterparty_name, 'Proveedor no identificado'),
  coalesce(s.tax_id, d.counterparty_rut);

create or replace view public.v_sales_by_customer_rollup
with (security_invoker = true) as
select
  d.business_id,
  d.customer_id,
  coalesce(c.legal_name, d.counterparty_name, 'Cliente no identificado') as customer_name,
  coalesce(c.tax_id, d.counterparty_rut) as customer_tax_id,
  count(*)::bigint as document_count,
  min(d.issue_date) as first_issue_date,
  max(d.issue_date) as last_issue_date,
  coalesce(sum(d.net_amount), 0)::numeric(14, 2) as net_amount,
  coalesce(sum(d.tax_amount), 0)::numeric(14, 2) as tax_amount,
  coalesce(sum(d.exempt_amount), 0)::numeric(14, 2) as exempt_amount,
  coalesce(sum(d.total_amount), 0)::numeric(14, 2) as total_amount
from public.business_documents d
left join public.customers c on c.id = d.customer_id
where d.direction = 'emitted'
group by
  d.business_id,
  d.customer_id,
  coalesce(c.legal_name, d.counterparty_name, 'Cliente no identificado'),
  coalesce(c.tax_id, d.counterparty_rut);

create or replace view public.v_documents_by_type_rollup
with (security_invoker = true) as
select
  d.business_id,
  d.direction,
  d.document_type,
  d.status,
  count(*)::bigint as document_count,
  min(d.issue_date) as first_issue_date,
  max(d.issue_date) as last_issue_date,
  coalesce(sum(d.net_amount), 0)::numeric(14, 2) as net_amount,
  coalesce(sum(d.tax_amount), 0)::numeric(14, 2) as tax_amount,
  coalesce(sum(d.exempt_amount), 0)::numeric(14, 2) as exempt_amount,
  coalesce(sum(d.total_amount), 0)::numeric(14, 2) as total_amount
from public.business_documents d
group by
  d.business_id,
  d.direction,
  d.document_type,
  d.status;

comment on view public.v_purchases_by_supplier_rollup is
'Vista acumulada por proveedor para dashboards administrativos. Filtrar por business_id y, si se requiere, complementar con business_documents para rango de fechas.';

comment on view public.v_sales_by_customer_rollup is
'Vista acumulada por cliente para dashboards administrativos. Filtrar por business_id y, si se requiere, complementar con business_documents para rango de fechas.';

comment on view public.v_documents_by_type_rollup is
'Vista acumulada por tipo y direccion documental. Complementa las vistas diarias sin reemplazarlas.';
