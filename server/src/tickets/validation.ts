import type { FieldError } from '../http/errors.js'

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const

export type ValidatedTicketInput = {
  categoryId: string
  relatedSystemId: string
  summary: string
  description: string
  requestedPriority: (typeof PRIORITIES)[number]
}

export function validateCreateTicketBody(_body: unknown): {
  value?: ValidatedTicketInput
  errors: FieldError[]
} {
  return { errors: [] }
}
