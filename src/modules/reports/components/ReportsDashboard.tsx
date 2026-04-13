import { formatCurrency } from '../../../lib/format'

interface SalesByPayment {
  method: string
  total: number
}

interface TopProduct {
  productName: string
  quantity: number
  revenue: number
}

interface LowStockProduct {
  id: string
  name: string
  currentStock: string
}

interface ReportsDashboardProps {
  salesToday: number
  salesMonth: number
  profitToday: number
  profitMonth: number
  accumulatedWaste: number
  salesByPayment: SalesByPayment[]
  topProducts: TopProduct[]
  lowStockProducts: LowStockProduct[]
}

export function ReportsDashboard({
  salesToday,
  salesMonth,
  profitToday,
  profitMonth,
  accumulatedWaste,
  salesByPayment,
  topProducts,
  lowStockProducts,
}: ReportsDashboardProps) {
  return (
    <section className="reports-dashboard">
      <div className="reports-kpi-grid">
        <article className="surface-card report-kpi">
          <span>Ventas del dia</span>
          <strong>{formatCurrency(salesToday)}</strong>
        </article>
        <article className="surface-card report-kpi">
          <span>Ventas del mes</span>
          <strong>{formatCurrency(salesMonth)}</strong>
        </article>
        <article className="surface-card report-kpi report-kpi--success">
          <span>Utilidad estimada del dia</span>
          <strong>{formatCurrency(profitToday)}</strong>
        </article>
        <article className="surface-card report-kpi report-kpi--success">
          <span>Utilidad estimada del mes</span>
          <strong>{formatCurrency(profitMonth)}</strong>
        </article>
        <article className="surface-card report-kpi report-kpi--warning">
          <span>Merma acumulada</span>
          <strong>{formatCurrency(accumulatedWaste)}</strong>
        </article>
      </div>

      <div className="reports-panels-grid">
        <section className="surface-card">
          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Productos mas vendidos</p>
              <h3>Ranking actual</h3>
              <p>Resumen por cantidad vendida y facturacion.</p>
            </div>
          </div>
          <div className="report-list">
            {topProducts.length ? (
              topProducts.map((product) => (
                <article key={product.productName} className="report-list__item">
                  <div>
                    <strong>{product.productName}</strong>
                    <p>{product.quantity.toFixed(2)} vendidos</p>
                  </div>
                  <strong>{formatCurrency(product.revenue)}</strong>
                </article>
              ))
            ) : (
              <article className="products-empty">
                <strong>Aun no hay ventas suficientes.</strong>
                <p>El ranking aparecera cuando registres ventas.</p>
              </article>
            )}
          </div>
        </section>

        <section className="surface-card">
          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Stock bajo</p>
              <h3>Productos criticos</h3>
              <p>Detecta productos que requieren reposicion o revision.</p>
            </div>
          </div>
          <div className="report-list">
            {lowStockProducts.length ? (
              lowStockProducts.map((product) => (
                <article key={product.id} className="report-list__item">
                  <div>
                    <strong>{product.name}</strong>
                    <p>Stock actual: {product.currentStock}</p>
                  </div>
                  <span className="report-pill report-pill--warning">Bajo</span>
                </article>
              ))
            ) : (
              <article className="products-empty">
                <strong>No hay alertas de stock bajo.</strong>
                <p>Todos los productos estan sobre su minimo actual.</p>
              </article>
            )}
          </div>
        </section>

        <section className="surface-card">
          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Ventas por metodo</p>
              <h3>Distribucion de pagos</h3>
              <p>Ayuda a revisar flujo de caja y comportamiento de clientes.</p>
            </div>
          </div>
          <div className="report-list">
            {salesByPayment.length ? (
              salesByPayment.map((row) => (
                <article key={row.method} className="report-list__item">
                  <strong>{row.method}</strong>
                  <strong>{formatCurrency(row.total)}</strong>
                </article>
              ))
            ) : (
              <article className="products-empty">
                <strong>No hay ventas registradas.</strong>
                <p>Los metodos de pago apareceran aqui.</p>
              </article>
            )}
          </div>
        </section>
      </div>
    </section>
  )
}
