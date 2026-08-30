// STUB — seam only (testing-contract.md §5). Implemented in the feat: commit.
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'destructive'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  busy?: boolean
  busyLabel?: string
  children?: ReactNode
}

export function Button(_props: ButtonProps) {
  return null
}
