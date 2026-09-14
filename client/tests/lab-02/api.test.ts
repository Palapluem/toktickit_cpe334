// API client contract (#17). FR-01, FR-16, BR-14, TC-008; api-spec.md §1.
// These tests assert the current { data: [...] } envelope and UUID contract.
import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  fetchCategories,
  fetchCurrentUser,
  fetchTickets,
} from '../../src/api.js'

function mockJson(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api · the data envelope is unwrapped', () => {
  it('returns the array from inside data, not the envelope', async () => {
    vi.stubGlobal(
      'fetch',
      mockJson({ data: [{ id: 'c1', name: 'Hardware' }] }),
    )

    const categories = await fetchCategories()

    expect(Array.isArray(categories)).toBe(true)
    expect(categories[0]).toEqual({ id: 'c1', name: 'Hardware' })
  })

  it('carries UUID identifiers as strings', async () => {
    vi.stubGlobal(
      'fetch',
      mockJson({ data: [{ id: '3f1a0000-0000-4000-8000-000000000001', name: 'Network' }] }),
    )

    const categories = await fetchCategories()

    // Asserted before indexing: destructuring an envelope object throws a
    // TypeError, which describes the test's shape rather than the defect.
    expect(Array.isArray(categories)).toBe(true)
    expect(typeof categories[0].id).toBe('string')
  })

  it('throws a safe error when the response is not ok', async () => {
    vi.stubGlobal('fetch', mockJson({}, false, 500))

    await expect(fetchCategories()).rejects.toThrow(/categories/i)
  })
})

// The selector's endpoint is gone (AC-15). /api/auth/me is how the client
// learns who it is, and its role, now.
describe('api · the authenticated user', () => {
  it('returns the safe profile from inside data', async () => {
    vi.stubGlobal(
      'fetch',
      mockJson({
        data: {
          id: 'r1',
          displayName: 'Jennifer Anderson',
          email: 'j@example.ac.th',
          role: 'REQUESTER',
          mustChangePassword: false,
        },
      }),
    )

    const user = await fetchCurrentUser()

    expect(user.displayName).toBe('Jennifer Anderson')
    expect(user.role).toBe('REQUESTER')
  })
})

describe('api · My Tickets list request', () => {
  it('serializes the documented filters and preserves the list response shape', async () => {
    const responseBody = {
      data: [],
      pagination: {
        page: 2,
        pageSize: 25,
        totalItems: 0,
        totalPages: 0,
        hasPreviousPage: true,
        hasNextPage: false,
      },
      appliedFilters: {
        search: 'battery',
        categoryId: '11111111-1111-4111-8111-111111111111',
        relatedSystemId: null,
        requestedPriority: 'HIGH',
        itPriority: 'URGENT',
        status: 'OPEN',
        sort: 'summary:asc',
      },
    }
    const fetchMock = mockJson(responseBody)
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchTickets({
      search: '  battery  ',
      categoryId: '11111111-1111-4111-8111-111111111111',
      requestedPriority: 'HIGH',
      itPriority: 'URGENT',
      status: 'OPEN',
      sort: 'summary:asc',
      page: 2,
      pageSize: 25,
    })

    const [url, init] = fetchMock.mock.calls[0]
    const parsedUrl = new URL(String(url))
    expect(parsedUrl.pathname).toBe('/api/tickets')
    expect(Object.fromEntries(parsedUrl.searchParams)).toEqual({
      search: 'battery',
      categoryId: '11111111-1111-4111-8111-111111111111',
      requestedPriority: 'HIGH',
      itPriority: 'URGENT',
      status: 'OPEN',
      sort: 'summary:asc',
      page: '2',
      pageSize: '25',
    })
    expect(init?.credentials).toBe('include')
    expect(result).toEqual(responseBody)
  })
})

// Replaces "the requester context travels in a header" (lab-02 §11.3).
// Identity is the session cookie, which the browser attaches — so the only
// thing the client has to get right is asking for it to be sent (AC-15).
describe('api · identity travels in the session cookie', () => {
  it('sends credentials on a scoped request', async () => {
    const fetchMock = mockJson({ data: [] })
    vi.stubGlobal('fetch', fetchMock)

    await fetchCategories()

    expect(fetchMock).toHaveBeenCalledOnce()
    const [, init] = fetchMock.mock.calls[0]
    expect(init?.credentials).toBe('include')
  })

  it('names no user in the request it sends', async () => {
    const fetchMock = mockJson({ data: [] })
    vi.stubGlobal('fetch', fetchMock)

    await fetchCategories()

    // The call is asserted first: "no identifier" is also true of a request
    // that was never made.
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    const headerNames = [...new Headers(init?.headers).keys()]
    expect(headerNames).not.toContain('x-requester-id')
    expect(String(url)).not.toMatch(/requesterId/i)
  })
})
