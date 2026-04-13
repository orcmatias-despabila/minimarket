import type { PropsWithChildren, TextareaHTMLAttributes } from 'react'

interface TextAreaFieldProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
}

export function TextAreaField({
  label,
  hint,
  className = '',
  ...props
}: PropsWithChildren<TextAreaFieldProps>) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <textarea className={`field__input field__textarea ${className}`.trim()} {...props} />
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  )
}
