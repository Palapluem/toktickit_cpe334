// UNIT-05 (#21). BR-38, BR-39; TDT-01 equivalence partitions and TDT-02
// boundary-value analysis for the public query parser.
import { describe, expect, it } from 'vitest'
import { parseTicketQuery } from '../../src/tickets/query.js'

describe('UNIT-05 · BR-38/BR-39 · ticket query parsing', () => {
  it('applies the documented defaults, including the IT Priority filter slot', () => {
    expect(parseTicketQuery({})).toEqual({
      value: {
        search: null,
        categoryId: null,
        relatedSystemId: null,
        requestedPriority: null,
        itPriority: null,
        status: null,
        sort: { field: 'createdAt', direction: 'desc' },
        page: 1,
        pageSize: 10,
      },
      errors: [],
    })
  })

  it('trims search and parses every supported filter and sort value', () => {
    expect(
      parseTicketQuery({
        search: '  battery  ',
        categoryId: '11111111-1111-4111-8111-111111111111',
        relatedSystemId: '22222222-2222-4222-8222-222222222222',
        requestedPriority: 'HIGH',
        itPriority: 'URGENT',
        status: 'ASSIGNED',
        sort: 'summary:asc',
        page: '2',
        pageSize: '25',
      }),
    ).toEqual({
      value: {
        search: 'battery',
        categoryId: '11111111-1111-4111-8111-111111111111',
        relatedSystemId: '22222222-2222-4222-8222-222222222222',
        requestedPriority: 'HIGH',
        itPriority: 'URGENT',
        status: 'ASSIGNED',
        sort: { field: 'summary', direction: 'asc' },
        page: 2,
        pageSize: 25,
      },
      errors: [],
    })
  })

  it.each([
    ['unknown sort field', { sort: 'id:asc' }],
    ['invalid sort direction', { sort: 'summary:sideways' }],
    ['page zero', { page: '0' }],
    ['non-numeric page', { page: 'abc' }],
    ['page size zero', { pageSize: '0' }],
    ['page size above maximum', { pageSize: '51' }],
    ['invalid IT Priority', { itPriority: 'NOT_A_PRIORITY' }],
    ['unknown parameter', { madeUp: 'value' }],
  ])('returns a validation error for %s', (_label, query) => {
    expect(parseTicketQuery(query).errors.length).toBeGreaterThan(0)
  })

  it('accepts the page-size boundaries', () => {
    expect(parseTicketQuery({ pageSize: '1' }).value.pageSize).toBe(1)
    expect(parseTicketQuery({ pageSize: '50' }).value.pageSize).toBe(50)
  })
})
