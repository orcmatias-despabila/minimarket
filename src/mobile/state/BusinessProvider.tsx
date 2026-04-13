import type { PropsWithChildren } from 'react'
import { createContext, useCallback, useContext, useEffect, useReducer, useState } from 'react'
import { inventoryReducer } from '../../modules/inventory/state/inventoryReducer'
import { productsReducer } from '../../modules/products/state/productsReducer'
import { initialWeightedControls } from '../../modules/reports/data/initialWeightedControls'
import { weightedControlReducer } from '../../modules/reports/state/weightedControlReducer'
import { cashReducer } from '../../modules/cash/state/cashReducer'
import { salesReducer } from '../../modules/sales/state/salesReducer'
import { inventoryService } from '../services/inventory.service'
import { productService } from '../services/product.service'
import { salesService } from '../services/sales.service'
import { useWorkspace } from './WorkspaceProvider'

export interface ProductIngressRequest {
  barcode?: string
  productId?: string
}

interface BusinessContextValue {
  productsState: ReturnType<typeof useProductsState>
  inventoryState: ReturnType<typeof useInventoryState>
  salesState: ReturnType<typeof useSalesState>
  cashState: ReturnType<typeof useCashState>
  reportsState: ReturnType<typeof useReportsState>
  isHydrating: boolean
  syncError: string | null
  refreshBusinessData: () => Promise<void>
  productIngressRequest: ProductIngressRequest | null
  setProductIngressRequest: (value: ProductIngressRequest | null) => void
}

const BusinessContext = createContext<BusinessContextValue | null>(null)

const useProductsState = () =>
  useReducer(productsReducer, {
    items: [],
  })

const useInventoryState = () =>
  useReducer(inventoryReducer, {
    movements: [],
  })

const useSalesState = () =>
  useReducer(salesReducer, {
    items: [],
  })

const useCashState = () =>
  useReducer(cashReducer, {
    sessions: [],
  })

const useReportsState = () =>
  useReducer(weightedControlReducer, {
    items: initialWeightedControls,
  })

export function BusinessProvider({ children }: PropsWithChildren) {
  const { business } = useWorkspace()
  const productsState = useProductsState()
  const inventoryState = useInventoryState()
  const salesState = useSalesState()
  const cashState = useCashState()
  const reportsState = useReportsState()
  const [isHydrating, setIsHydrating] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [productIngressRequest, setProductIngressRequest] =
    useState<ProductIngressRequest | null>(null)

  const [productsSnapshot, productsDispatch] = productsState
  const [inventorySnapshot, inventoryDispatch] = inventoryState
  const [salesSnapshot, salesDispatch] = salesState

  const refreshBusinessData = useCallback(async () => {
    if (!business?.id) {
      productsDispatch({ type: 'hydrate', payload: [] })
      inventoryDispatch({ type: 'hydrate', payload: [] })
      salesDispatch({ type: 'hydrate', payload: [] })
      setSyncError(null)
      return
    }

    setIsHydrating(true)
    setSyncError(null)

    try {
      const [products, inventoryMovements, sales] = await Promise.all([
        productService.listByBusiness(business.id),
        inventoryService.listByBusiness(business.id),
        salesService.listByBusiness(business.id),
      ])

      productsDispatch({ type: 'hydrate', payload: products })
      inventoryDispatch({ type: 'hydrate', payload: inventoryMovements })
      salesDispatch({ type: 'hydrate', payload: sales })
    } catch (error) {
      setSyncError(
        error instanceof Error
          ? error.message
          : 'No pudimos sincronizar los datos del negocio.',
      )
    } finally {
      setIsHydrating(false)
    }
  }, [business?.id, inventoryDispatch, productsDispatch, salesDispatch])

  useEffect(() => {
    void refreshBusinessData()
  }, [refreshBusinessData])

  return (
    <BusinessContext.Provider
      value={{
        productsState: [productsSnapshot, productsDispatch],
        inventoryState: [inventorySnapshot, inventoryDispatch],
        salesState: [salesSnapshot, salesDispatch],
        cashState,
        reportsState,
        isHydrating,
        syncError,
        refreshBusinessData,
        productIngressRequest,
        setProductIngressRequest,
      }}
    >
      {children}
    </BusinessContext.Provider>
  )
}

export const useBusiness = () => {
  const context = useContext(BusinessContext)
  if (!context) {
    throw new Error('useBusiness must be used inside BusinessProvider')
  }
  return context
}
