import type { Product } from '../../types/domain'
import {
  lookupGlobalProductByBarcode as lookupOpenFoodFactsProductByBarcode,
  type GlobalProductLookupResult,
} from '../../services/openFoodFacts'
import { productsTableName, supabaseClient } from './supabaseClient'

interface ProductRecord {
  id: string
  business_id: string | null
  barcode: string | null
  name: string
  brand: string | null
  quantity_label: string | null
  category: string
  unit_measure: Product['unitMeasure'] | null
  image_url: string | null
  purchase_price: number | null
  sale_price: number
  stock: number
  min_stock: number | null
  provider: string | null
  allow_decimal: boolean | null
  notes: string | null
}

export type ResolvedBarcodeProduct = Product | GlobalProductLookupResult

export interface ResolvedBarcodeLookupResult {
  source: 'local' | 'global' | 'none'
  product: ResolvedBarcodeProduct | null
}

const mapLocalRecordToProduct = (record: ProductRecord): Product => ({
  id: record.id,
  tenantId: record.business_id ?? undefined,
  barcode: record.barcode ?? undefined,
  name: record.name,
  brand: record.brand ?? undefined,
  formatContent: record.quantity_label ?? undefined,
  imageUrl: record.image_url ?? undefined,
  category: record.category,
  type: record.allow_decimal ? 'manual_weight' : 'barcode',
  unitMeasure: record.unit_measure ?? 'unit',
  costPrice: Number(record.purchase_price ?? 0),
  salePrice: Number(record.sale_price ?? 0),
  currentStock: Number(record.stock ?? 0),
  minStock: Number(record.min_stock ?? 0),
  supplier: record.provider ?? undefined,
  notes: record.notes ?? undefined,
})

const findLocalMemoryProductByBarcode = (items: Product[], barcode: string) =>
  items.find((item) => item.barcode?.trim() === barcode.trim()) ?? null

export async function lookupLocalProductByBarcode(
  barcode: string,
  localItems: Product[] = [],
  businessId?: string | null,
): Promise<Product | null> {
  const normalizedBarcode = barcode.trim()
  if (!normalizedBarcode) {
    return null
  }

  if (supabaseClient) {
    const client = supabaseClient
    const runLookup = async (useBusinessFilter: boolean) => {
      let query = client
        .from(productsTableName)
        .select(
          'id, business_id, barcode, name, brand, quantity_label, category, unit_measure, image_url, purchase_price, sale_price, stock, min_stock, provider, allow_decimal, notes',
        )
        .eq('barcode', normalizedBarcode)

      if (useBusinessFilter && businessId) {
        query = query.eq('business_id', businessId)
      }

      return query.maybeSingle<ProductRecord>()
    }

    const primaryResult = await runLookup(Boolean(businessId))
    if (!primaryResult.error && primaryResult.data) {
      return mapLocalRecordToProduct(primaryResult.data)
    }

    if (
      primaryResult.error &&
      businessId &&
      (primaryResult.error.message.includes('business_id') ||
        primaryResult.error.message.includes('column'))
    ) {
      const fallbackResult = await runLookup(false)
      if (fallbackResult.error) {
        throw new Error(`No pudimos consultar Supabase: ${fallbackResult.error.message}`)
      }

      if (fallbackResult.data) {
        return mapLocalRecordToProduct(fallbackResult.data)
      }
    } else if (primaryResult.error) {
      throw new Error(`No pudimos consultar Supabase: ${primaryResult.error.message}`)
    }
  }

  const localProduct = findLocalMemoryProductByBarcode(localItems, normalizedBarcode)
  if (!localProduct) {
    return null
  }

  if (businessId && localProduct.tenantId && localProduct.tenantId !== businessId) {
    return null
  }

  return localProduct
}

export async function lookupGlobalProductByBarcode(
  barcode: string,
): Promise<GlobalProductLookupResult | null> {
  return lookupOpenFoodFactsProductByBarcode(barcode)
}

export async function resolveProductByBarcode(
  barcode: string,
  localItems: Product[] = [],
  businessId?: string | null,
): Promise<ResolvedBarcodeLookupResult> {
  const localProduct = await lookupLocalProductByBarcode(barcode, localItems, businessId)
  if (localProduct) {
    return {
      source: 'local',
      product: localProduct,
    }
  }

  const globalProduct = await lookupGlobalProductByBarcode(barcode)
  if (globalProduct) {
    return {
      source: 'global',
      product: globalProduct,
    }
  }

  return {
    source: 'none',
    product: null,
  }
}
