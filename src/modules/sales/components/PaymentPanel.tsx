import { Button } from '../../../components/ui/Button'
import { Field } from '../../../components/ui/Field'
import { SelectField } from '../../../components/ui/SelectField'
import { formatCurrency } from '../../../lib/format'
import type { Sale } from '../../../types/domain'

interface PaymentPanelProps {
  subtotal: number
  paymentMethod: Sale['paymentMethod']
  cashReceived: string
  changeAmount: number
  errors: { payment?: string; cashReceived?: string; general?: string }
  onPaymentMethodChange: (value: Sale['paymentMethod']) => void
  onCashReceivedChange: (value: string) => void
  onConfirmSale: () => void
}

export function PaymentPanel({
  subtotal,
  paymentMethod,
  cashReceived,
  changeAmount,
  errors,
  onPaymentMethodChange,
  onCashReceivedChange,
  onConfirmSale,
}: PaymentPanelProps) {
  return (
    <section className="surface-card sales-payment">
      <div className="inventory-section__header">
        <div>
          <p className="section-kicker">Pago</p>
          <h3>Metodo de pago</h3>
          <p>Confirma la venta y guarda fecha, hora, metodo y detalle vendido.</p>
        </div>
      </div>

      <SelectField
        label="Metodo de pago"
        value={paymentMethod}
        onChange={(event) =>
          onPaymentMethodChange(event.target.value as Sale['paymentMethod'])
        }
        options={[
          { label: 'Efectivo', value: 'cash' },
          { label: 'Debito', value: 'debit' },
          { label: 'Credito', value: 'credit' },
          { label: 'Transferencia', value: 'transfer' },
        ]}
        hint={errors.payment}
      />

      {paymentMethod === 'cash' ? (
        <Field
          label="Monto entregado por el cliente"
          type="number"
          min="0"
          step="1"
          value={cashReceived}
          onChange={(event) => onCashReceivedChange(event.target.value)}
          hint={errors.cashReceived}
        />
      ) : null}

      <div className="sales-summary">
        <div>
          <span>Total a pagar</span>
          <strong>{formatCurrency(subtotal)}</strong>
        </div>
        {paymentMethod === 'cash' ? (
          <div>
            <span>Vuelto</span>
            <strong>{formatCurrency(changeAmount)}</strong>
          </div>
        ) : null}
      </div>

      {errors.general ? <p className="form-error">{errors.general}</p> : null}

      <Button onClick={onConfirmSale} fullWidth>
        Confirmar venta
      </Button>
    </section>
  )
}
