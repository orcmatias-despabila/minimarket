import { forwardRef, type InputHTMLAttributes, type PropsWithChildren } from 'react'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
}

export const Field = forwardRef<HTMLInputElement, PropsWithChildren<FieldProps>>(
  function Field({ label, hint, className = '', ...props }, ref) {
    const isInvalid = props['aria-invalid'] === true || props['aria-invalid'] === 'true'

    return (
      <label className="field">
        <span className="field__label">{label}</span>
        <input ref={ref} className={`field__input ${className}`.trim()} {...props} />
        {hint ? (
          <span className={`field__hint ${isInvalid ? 'field__hint--error' : ''}`.trim()}>
            {hint}
          </span>
        ) : null}
      </label>
    )
  },
)
