const OPEN_FOOD_FACTS_BASE_URL = 'https://world.openfoodfacts.net/api/v2/product'
const OPEN_FOOD_FACTS_TIMEOUT_MS = 8000

interface OpenFoodFactsApiResponse {
  status?: number
  product?: {
    code?: string | null
    product_name?: string | null
    brands?: string | null
    quantity?: string | null
    categories?: string | null
    image_front_url?: string | null
    image_url?: string | null
  } | null
}

export interface GlobalProductLookupResult {
  barcode: string
  name: string
  brand: string
  quantity: string
  categories: string
  imageUrl: string
}

const normalizeText = (value: string | null | undefined) => value?.trim() ?? ''

export const normalizeOpenFoodFactsProduct = (
  barcode: string,
  product?: OpenFoodFactsApiResponse['product'],
): GlobalProductLookupResult => ({
  barcode: normalizeText(product?.code) || barcode.trim(),
  name: normalizeText(product?.product_name),
  brand: normalizeText(product?.brands)
    .split(',')
    .map((item) => item.trim())
    .find(Boolean) ?? '',
  quantity: normalizeText(product?.quantity),
  categories: normalizeText(product?.categories),
  imageUrl:
    normalizeText(product?.image_front_url) || normalizeText(product?.image_url),
})

const buildTimeoutSignal = (timeoutMs: number) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId),
  }
}

export async function lookupGlobalProductByBarcode(
  barcode: string,
): Promise<GlobalProductLookupResult | null> {
  const normalizedBarcode = barcode.trim()
  if (!normalizedBarcode) {
    return null
  }

  const { signal, clear } = buildTimeoutSignal(OPEN_FOOD_FACTS_TIMEOUT_MS)

  try {
    const response = await fetch(
      `${OPEN_FOOD_FACTS_BASE_URL}/${encodeURIComponent(normalizedBarcode)}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Vendeapp/1.0 (barcode-autocomplete)',
        },
        signal,
      },
    )

    if (!response.ok) {
      throw new Error('No pudimos consultar Open Food Facts en este momento.')
    }

    const payload = (await response.json()) as OpenFoodFactsApiResponse
    if (payload.status !== 1 || !payload.product) {
      return null
    }

    return normalizeOpenFoodFactsProduct(normalizedBarcode, payload.product)
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('La consulta a Open Food Facts demoro demasiado.')
    }

    if (error instanceof Error) {
      throw new Error(error.message || 'No pudimos consultar Open Food Facts.')
    }

    throw new Error('No pudimos consultar Open Food Facts.')
  } finally {
    clear()
  }
}
