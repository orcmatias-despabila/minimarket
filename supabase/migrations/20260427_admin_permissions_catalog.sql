create or replace function public.seed_admin_matrix_permissions_for_business(target_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.permissions (business_id, code, name, description, module_name, is_system)
  values
    (target_business_id, 'clients.read', 'Ver clientes', 'Permite ver el maestro de clientes.', 'clients', true),
    (target_business_id, 'clients.create', 'Crear clientes', 'Permite crear clientes.', 'clients', true),
    (target_business_id, 'clients.update', 'Editar clientes', 'Permite editar clientes.', 'clients', true),
    (target_business_id, 'clients.delete', 'Eliminar clientes', 'Permite eliminar clientes.', 'clients', true),
    (target_business_id, 'clients.approve', 'Aprobar clientes', 'Permite aprobar cambios administrativos sobre clientes.', 'clients', true),
    (target_business_id, 'clients.export', 'Exportar clientes', 'Permite exportar el maestro de clientes.', 'clients', true),
    (target_business_id, 'suppliers.read', 'Ver proveedores', 'Permite ver el maestro de proveedores.', 'suppliers', true),
    (target_business_id, 'suppliers.create', 'Crear proveedores', 'Permite crear proveedores.', 'suppliers', true),
    (target_business_id, 'suppliers.update', 'Editar proveedores', 'Permite editar proveedores.', 'suppliers', true),
    (target_business_id, 'suppliers.delete', 'Eliminar proveedores', 'Permite eliminar proveedores.', 'suppliers', true),
    (target_business_id, 'suppliers.approve', 'Aprobar proveedores', 'Permite aprobar cambios administrativos sobre proveedores.', 'suppliers', true),
    (target_business_id, 'suppliers.export', 'Exportar proveedores', 'Permite exportar el maestro de proveedores.', 'suppliers', true),
    (target_business_id, 'documents.read', 'Ver documentos', 'Permite ver documentos administrativos.', 'documents', true),
    (target_business_id, 'documents.create', 'Crear documentos', 'Permite crear documentos administrativos.', 'documents', true),
    (target_business_id, 'documents.update', 'Editar documentos', 'Permite editar documentos administrativos.', 'documents', true),
    (target_business_id, 'documents.delete', 'Eliminar documentos', 'Permite eliminar documentos administrativos.', 'documents', true),
    (target_business_id, 'documents.approve', 'Aprobar documentos', 'Permite aprobar o validar documentos administrativos.', 'documents', true),
    (target_business_id, 'documents.export', 'Exportar documentos', 'Permite exportar documentos administrativos.', 'documents', true),
    (target_business_id, 'inventory.read', 'Ver inventario', 'Permite ver inventario.', 'inventory', true),
    (target_business_id, 'inventory.create', 'Crear inventario', 'Permite crear registros de inventario.', 'inventory', true),
    (target_business_id, 'inventory.update', 'Editar inventario', 'Permite editar inventario.', 'inventory', true),
    (target_business_id, 'inventory.delete', 'Eliminar inventario', 'Permite eliminar registros de inventario.', 'inventory', true),
    (target_business_id, 'inventory.approve', 'Aprobar inventario', 'Permite aprobar ajustes de inventario.', 'inventory', true),
    (target_business_id, 'inventory.export', 'Exportar inventario', 'Permite exportar datos de inventario.', 'inventory', true),
    (target_business_id, 'sales.read', 'Ver ventas', 'Permite ver ventas.', 'sales', true),
    (target_business_id, 'sales.create', 'Crear ventas', 'Permite crear ventas.', 'sales', true),
    (target_business_id, 'sales.update', 'Editar ventas', 'Permite editar ventas.', 'sales', true),
    (target_business_id, 'sales.delete', 'Eliminar ventas', 'Permite eliminar ventas.', 'sales', true),
    (target_business_id, 'sales.approve', 'Aprobar ventas', 'Permite aprobar operaciones de venta.', 'sales', true),
    (target_business_id, 'sales.export', 'Exportar ventas', 'Permite exportar ventas.', 'sales', true),
    (target_business_id, 'personal.read', 'Ver personal', 'Permite ver personal y trabajadores.', 'personal', true),
    (target_business_id, 'personal.create', 'Crear personal', 'Permite crear fichas de personal.', 'personal', true),
    (target_business_id, 'personal.update', 'Editar personal', 'Permite editar fichas de personal.', 'personal', true),
    (target_business_id, 'personal.delete', 'Eliminar personal', 'Permite eliminar fichas de personal.', 'personal', true),
    (target_business_id, 'personal.approve', 'Aprobar personal', 'Permite aprobar cambios administrativos del personal.', 'personal', true),
    (target_business_id, 'personal.export', 'Exportar personal', 'Permite exportar datos del personal.', 'personal', true),
    (target_business_id, 'settings.read', 'Ver configuracion', 'Permite ver configuracion.', 'settings', true),
    (target_business_id, 'settings.create', 'Crear configuracion', 'Permite crear registros de configuracion.', 'settings', true),
    (target_business_id, 'settings.update', 'Editar configuracion', 'Permite editar configuracion.', 'settings', true),
    (target_business_id, 'settings.delete', 'Eliminar configuracion', 'Permite eliminar registros de configuracion.', 'settings', true),
    (target_business_id, 'settings.approve', 'Aprobar configuracion', 'Permite aprobar cambios de configuracion.', 'settings', true),
    (target_business_id, 'settings.export', 'Exportar configuracion', 'Permite exportar parametros y configuracion.', 'settings', true)
  on conflict (business_id, code) do update
    set name = excluded.name,
        description = excluded.description,
        module_name = excluded.module_name,
        is_system = excluded.is_system,
        archived_at = null,
        updated_at = now();
end;
$$;

do $$
declare
  business_record record;
begin
  for business_record in select id from public.businesses loop
    perform public.seed_admin_matrix_permissions_for_business(business_record.id);
  end loop;
end;
$$;

comment on function public.seed_admin_matrix_permissions_for_business(uuid) is
'Crea el catalogo base de permisos administrativos por modulo y accion para cada empresa.';

notify pgrst, 'reload schema';
