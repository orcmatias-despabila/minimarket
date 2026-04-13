-- Development seed only.
-- Expected usage:
--   1. Run all migrations first.
--   2. Execute this file only in local/dev environments.
--   3. It targets the first business found in public.businesses.
--
-- Data inserted:
--   - 3 customers
--   - 3 suppliers
--   - 6 business documents
--   - document references for emitted/received credit notes
--   - detail lines for the sample documents

do $$
declare
  v_business_id uuid;
  v_actor_user_id uuid;

  v_customer_1_id uuid;
  v_customer_2_id uuid;
  v_customer_3_id uuid;

  v_supplier_1_id uuid;
  v_supplier_2_id uuid;
  v_supplier_3_id uuid;

  v_doc_emit_invoice_id uuid;
  v_doc_emit_receipt_id uuid;
  v_doc_emit_credit_note_id uuid;
  v_doc_recv_invoice_id uuid;
  v_doc_recv_receipt_id uuid;
  v_doc_recv_credit_note_id uuid;
begin
  select b.id, b.owner_user_id
    into v_business_id, v_actor_user_id
  from public.businesses b
  order by b.created_at
  limit 1;

  if v_business_id is null then
    raise notice 'Seed skipped: no businesses found in public.businesses.';
    return;
  end if;

  insert into public.customers (
    business_id,
    tax_id,
    legal_name,
    business_line,
    address_line_1,
    district,
    city,
    phone,
    email,
    notes,
    status,
    created_by_user_id,
    updated_by_user_id
  )
  values
    (
      v_business_id,
      'FICT-CLI-001',
      'Comercial Los Aromos SpA',
      'Oficina y suministros',
      'Av. Siempreviva 101',
      'Santiago Centro',
      'Santiago',
      '+56 9 1111 1111',
      'compras@aromos.test',
      'Cliente demo para factura emitida.',
      'active',
      v_actor_user_id,
      v_actor_user_id
    ),
    (
      v_business_id,
      'FICT-CLI-002',
      'Vecina Maria Perez',
      'Consumo final',
      'Pasaje Prueba 22',
      'San Miguel',
      'Santiago',
      '+56 9 2222 2222',
      'maria.perez@test.local',
      'Cliente demo para boleta.',
      'active',
      v_actor_user_id,
      v_actor_user_id
    ),
    (
      v_business_id,
      'FICT-CLI-003',
      'Servicios Andinos Ltda.',
      'Mantencion industrial',
      'Camino Demo 450',
      'Maipu',
      'Santiago',
      '+56 9 3333 3333',
      'admin@andinos.test',
      'Cliente corporativo ficticio.',
      'active',
      v_actor_user_id,
      v_actor_user_id
    )
  on conflict (business_id, tax_id_normalized) do update
    set
      legal_name = excluded.legal_name,
      business_line = excluded.business_line,
      address_line_1 = excluded.address_line_1,
      district = excluded.district,
      city = excluded.city,
      phone = excluded.phone,
      email = excluded.email,
      notes = excluded.notes,
      status = excluded.status,
      updated_by_user_id = excluded.updated_by_user_id;

  insert into public.suppliers (
    business_id,
    tax_id,
    legal_name,
    business_line,
    address_line_1,
    district,
    city,
    phone,
    email,
    contact_name,
    notes,
    status,
    created_by_user_id,
    updated_by_user_id
  )
  values
    (
      v_business_id,
      'FICT-PROV-001',
      'Distribuidora Sur Demo Ltda.',
      'Abarrotes y bebidas',
      'Ruta 5 Sur 1234',
      'La Cisterna',
      'Santiago',
      '+56 2 2444 1111',
      'ventas@distsur.test',
      'Paula Rojas',
      'Proveedor demo para factura de compra.',
      'active',
      v_actor_user_id,
      v_actor_user_id
    ),
    (
      v_business_id,
      'FICT-PROV-002',
      'Panificadora Central Demo',
      'Panaderia',
      'Calle Harina 88',
      'Independencia',
      'Santiago',
      '+56 2 2555 2222',
      'pedidos@pancentral.test',
      'Ramon Vera',
      'Proveedor demo para boleta de compra.',
      'active',
      v_actor_user_id,
      v_actor_user_id
    ),
    (
      v_business_id,
      'FICT-PROV-003',
      'Envases y Packaging Spa',
      'Envases plasticos',
      'Av. Industria 990',
      'Quilicura',
      'Santiago',
      '+56 2 2666 3333',
      'contacto@packaging.test',
      'Ana Soto',
      'Proveedor demo adicional.',
      'active',
      v_actor_user_id,
      v_actor_user_id
    )
  on conflict (business_id, tax_id_normalized) do update
    set
      legal_name = excluded.legal_name,
      business_line = excluded.business_line,
      address_line_1 = excluded.address_line_1,
      district = excluded.district,
      city = excluded.city,
      phone = excluded.phone,
      email = excluded.email,
      contact_name = excluded.contact_name,
      notes = excluded.notes,
      status = excluded.status,
      updated_by_user_id = excluded.updated_by_user_id;

  select c.id into v_customer_1_id
  from public.customers c
  where c.business_id = v_business_id and c.tax_id = 'FICT-CLI-001';

  select c.id into v_customer_2_id
  from public.customers c
  where c.business_id = v_business_id and c.tax_id = 'FICT-CLI-002';

  select c.id into v_customer_3_id
  from public.customers c
  where c.business_id = v_business_id and c.tax_id = 'FICT-CLI-003';

  select s.id into v_supplier_1_id
  from public.suppliers s
  where s.business_id = v_business_id and s.tax_id = 'FICT-PROV-001';

  select s.id into v_supplier_2_id
  from public.suppliers s
  where s.business_id = v_business_id and s.tax_id = 'FICT-PROV-002';

  select s.id into v_supplier_3_id
  from public.suppliers s
  where s.business_id = v_business_id and s.tax_id = 'FICT-PROV-003';

  select d.id into v_doc_emit_invoice_id
  from public.business_documents d
  where d.business_id = v_business_id
    and d.direction = 'emitted'
    and d.document_type = 'factura'
    and d.folio = 'FEM-1001';

  if v_doc_emit_invoice_id is null then
    insert into public.business_documents (
      business_id,
      direction,
      document_type,
      sii_dte_code,
      folio,
      issue_date,
      due_date,
      customer_id,
      counterparty_rut,
      counterparty_name,
      currency_code,
      net_amount,
      tax_amount,
      exempt_amount,
      total_amount,
      payment_method,
      status,
      notes,
      source_origin,
      created_by_user_id,
      updated_by_user_id
    )
    values (
      v_business_id,
      'emitted',
      'factura',
      33,
      'FEM-1001',
      date '2026-04-01',
      date '2026-04-15',
      v_customer_1_id,
      'FICT-CLI-001',
      'Comercial Los Aromos SpA',
      'CLP',
      42000,
      7980,
      0,
      49980,
      'transfer',
      'recorded',
      'Factura emitida demo para pruebas administrativas.',
      'manual',
      v_actor_user_id,
      v_actor_user_id
    )
    returning id into v_doc_emit_invoice_id;
  end if;

  select d.id into v_doc_emit_receipt_id
  from public.business_documents d
  where d.business_id = v_business_id
    and d.direction = 'emitted'
    and d.document_type = 'boleta'
    and d.folio = 'BEM-2001';

  if v_doc_emit_receipt_id is null then
    insert into public.business_documents (
      business_id,
      direction,
      document_type,
      sii_dte_code,
      folio,
      issue_date,
      customer_id,
      counterparty_rut,
      counterparty_name,
      currency_code,
      net_amount,
      tax_amount,
      exempt_amount,
      total_amount,
      payment_method,
      status,
      notes,
      source_origin,
      created_by_user_id,
      updated_by_user_id
    )
    values (
      v_business_id,
      'emitted',
      'boleta',
      39,
      'BEM-2001',
      date '2026-04-02',
      v_customer_2_id,
      'FICT-CLI-002',
      'Vecina Maria Perez',
      'CLP',
      9800,
      1862,
      0,
      11662,
      'cash',
      'paid',
      'Boleta emitida demo.',
      'generated',
      v_actor_user_id,
      v_actor_user_id
    )
    returning id into v_doc_emit_receipt_id;
  end if;

  select d.id into v_doc_emit_credit_note_id
  from public.business_documents d
  where d.business_id = v_business_id
    and d.direction = 'emitted'
    and d.document_type = 'nota_credito'
    and d.folio = 'NCEM-3001';

  if v_doc_emit_credit_note_id is null then
    insert into public.business_documents (
      business_id,
      direction,
      document_type,
      sii_dte_code,
      folio,
      issue_date,
      customer_id,
      counterparty_rut,
      counterparty_name,
      currency_code,
      net_amount,
      tax_amount,
      exempt_amount,
      total_amount,
      payment_method,
      status,
      notes,
      source_origin,
      created_by_user_id,
      updated_by_user_id
    )
    values (
      v_business_id,
      'emitted',
      'nota_credito',
      61,
      'NCEM-3001',
      date '2026-04-04',
      v_customer_1_id,
      'FICT-CLI-001',
      'Comercial Los Aromos SpA',
      'CLP',
      5000,
      950,
      0,
      5950,
      null,
      'recorded',
      'Nota de credito emitida por devolucion parcial.',
      'manual',
      v_actor_user_id,
      v_actor_user_id
    )
    returning id into v_doc_emit_credit_note_id;
  end if;

  select d.id into v_doc_recv_invoice_id
  from public.business_documents d
  where d.business_id = v_business_id
    and d.direction = 'received'
    and d.document_type = 'factura_compra'
    and d.folio = 'FRC-4001';

  if v_doc_recv_invoice_id is null then
    insert into public.business_documents (
      business_id,
      direction,
      document_type,
      sii_dte_code,
      folio,
      issue_date,
      due_date,
      supplier_id,
      counterparty_rut,
      counterparty_name,
      currency_code,
      net_amount,
      tax_amount,
      exempt_amount,
      total_amount,
      payment_method,
      status,
      notes,
      source_origin,
      created_by_user_id,
      updated_by_user_id
    )
    values (
      v_business_id,
      'received',
      'factura_compra',
      null,
      'FRC-4001',
      date '2026-04-03',
      date '2026-04-20',
      v_supplier_1_id,
      'FICT-PROV-001',
      'Distribuidora Sur Demo Ltda.',
      'CLP',
      38000,
      7220,
      0,
      45220,
      'transfer',
      'recorded',
      'Factura de compra demo.',
      'imported',
      v_actor_user_id,
      v_actor_user_id
    )
    returning id into v_doc_recv_invoice_id;
  end if;

  select d.id into v_doc_recv_receipt_id
  from public.business_documents d
  where d.business_id = v_business_id
    and d.direction = 'received'
    and d.document_type = 'boleta_compra'
    and d.folio = 'BRC-5001';

  if v_doc_recv_receipt_id is null then
    insert into public.business_documents (
      business_id,
      direction,
      document_type,
      sii_dte_code,
      folio,
      issue_date,
      supplier_id,
      counterparty_rut,
      counterparty_name,
      currency_code,
      net_amount,
      tax_amount,
      exempt_amount,
      total_amount,
      payment_method,
      status,
      notes,
      source_origin,
      created_by_user_id,
      updated_by_user_id
    )
    values (
      v_business_id,
      'received',
      'boleta_compra',
      null,
      'BRC-5001',
      date '2026-04-05',
      v_supplier_2_id,
      'FICT-PROV-002',
      'Panificadora Central Demo',
      'CLP',
      6400,
      1216,
      0,
      7616,
      'cash',
      'paid',
      'Boleta de compra demo.',
      'manual',
      v_actor_user_id,
      v_actor_user_id
    )
    returning id into v_doc_recv_receipt_id;
  end if;

  select d.id into v_doc_recv_credit_note_id
  from public.business_documents d
  where d.business_id = v_business_id
    and d.direction = 'received'
    and d.document_type = 'nota_credito'
    and d.folio = 'NCRC-6001';

  if v_doc_recv_credit_note_id is null then
    insert into public.business_documents (
      business_id,
      direction,
      document_type,
      sii_dte_code,
      folio,
      issue_date,
      supplier_id,
      counterparty_rut,
      counterparty_name,
      currency_code,
      net_amount,
      tax_amount,
      exempt_amount,
      total_amount,
      payment_method,
      status,
      notes,
      source_origin,
      created_by_user_id,
      updated_by_user_id
    )
    values (
      v_business_id,
      'received',
      'nota_credito',
      null,
      'NCRC-6001',
      date '2026-04-06',
      v_supplier_1_id,
      'FICT-PROV-001',
      'Distribuidora Sur Demo Ltda.',
      'CLP',
      3000,
      570,
      0,
      3570,
      null,
      'recorded',
      'Nota de credito recibida por mercaderia faltante.',
      'imported',
      v_actor_user_id,
      v_actor_user_id
    )
    returning id into v_doc_recv_credit_note_id;
  end if;

  insert into public.business_document_references (
    document_id,
    referenced_document_id,
    referenced_document_type,
    referenced_folio,
    referenced_issue_date,
    reference_reason,
    reference_code
  )
  select
    v_doc_emit_credit_note_id,
    v_doc_emit_invoice_id,
    'factura',
    'FEM-1001',
    date '2026-04-01',
    'Devolucion parcial de productos',
    'DEV-PARCIAL'
  where not exists (
    select 1
    from public.business_document_references r
    where r.document_id = v_doc_emit_credit_note_id
      and r.referenced_folio = 'FEM-1001'
  );

  insert into public.business_document_references (
    document_id,
    referenced_document_id,
    referenced_document_type,
    referenced_folio,
    referenced_issue_date,
    reference_reason,
    reference_code
  )
  select
    v_doc_recv_credit_note_id,
    v_doc_recv_invoice_id,
    'factura_compra',
    'FRC-4001',
    date '2026-04-03',
    'Ajuste por mercaderia faltante',
    'AJUSTE-FALTANTE'
  where not exists (
    select 1
    from public.business_document_references r
    where r.document_id = v_doc_recv_credit_note_id
      and r.referenced_folio = 'FRC-4001'
  );

  insert into public.business_document_lines (
    document_id,
    line_number,
    product_id,
    sku,
    barcode,
    description,
    quantity,
    unit_price,
    discount_amount,
    tax_rate,
    line_net_amount,
    line_tax_amount,
    line_total_amount,
    unit_label
  )
  select
    v_doc_emit_invoice_id,
    1,
    null,
    'SKU-CAF-001',
    'FICTBAR001',
    'Cafe instantaneo 170g',
    6,
    3500,
    0,
    19,
    21000,
    3990,
    24990,
    'unidad'
  where not exists (
    select 1 from public.business_document_lines l
    where l.document_id = v_doc_emit_invoice_id and l.line_number = 1
  );

  insert into public.business_document_lines (
    document_id, line_number, product_id, sku, barcode, description, quantity, unit_price,
    discount_amount, tax_rate, line_net_amount, line_tax_amount, line_total_amount, unit_label
  )
  select
    v_doc_emit_invoice_id,
    2,
    null,
    'SKU-AZU-001',
    'FICTBAR002',
    'Azucar 1kg',
    4,
    5250,
    0,
    19,
    21000,
    3990,
    24990,
    'unidad'
  where not exists (
    select 1 from public.business_document_lines l
    where l.document_id = v_doc_emit_invoice_id and l.line_number = 2
  );

  insert into public.business_document_lines (
    document_id, line_number, description, quantity, unit_price, discount_amount,
    tax_rate, line_net_amount, line_tax_amount, line_total_amount, unit_label
  )
  select
    v_doc_emit_receipt_id,
    1,
    'Bebida cola 1.5L',
    2,
    4900,
    0,
    19,
    9800,
    1862,
    11662,
    'unidad'
  where not exists (
    select 1 from public.business_document_lines l
    where l.document_id = v_doc_emit_receipt_id and l.line_number = 1
  );

  insert into public.business_document_lines (
    document_id, line_number, description, quantity, unit_price, discount_amount,
    tax_rate, line_net_amount, line_tax_amount, line_total_amount, unit_label
  )
  select
    v_doc_emit_credit_note_id,
    1,
    'Devolucion Cafe instantaneo 170g',
    1,
    5000,
    0,
    19,
    5000,
    950,
    5950,
    'unidad'
  where not exists (
    select 1 from public.business_document_lines l
    where l.document_id = v_doc_emit_credit_note_id and l.line_number = 1
  );

  insert into public.business_document_lines (
    document_id, line_number, description, quantity, unit_price, discount_amount,
    tax_rate, line_net_amount, line_tax_amount, line_total_amount, unit_label
  )
  select
    v_doc_recv_invoice_id,
    1,
    'Pack agua mineral 6x1.5L',
    10,
    3800,
    0,
    19,
    38000,
    7220,
    45220,
    'pack'
  where not exists (
    select 1 from public.business_document_lines l
    where l.document_id = v_doc_recv_invoice_id and l.line_number = 1
  );

  insert into public.business_document_lines (
    document_id, line_number, description, quantity, unit_price, discount_amount,
    tax_rate, line_net_amount, line_tax_amount, line_total_amount, unit_label
  )
  select
    v_doc_recv_receipt_id,
    1,
    'Pan amasado bolsa',
    8,
    800,
    0,
    19,
    6400,
    1216,
    7616,
    'unidad'
  where not exists (
    select 1 from public.business_document_lines l
    where l.document_id = v_doc_recv_receipt_id and l.line_number = 1
  );

  insert into public.business_document_lines (
    document_id, line_number, description, quantity, unit_price, discount_amount,
    tax_rate, line_net_amount, line_tax_amount, line_total_amount, unit_label
  )
  select
    v_doc_recv_credit_note_id,
    1,
    'Ajuste por agua mineral faltante',
    1,
    3000,
    0,
    19,
    3000,
    570,
    3570,
    'pack'
  where not exists (
    select 1 from public.business_document_lines l
    where l.document_id = v_doc_recv_credit_note_id and l.line_number = 1
  );

  raise notice 'Development admin seed loaded for business %', v_business_id;
end
$$;
