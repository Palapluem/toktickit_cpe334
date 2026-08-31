// api.ts contract (#17). §11.3, api-spec.md §1.
// Lab 1's client tests mock fetch and were never updated when #18 introduced the
// { data: [...] } envelope and UUID identifiers, so they stayed green against a
// shape the server no longer returns. These assert the real contract.
import { describe, expect, it, vi, afterEach } from 'vitest'
import { fetchCategories, fetchRequesters } from '../../src/api.js'

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

describe('api · requesters', () => {
  it('returns the active requesters from inside data', async () => {
    vi.stubGlobal(
      'fetch',
      mockJson({
        data: [
          { id: 'r1', displayName: 'Jennifer Anderson', email: 'j@example.ac.th' },
        ],
      }),
    )

    const requesters = await fetchRequesters()

    expect(requesters).toHaveLength(1)
    expect(requesters[0].displayName).toBe('Jennifer Anderson')
  })
})

describe('api · the requester context travels in a header (§11.3)', () => {
  it('sends X-Requester-Id on a requester-scoped request', async () => {
    const fetchMock = mockJson({ data: [] })
    vi.stubGlobal('fetch', fetchMock)

    await fetchCategories('req-42')

    const [, init] = fetchMock.mock.calls[0]
    expect(new Headers(init?.headers).get('X-Requester-Id')).toBe('req-42')
  })

  it('omits the header entirely when there is no context', async () => {
    const fetchMock = mockJson({ data: [] })
    vi.stubGlobal('fetch', fetchMock)

    await fetchCategories()

    // The call is asserted first: "no header" is also true of a request that
    // was never made.
    expect(fetchMock).toHaveBeenCalledOnce()
    const [, init] = fetchMock.mock.calls[0]
    expect(new Headers(init?.headers).get('X-Requester-Id')).toBeNull()
  })
})
