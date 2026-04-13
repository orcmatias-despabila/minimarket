import type {
  InventoryMovement,
  Product,
  ProductKind,
  UnitMeasure,
} from '../../../types/domain'

export interface ProductFormValues {
  barcode: string
  name: string
  brand: string
  formatContent: string
  category: string
  type: ProductKind
  costPrice: string
  salePrice: string
  currentStock: string
  minStock: string
  unitMeasure: UnitMeasure
  supplier: string
  notes: string
}

export interface ProductsState {
  items: Product[]
}

export type ProductsAction =
  | { type: 'hydrate'; payload: Product[] }
  | { type: 'create'; payload: Product }
  | { type: 'update'; payload: Product }
  | { type: 'remove'; payload: { productId: string } }
  | { type: 'apply_inventory_movement'; payload: InventoryMovement }

export const emptyProductForm = (): ProductFormValues => ({
  barcode: '',
  name: '',
  brand: '',
  formatContent: '',
  category: '',
  type: 'barcode',
  costPrice: '',
  salePrice: '',
  currentStock: '',
  minStock: '',
  unitMeasure: 'unit',
  supplier: '',
  notes: '',
})

export const toProductFormValues = (product: Product): ProductFormValues => ({
  barcode: product.barcode ?? '',
  name: product.name,
  brand: product.brand ?? '',
  formatContent: product.formatContent ?? '',
  category: product.category,
  type: product.type,
  costPrice: String(product.costPrice),
  salePrice: String(product.salePrice),
  currentStock: String(product.currentStock),
  minStock: String(product.minStock),
  unitMeasure: product.unitMeasure,
  supplier: product.supplier ?? '',
  notes: product.notes ?? '',
})

export const productsReducer = (
  state: ProductsState,
  action: ProductsAction,
): ProductsState => {
  switch (action.type) {
    case 'hydrate':
      return {
        ...state,
        items: action.payload,
      }

    case 'create':
      return {
        ...state,
        items: [action.payload, ...state.items],
      }

    case 'update':
      return {
        ...state,
        items: state.items.map((product) =>
          product.id === action.payload.id ? action.payload : product,
        ),
      }

    case 'remove':
      return {
        ...state,
        items: state.items.filter(
          (product) => product.id !== action.payload.productId,
        ),
      }

    case 'apply_inventory_movement':
      return {
        ...state,
        items: state.items.map((product) =>
          product.id === action.payload.productId
            ? {
                ...product,
                currentStock: Math.max(
                  product.currentStock + action.payload.quantity,
                  0,
                ),
                costPrice:
                  typeof action.payload.associatedCost === 'number'
                    ? action.payload.associatedCost
                    : product.costPrice,
              }
            : product,
        ),
      }

    default:
      return state
  }
}
