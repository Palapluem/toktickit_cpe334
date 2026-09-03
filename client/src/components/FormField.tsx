// Label above control, asterisk beside it, message below (ui-spec §3).
// Clones the child so callers write a plain input and still get the wiring.
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'

export type FormFieldProps = {
  id: string
  label: string
  required?: boolean
  readOnly?: boolean
  error?: string
  hint?: string
  children?: ReactNode
}

export function FormField({
  id,
  label,
  required = false,
  readOnly = false,
  error,
  hint,
  children,
}: FormFieldProps) {
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(' ')

  const controlClass = [
    'zen-field__control',
    readOnly ? 'zen-field__control--readonly' : null,
    error ? 'zen-field__control--invalid' : null,
  ]
    .filter(Boolean)
    .join(' ')

  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id,
        className: controlClass,
        readOnly: readOnly || undefined,
        'aria-required': required ? 'true' : undefined,
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': describedBy || undefined,
      })
    : children

  return (
    <div className="zen-field">
      <label className="zen-field__label" htmlFor={id}>
        {label}
        {required ? (
          <span className="zen-field__required" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {control}
      {hint ? (
        <p className="zen-field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="zen-field__error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
