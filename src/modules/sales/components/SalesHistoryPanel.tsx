import { useMemo, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Field } from '../../../components/ui/Field'
import { SelectField } from '../../../components/ui/SelectField'
import { formatCurrency, formatDateTime, formatQuantity } from '../../../lib/format'
import type { Sale } from '../../../types/domain'

interface SalesHistoryPanelProps {
  sales: Sale[]
}

const paymentLabels: Record<Sale['paymentMethod'], string> = {
  cash: 'Efectivo',
  debit: 'Debito',
  credit: 'Credito',
  transfer: 'Transferencia',
}

export function SalesHistoryPanel({ sales }: SalesHistoryPanelProps) {
  const [search, setSearch] = useState('')
  const [dayFilter, setDayFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(
    sales[0]?.id ?? null,
  )

  const filteredSales = useMemo(() => {
    const term = search.trim().toLowerCase()

    return sales.filter((sale) => {
      const saleDate = new Date(sale.createdAt)
      const saleDay = sale.createdAt.slice(0, 10)
      const saleMonth = sale.createdAt.slice(0, 7)
      const matchesDay = dayFilter ? saleDay === dayFilter : true
      const matchesMonth = monthFilter ? saleMonth === monthFilter : true
      const matchesSearch = term
        ? sale.documentNumber?.toLowerCase().includes(term) ||
          sale.items.some((item) =>
            item.productName.toLowerCase().includes(term),
          )
        : true

      return matchesDay && matchesMonth && matchesSearch && !Number.isNaN(saleDate.valueOf())
    })
  }, [dayFilter, monthFilter, sales, search])

  const selectedSale =
    filteredSales.find((sale) => sale.id === selectedSaleId) ?? filteredSales[0] ?? null

  return (
    <section className="surface-card sales-history">
      <div className="inventory-section__header">
        <div>
          <p className="section-kicker">Historial</p>
          <h3>Ventas realizadas</h3>
          <p>
            Filtra por dia o mes, busca por producto o numero de venta y abre el
            detalle completo de cada transaccion.
          </p>
        </div>
      </div>

      <div className="sales-history__filters">
        <Field
          label="Buscar por producto o numero"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Ej: pan, bebida o V-1234"
        />
        <Field
          label="Filtrar por dia"
          type="date"
          value={dayFilter}
          onChange={(event) => setDayFilter(event.target.value)}
        />
        <Field
          label="Filtrar por mes"
          type="month"
          value={monthFilter}
          onChange={(event) => setMonthFilter(event.target.value)}
        />
        <SelectField
          label="Accion rapida"
          value=""
          onChange={(event) => {
            if (event.target.value === 'clear') {
              setSearch('')
              setDayFilter('')
              setMonthFilter('')
            }
          }}
          options={[
            { label: 'Selecciona', value: '' },
            { label: 'Limpiar filtros', value: 'clear' },
          ]}
        />
      </div>

      <div className="sales-history__layout">
        <div className="sales-history__list">
          {filteredSales.length ? (
            filteredSales.map((sale) => (
              <article key={sale.id} className="sales-history__item">
                <div>
                  <strong>{sale.documentNumber}</strong>
                  <p>
                    {formatDateTime(sale.createdAt)} - {paymentLabels[sale.paymentMethod]}
                  </p>
                </div>
                <div className="sales-history__item-side">
                  <strong>{formatCurrency(sale.grandTotal)}</strong>
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedSaleId(sale.id)}
                  >
                    Ver detalle
                  </Button>
                </div>
              </article>
            ))
          ) : (
            <article className="products-empty">
              <strong>No hay ventas para esos filtros.</strong>
              <p>Ajusta la fecha o prueba con otra busqueda.</p>
            </article>
          )}
        </div>

        <section className="sales-detail">
          {selectedSale ? (
            <>
              <div className="inventory-section__header">
                <div>
                  <p className="section-kicker">Detalle completo</p>
                  <h3>{selectedSale.documentNumber}</h3>
                  <p>
                    {formatDateTime(selectedSale.createdAt)} -{' '}
                    {paymentLabels[selectedSale.paymentMethod]}
                  </p>
                </div>
              </div>

              <div className="sales-detail__summary">
                <div>
                  <span>Total vendido</span>
                  <strong>{formatCurrency(selectedSale.grandTotal)}</strong>
                </div>
                <div>
                  <span>Metodo de pago</span>
                  <strong>{paymentLabels[selectedSale.paymentMethod]}</strong>
                </div>
                <div>
                  <span>Productos vendidos</span>
                  <strong>{selectedSale.items.length}</strong>
                </div>
              </div>

              <div className="sales-detail__items">
                {selectedSale.items.map((item) => (
                  <article key={item.id} className="sales-detail__item">
                    <div>
                      <strong>{item.productName}</strong>
                      <p>
                        {formatQuantity(item.quantity, item.unitMeasure)} x{' '}
                        {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <strong>{formatCurrency(item.subtotal)}</strong>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <article className="products-empty">
              <strong>Selecciona una venta.</strong>
              <p>El detalle completo aparecera aqui.</p>
            </article>
          )}
        </section>
      </div>
    </section>
  )
}
