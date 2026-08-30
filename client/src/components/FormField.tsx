// STUB — seam only (testing-contract.md §5). Implemented in the feat: commit.
import type { ReactNode } from 'react'

export type FormFieldProps = {
  id: string
  label: string
  required?: boolean
  readOnly?: boolean
  error?: string
  hint?: string
  children?: ReactNode
}

export function FormField(_props: FormFieldProps) {
  return null
}
