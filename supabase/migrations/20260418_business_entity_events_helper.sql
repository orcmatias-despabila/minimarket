create or replace function public.log_business_entity_event(
  target_business_id uuid,
  target_entity_type text,
  target_entity_id uuid,
  target_action_type text,
  target_previous_data jsonb default null,
  target_new_data jsonb default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  inserted_id uuid;
begin
  insert into public.business_entity_events (
    business_id,
    entity_type,
    entity_id,
    action_type,
    previous_data,
    new_data,
    actor_user_id
  )
  values (
    target_business_id,
    target_entity_type,
    target_entity_id,
    target_action_type,
    target_previous_data,
    target_new_data,
    auth.uid()
  )
  returning id into inserted_id;

  return inserted_id;
end;
$$;

comment on function public.log_business_entity_event(uuid, text, uuid, text, jsonb, jsonb) is
'Helper minimo para que el frontend registre auditoria documental via RPC. Uso sugerido: create => new_data; update => previous_data + new_data; status_changed => ambos snapshots con status; attachment_uploaded => new_data con metadata; delete => previous_data.';
