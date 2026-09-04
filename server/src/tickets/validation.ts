import type { FieldError } from '../http/errors.js'

export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const
export const TICKET_STATUSES = [
  'NEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'PENDING_REQUESTER',
  'RESOLVED',
  'CLOSED',
  'CANCELLED',
] as const

const ACCEPTED_FIELDS = new Set([
  'categoryId',
  'relatedSystemId',
  'summary',
  'description',
  'requestedPriority',
  'attachments',
])

export type ValidatedTicketInput = {
  categoryId: string
  relatedSystemId: string
  summary: string
  description: string
  requestedPriority: (typeof PRIORITIES)[number]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function validateCreateTicketBody(body: unknown): {
  value?: ValidatedTicketInput
  errors: FieldError[]
} {
  const errors: FieldError[] = []
  if (!isRecord(body)) {
    return {
      errors: [{ field: 'body', message: 'Request body must be an object.' }],
    }
  }

  for (const key of Object.keys(body)) {
    if (!ACCEPTED_FIELDS.has(key)) {
      errors.push({ field: key, message: 'This property is not accepted.' })
    }
  }

  const stringField = (field: string): string => {
    const raw = body[field]
    if (typeof raw !== 'string') {
      errors.push({ field, message: 'This field is required.' })
      return ''
    }
    return raw.trim()
  }

  const categoryId = stringField('categoryId')
  const relatedSystemId = stringField('relatedSystemId')
  const summary = stringField('summary')
  const description = stringField('description')
  const requestedPriority = stringField('requestedPriority')

  if (categoryId && !UUID.test(categoryId)) {
    errors.push({ field: 'categoryId', message: 'Choose a valid category.' })
  }
  if (relatedSystemId && !UUID.test(relatedSystemId)) {
    errors.push({
      field: 'relatedSystemId',
      message: 'Choose a valid related system.',
    })
  }
  if (summary.length < 5 || summary.length > 150) {
    errors.push({
      field: 'summary',
      message: 'Summary must be between 5 and 150 characters.',
    })
  }
  if (description.length < 10 || description.length > 5000) {
    errors.push({
      field: 'description',
      message: 'Description must be between 10 and 5000 characters.',
    })
  }
  if (!PRIORITIES.includes(requestedPriority as (typeof PRIORITIES)[number])) {
    errors.push({
      field: 'requestedPriority',
      message: 'Choose LOW, MEDIUM, HIGH, or URGENT.',
    })
  }

  return {
    value: {
      categoryId,
      relatedSystemId,
      summary,
      description,
      requestedPriority: requestedPriority as (typeof PRIORITIES)[number],
    },
    errors,
  }
}
