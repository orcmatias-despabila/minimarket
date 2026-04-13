export const currency = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})

export const numberFormatter = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export const formatCurrency = (value: number) => currency.format(value)

const unitLabels = {
  unit: 'un',
  kg: 'kg',
  g: 'g',
  l: 'l',
} as const

export const formatQuantity = (
  value: number,
  unitMeasure: 'unit' | 'kg' | 'g' | 'l',
) => `${numberFormatter.format(value)} ${unitLabels[unitMeasure]}`

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
