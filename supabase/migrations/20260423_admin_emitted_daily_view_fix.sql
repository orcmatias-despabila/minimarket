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

grant select on public.v_document_emitted_summary_daily to authenticated;

comment on view public.v_document_emitted_summary_daily is
'Resumen diario de documentos emitidos. Filtrar por business_id e issue_date o period_month desde la aplicacion.';

notify pgrst, 'reload schema';
