import { createId } from '../../lib/ids'
import type { Product } from '../../types/domain'
import type { GlobalProductLookupResult } from '../../services/openFoodFacts'
import { supabaseClient } from '../../../lib/supabase'
import type { ProductRecord } from '../types/supabase'
import { resolveProductByBarcode } from './productBarcodeResolver'

const productsTableName =
  process.env.EXPO_PUBLIC_SUPABASE_PRODUCTS_TABLE ?? 'products'

export interface ProductLookupResult {
  product: Product | null
  draft: GlobalProductLookupResult | null
  source: 'local' | 'global' | 'none'
}

export interface SaveProductInput {
  existingProductId?: string | null
  businessId?: string | null
  barcode: string
  name: string
  brand: string
  formatContent: string
  imageUrl?: string
  category: string
  costPrice: number
  salePrice: number
  stock: number
  minStock: number
  type: Product['type']
  unitMeasure: Product['unitMeasure']
  supplier?: string
  notes?: string
}

export interface SaveProductResult {
  product: Product
  source: 'supabase' | 'local'
}

const selectFields =
  'id, business_id, barcode, name, brand, quantity_label, category, unit_measure, image_url, purchase_price, sale_price, stock, min_stock, provider, notes, allow_decimal'

const toProduct = (record: ProductRecord): Product => ({
  id: record.id,
  tenantId: record.business_id ?? undefined,
  barcode: record.barcode ?? undefined,
  name: record.name,
  brand: record.brand ?? undefined,
  formatContent: record.quantity_label ?? undefined,
  imageUrl: record.image_url ?? undefined,
  category: record.category ?? '',
  type: record.allow_decimal ? 'manual_weight' : 'barcode',
  unitMeasure: record.unit_measure ?? 'unit',
  costPrice: Number(record.purchase_price ?? 0),
  salePrice: Number(record.sale_price ?? 0),
  currentStock: Number(record.stock ?? 0),
  minStock: Number(record.min_stock ?? 0),
  supplier: record.provider ?? undefined,
  notes: record.notes ?? undefined,
})

const toRecord = (input: SaveProductInput) => ({
  business_id: input.businessId || null,
  barcode: input.barcode || null,
  name: input.name,
  brand: input.brand || null,
  quantity_label: input.formatContent || null,
  category: input.category,
  unit_measure: input.unitMeasure,
  image_url: input.imageUrl || null,
  purchase_price: input.costPrice,
  sale_price: input.salePrice,
  stock: input.stock,
  min_stock: input.minStock,
  provider: input.supplier || null,
  notes: input.notes || null,
  allow_decimal: input.type === 'manual_weight',
})

const toLocalProduct = (input: SaveProductInput): Product => ({
  id: input.existingProductId ?? createId('product'),
  tenantId: input.businessId ?? undefined,
  barcode: input.barcode,
  name: input.name,
  brand: input.brand || undefined,
  formatContent: input.formatContent || undefined,
  imageUrl: input.imageUrl || undefined,
  category: input.category,
  type: input.type,
  unitMeasure: input.unitMeasure,
  costPrice: input.costPrice,
  salePrice: input.salePrice,
  currentStock: input.stock,
  minStock: input.minStock,
  supplier: input.supplier || undefined,
  notes: input.notes || undefined,
})

export const productService = {
  async listByBusiness(businessId?: string | null): Promise<Product[]> {
    if (!supabaseClient || !businessId) {
      return []
    }

    const result = await supabaseClient
      .from(productsTableName)
      .select(selectFields)
      .eq('business_id', businessId)
      .order('name', { ascending: true })

    if (result.error) {
      throw new Error(`No pudimos cargar productos: ${result.error.message}`)
    }

    return (result.data ?? []).map((item) => toProduct(item as ProductRecord))
  },

  async findByBarcode(
    barcode: string,
    localItems: Product[],
    businessId?: string | null,
  ): Promise<ProductLookupResult> {
    const normalized = barcode.trim()
    if (!normalized) {
      return { product: null, draft: null, source: 'none' }
    }

    const result = await resolveProductByBarcode(normalized, localItems, businessId)
    if (result.source === 'local') {
      return { product: result.product as Product, draft: null, source: 'local' }
    }

    if (result.source === 'global') {
      return {
        product: null,
        draft: result.product as GlobalProductLookupResult,
        source: 'global',
      }
    }

    return { product: null, draft: null, source: 'none' }
  },

  async saveProduct(input: SaveProductInput): Promise<SaveProductResult> {
    if (supabaseClient) {
      const payload = toRecord(input)
      const query = input.existingProductId
        ? supabaseClient.from(productsTableName).update(payload).eq('id', input.existingProductId)
        : supabaseClient.from(productsTableName).insert(payload)

      const result = await query.select(selectFields).single<ProductRecord>()

      if (result.error) {
        throw new Error(`No pudimos guardar producto: ${result.error.message}`)
      }

      return {
        product: toProduct(result.data),
        source: 'supabase',
      }
    }

    return {
      product: toLocalProduct(input),
      source: 'local',
    }
  },
}
