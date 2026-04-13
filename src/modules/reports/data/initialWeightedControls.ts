import type { WeightedDailyControl } from '../../../types/domain'

export const initialWeightedControls: WeightedDailyControl[] = [
  {
    id: 'wc-1',
    productId: 'prod-2',
    productName: 'Pan Batido',
    controlDate: '2026-04-05',
    enteredQuantity: 18,
    soldQuantity: 13.5,
    leftoverQuantity: 3,
    wasteQuantity: 1.5,
    costPrice: 1100,
    salePrice: 2100,
    notes: 'Control diario de panaderia.',
  },
]
