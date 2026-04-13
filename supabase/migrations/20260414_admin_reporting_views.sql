create or replace view public.v_document_emitted_summary_daily
with (security_invoker = true) as
select
  d.business_id,
  d.issue_date,
  date_trunc('month', d.issue_date::timestamp)::date as period_month,
  d.document_type,
  d.status,
  count(*)::bigint as document_count,
  coalesce(sum(d.net_amount), 0)::numeric(14, 2) as net_amount,
  coalesce(sum(d.tax_amount), 0)::numeric(14, 2) as tax_amount,
  coalesce(sum(d.exempt_amount), 0)::numeric(14, 2) as exempt_amount,
  coalesce(sum(d.total_amount), 0)::numeric(14, 2) as total_amount
from public.business_documents d
where d.direction = 'emitted'
group by
  d.business_id,
  d.issue_date,
  date_trunc('month', d.issue_date::timestamp)::date,
  d.document_type,
  d.status;

create or replace view public.v_document_received_summary_daily
with (security_invoker = true) as
select
  d.business_id,
  d.issue_date,
  date_trunc('month', d.issue_date::timestamp)::date as period_month,
  d.document_type,
  d.status,
  count(*)::bigint as document_count,
  coalesce(sum(d.net_amount), 0)::numeric(14, 2) as net_amount,
  coalesce(sum(d.tax_amount), 0)::numeric(14, 2) as tax_amount,
  coalesce(sum(d.exempt_amount), 0)::numeric(14, 2) as exempt_amount,
  coalesce(sum(d.total_amount), 0)::numeric(14, 2) as total_amount
from public.business_documents d
where d.direction = 'received'
group by
  d.business_id,
  d.issue_date,
  date_trunc('month', d.issue_date::timestamp)::date,
  d.document_type,
  d.status;

create or replace view public.v_purchases_by_supplier
with (security_invoker = true) as
select
  d.business_id,
  d.supplier_id,
  coalesce(s.legal_name, d.counterparty_name, 'Proveedor no identificado') as supplier_name,
  coalesce(s.tax_id, d.counterparty_rut) as supplier_tax_id,
  d.issue_date,
  date_trunc('month', d.issue_date::timestamp)::date as period_month,
  d.document_type,
  d.status,
  count(*)::bigint as document_count,
  coalesce(sum(d.net_amount), 0)::numeric(14, 2) as net_amount,
  coalesce(sum(d.tax_amount), 0)::numeric(14, 2) as tax_amount,
  coalesce(sum(d.total_amount), 0)::numeric(14, 2) as total_amount
from public.business_documents d
left join public.suppliers s on s.id = d.supplier_id
where d.direction = 'received'
group by
  d.business_id,
  d.supplier_id,
  coalesce(s.legal_name, d.counterparty_name, 'Proveedor no identificado'),
  coalesce(s.tax_id, d.counterparty_rut),
  d.issue_date,
  date_trunc('month', d.issue_date::timestamp)::date,
  d.document_type,
  d.status;

create or replace view public.v_sales_by_customer
with (security_invoker = true) as
select
  d.business_id,
  d.customer_id,
  coalesce(c.legal_name, d.counterparty_name, 'Cliente no identificado') as customer_name,
  coalesce(c.tax_id, d.counterparty_rut) as customer_tax_id,
  d.issue_date,
  date_trunc('month', d.issue_date::timestamp)::date as period_month,
  d.document_type,
  d.status,
  count(*)::bigint as document_count,
  coalesce(sum(d.net_amount), 0)::numeric(14, 2) as net_amount,
  coalesce(sum(d.tax_amount), 0)::numeric(14, 2) as tax_amount,
  coalesce(sum(d.total_amount), 0)::numeric(14, 2) as total_amount
from public.business_documents d
left join public.customers c on c.id = d.customer_id
where d.direction = 'emitted'
group by
  d.business_id,
  d.customer_id,
  coalesce(c.legal_name, d.counterparty_name, 'Cliente no identificado'),
  coalesce(c.tax_id, d.counterparty_rut),
  d.issue_date,
  date_trunc('month', d.issue_date::timestamp)::date,
  d.document_type,
  d.status;

create or replace view public.v_documents_by_type
with (security_invoker = true) as
select
  d.business_id,
  d.direction,
  d.document_type,
  d.status,
  d.issue_date,
  date_trunc('month', d.issue_date::timestamp)::date as period_month,
  count(*)::bigint as document_count,
  coalesce(sum(d.net_amount), 0)::numeric(14, 2) as net_amount,
  coalesce(sum(d.tax_amount), 0)::numeric(14, 2) as tax_amount,
  coalesce(sum(d.exempt_amount), 0)::numeric(14, 2) as exempt_amount,
  coalesce(sum(d.total_amount), 0)::numeric(14, 2) as total_amount
