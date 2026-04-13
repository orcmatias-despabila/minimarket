import type { Sale, SaleItem } from '../../types/domain'
import { supabaseClient } from '../../../lib/supabase'
import type { SaleItemRecord, SaleRecord } from '../types/supabase'

const salesTableName =
  process.env.EXPO_PUBLIC_SUPABASE_SALES_TABLE ?? 'sales'
const saleItemsTableName =
  process.env.EXPO_PUBLIC_SUPABASE_SALE_ITEMS_TABLE ?? 'sale_items'

export interface PersistSaleInput {
  sale: Sale
  businessId?: string | null
  actorUserId?: string | null
}

export interface PersistSaleResult {
  sale: Sale
  source: 'supabase' | 'local'
}

const toSaleItem = (record: SaleItemRecord): SaleItem => ({
  id: record.id,
  tenantId: record.business_id ?? undefined,
  saleId: record.sale_id,
  productId: record.product_id,
  productName: record.product_name,
  unitMeasure: record.unit_measure,
  quantity: Number(record.quantity ?? 0),
  unitPrice: Number(record.unit_price ?? 0),
  costPrice: Number(record.purchase_price ?? record.cost_price ?? 0),
  subtotal: Number(record.subtotal ?? 0),
})

const toSale = (record: SaleRecord): Sale => ({
  id: record.id,
  tenantId: record.business_id ?? undefined,
  createdByUserId: record.sold_by_profile_id ?? undefined,
  documentNumber:
    record.document_number ??
    (record.sale_number ? `V-${String(record.sale_number).padStart(6, '0')}` : undefined),
  status: record.status,
  paymentMethod: record.payment_method,
  subtotal: Number(record.subtotal ?? 0),
  discountTotal: Number(record.discount_total ?? 0),
  taxTotal: Number(record.tax_total ?? 0),
  grandTotal: Number(record.total ?? 0),
  receivedAmount: Number(record.received_amount ?? 0),
  changeAmount: Number(record.change_amount ?? 0),
  createdAt: record.sold_at ?? record.created_at,
  items: (record.sale_items ?? []).map((item) => toSaleItem(item)),
})

const toSaleRecord = (sale: Sale, businessId?: string | null, actorUserId?: string | null) => ({
  id: sale.id,
  business_id: businessId || sale.tenantId || null,
  sold_by_profile_id: actorUserId ?? sale.createdByUserId ?? null,
  document_number: sale.documentNumber ?? null,
  status: sale.status,
  payment_method: sale.paymentMethod,
  subtotal: sale.subtotal,
  discount_total: sale.discountTotal,
  tax_total: sale.taxTotal,
  total: sale.grandTotal,
  received_amount: sale.receivedAmount,
  change_amount: sale.changeAmount,
  sold_at: sale.createdAt,
  created_at: sale.createdAt,
})

const toSaleItemRecord = (item: SaleItem, businessId?: string | null) => ({
  id: item.id,
  business_id: businessId || item.tenantId || null,
  sale_id: item.saleId,
  product_id: item.productId,
  product_name: item.productName,
  unit_measure: item.unitMeasure,
  quantity: item.quantity,
  unit_price: item.unitPrice,
  purchase_price: item.costPrice,
  discount_total: 0,
  subtotal: item.subtotal,
})

export const salesService = {
  async listByBusiness(businessId?: string | null): Promise<Sale[]> {
    if (!supabaseClient || !businessId) {
      return []
    }

    const result = await supabaseClient
      .from(salesTableName)
      .select(
        'id, business_id, sold_by_profile_id, sale_number, document_number, status, payment_method, subtotal, discount_total, tax_total, total, received_amount, change_amount, sold_at, created_at, sale_items ( id, business_id, sale_id, product_id, product_name, unit_measure, quantity, unit_price, purchase_price, discount_total, subtotal )',
      )
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (result.error) {
      throw new Error(`No pudimos cargar ventas: ${result.error.message}`)
    }

    return (result.data ?? []).map((item) => toSale(item as SaleRecord))
  },

  async recordSale(input: PersistSaleInput): Promise<PersistSaleResult> {
    const sale: Sale = {
      ...input.sale,
      tenantId: input.businessId ?? input.sale.tenantId,
      createdByUserId: input.actorUserId ?? input.sale.createdByUserId,
      items: input.sale.items.map((item) => ({
        ...item,
        tenantId: input.businessId ?? item.tenantId,
      })),
    }

    if (!supabaseClient) {
      return { sale, source: 'local' }
    }

    const saleInsert = await supabaseClient
      .from(salesTableName)
      .insert(toSaleRecord(sale, input.businessId, input.actorUserId))
      .select(
        'id, business_id, sold_by_profile_id, sale_number, document_number, status, payment_method, subtotal, discount_total, tax_total, total, received_amount, change_amount, sold_at, created_at',
      )
      .single<SaleRecord>()

    if (saleInsert.error) {
      throw new Error(`No pudimos guardar la venta en Supabase: ${saleInsert.error.message}`)
    }

    if (sale.items.length) {
      const itemsInsert = await supabaseClient
        .from(saleItemsTableName)
        .insert(sale.items.map((item) => toSaleItemRecord(item, input.businessId)))

      if (itemsInsert.error) {
        throw new Error(
          `La venta se guardo, pero no pudimos guardar el detalle: ${itemsInsert.error.message}`,
        )
      }
    }

    return {
      sale: {
        ...sale,
        ...toSale(saleInsert.data),
      },
      source: 'supabase',
    }
  },
}
