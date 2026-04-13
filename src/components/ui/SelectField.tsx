import type { PropsWithChildren, SelectHTMLAttributes } from 'react'

interface SelectOption {
  label: string
  value: string
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hint?: string
  options: SelectOption[]
}

export function SelectField({
  label,
  hint,
  options,
  className = '',
  ...props
}: PropsWithChildren<SelectFieldProps>) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <select className={`field__input ${className}`.trim()} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  )
}
