import type { Product, Sale, SaleItem } from '../../../types/domain'
import { createId } from '../../../lib/ids'

export interface PosCartItem {
  productId: string
  name: string
  productType: Product['type']
  unitMeasure: Product['unitMeasure']
  quantity: number
  unitPrice: number
  costPrice: number
  barcode?: string
  stockAvailable: number
}

export const buildSaleItem = (
  saleId: string,
  item: PosCartItem,
  businessId?: string,
): SaleItem => ({
  id: createId('sale-item'),
  tenantId: businessId,
  saleId,
  productId: item.productId,
  productName: item.name,
  unitMeasure: item.unitMeasure,
  quantity: item.quantity,
  unitPrice: item.unitPrice,
  costPrice: item.costPrice,
  subtotal: item.quantity * item.unitPrice,
})

export const getCartSubtotal = (items: PosCartItem[]) =>
  items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

export const buildSale = ({
  items,
  paymentMethod,
  receivedAmount,
  businessId,
  createdByUserId,
}: {
  items: PosCartItem[]
  paymentMethod: Sale['paymentMethod']
  receivedAmount: number
  businessId?: string
  createdByUserId?: string
}): Sale => {
  const saleId = createId('sale')
  const subtotal = getCartSubtotal(items)
  const saleItems = items.map((item) => buildSaleItem(saleId, item, businessId))

  return {
    id: saleId,
    tenantId: businessId,
    createdByUserId,
    documentNumber: `V-${saleId.slice(0, 8).toUpperCase()}`,
    status: 'paid',
    paymentMethod,
    subtotal,
    discountTotal: 0,
    taxTotal: 0,
    grandTotal: subtotal,
    receivedAmount,
    changeAmount: paymentMethod === 'cash' ? Math.max(receivedAmount - subtotal, 0) : 0,
    createdAt: new Date().toISOString(),
    items: saleItems,
  }
}
