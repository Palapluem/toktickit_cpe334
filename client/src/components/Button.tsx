// Button hierarchy (ui-spec §4). Busy disables as well as announcing: BR-24
// requires a second click to be impossible, not merely discouraged.
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  busy?: boolean
  busyLabel?: string
  children?: ReactNode
}

export function Button({
  variant = 'secondary',
  busy = false,
  busyLabel,
  disabled,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={`zen-button zen-button--${variant}`}
      disabled={disabled || busy}
      aria-busy={busy ? 'true' : undefined}
    >
      {busy ? (busyLabel ?? 'Working…') : children}
    </button>
  )
}