from public.business_documents d
group by
  d.business_id,
  d.direction,
  d.document_type,
  d.status,
  d.issue_date,
  date_trunc('month', d.issue_date::timestamp)::date;

create or replace view public.v_credit_notes_summary
with (security_invoker = true) as
select
  d.business_id,
  d.direction,
  d.issue_date,
  date_trunc('month', d.issue_date::timestamp)::date as period_month,
  d.status,
  count(*)::bigint as credit_note_count,
  coalesce(sum(d.net_amount), 0)::numeric(14, 2) as net_amount,
  coalesce(sum(d.tax_amount), 0)::numeric(14, 2) as tax_amount,
  coalesce(sum(d.total_amount), 0)::numeric(14, 2) as total_amount,
  count(distinct r.referenced_document_id)::bigint as referenced_internal_documents
from public.business_documents d
left join public.business_document_references r on r.document_id = d.id
where d.document_type = 'nota_credito'
group by
  d.business_id,
  d.direction,
  d.issue_date,
  date_trunc('month', d.issue_date::timestamp)::date,
  d.status;

create or replace view public.v_purchases_vs_sales_monthly
with (security_invoker = true) as
with base_months as (
  select distinct
    d.business_id,
    date_trunc('month', d.issue_date::timestamp)::date as period_month
  from public.business_documents d
),
document_monthly as (
  select
    d.business_id,
    date_trunc('month', d.issue_date::timestamp)::date as period_month,
    d.direction,
    coalesce(sum(d.total_amount), 0)::numeric(14, 2) as total_amount
  from public.business_documents d
  where d.document_type <> 'nota_credito'
  group by
    d.business_id,
    date_trunc('month', d.issue_date::timestamp)::date,
    d.direction
),
credit_note_monthly as (
  select
    d.business_id,
    date_trunc('month', d.issue_date::timestamp)::date as period_month,
    d.direction,
    coalesce(sum(d.total_amount), 0)::numeric(14, 2) as total_amount
  from public.business_documents d
  where d.document_type = 'nota_credito'
  group by
    d.business_id,
    date_trunc('month', d.issue_date::timestamp)::date,
    d.direction
)
select
  bm.business_id,
  bm.period_month,
  coalesce(dr.total_amount, 0)::numeric(14, 2) as purchase_total_amount,
  coalesce(de.total_amount, 0)::numeric(14, 2) as sales_total_amount,
  coalesce(cnr.total_amount, 0)::numeric(14, 2) as received_credit_note_total,
  coalesce(cne.total_amount, 0)::numeric(14, 2) as emitted_credit_note_total,
  (
    coalesce(de.total_amount, 0)
    - coalesce(dr.total_amount, 0)
  )::numeric(14, 2) as gross_difference_amount,
  (
    (
      coalesce(de.total_amount, 0)
      - coalesce(cne.total_amount, 0)
    )
    - (
      coalesce(dr.total_amount, 0)
      - coalesce(cnr.total_amount, 0)
    )
  )::numeric(14, 2) as net_difference_after_credit_notes
from base_months bm
left join document_monthly dr
  on dr.business_id = bm.business_id
 and dr.period_month = bm.period_month
 and dr.direction = 'received'
left join document_monthly de
  on de.business_id = bm.business_id
 and de.period_month = bm.period_month
 and de.direction = 'emitted'
left join credit_note_monthly cnr
  on cnr.business_id = bm.business_id
 and cnr.period_month = bm.period_month
 and cnr.direction = 'received'
left join credit_note_monthly cne
  on cne.business_id = bm.business_id
 and cne.period_month = bm.period_month
 and cne.direction = 'emitted';

comment on view public.v_document_emitted_summary_daily is
'Resumen diario de documentos emitidos. Filtrar por business_id e issue_date o period_month desde la aplicacion.';

comment on view public.v_document_received_summary_daily is
'Resumen diario de documentos recibidos. Filtrar por business_id e issue_date o period_month desde la aplicacion.';

comment on view public.v_purchases_by_supplier is
'Totales de compras por proveedor, con soporte para proveedor vinculado o solo datos snapshot del documento.';

comment on view public.v_sales_by_customer is
'Totales de ventas documentales por cliente, con soporte para cliente vinculado o solo datos snapshot del documento.';

comment on view public.v_documents_by_type is
'Resumen por tipo de documento y direccion para uso en dashboards y filtros administrativos.';

comment on view public.v_credit_notes_summary is
'Resumen de notas de credito emitidas y recibidas, incluyendo cantidad de referencias internas encontradas.';

comment on view public.v_purchases_vs_sales_monthly is
'Comparacion mensual entre compras y ventas documentales. No reemplaza contabilidad formal y depende solo de business_documents.';
