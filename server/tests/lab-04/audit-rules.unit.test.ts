// UNIT-09 · AC-41, FR-26 · the journey audit allows exactly what a test declared, and nothing near it.
import { describe, expect, it } from 'vitest'
import { unexpected, type Observation, type Rule } from '../../../e2e/lab-04/audit-rules.js'

const ME = 'http://127.0.0.1:3002/api/auth/me'
const LOAD_401 = 'Failed to load resource: the server responded with a status of 401 (Unauthorized)'
const allow401: Rule = { kind: 'response', reason: 'a signed-out visit asks who is signed in', status: 401, method: 'GET', url: /^\/api\/auth\/me$/ }
const response = (status: number, url = ME, method = 'GET'): Observation => ({ kind: 'response', status, method, url })
const console_ = (text: string): Observation => ({ kind: 'console', text })

describe('UNIT-09 · AC-41 · a declared response and the console line it causes', () => {
  it('lets the declared 401 on the declared address through, with its console line', () => {
    expect(unexpected([response(401), console_(LOAD_401)], [allow401])).toEqual([])
  })

  it('ignores the query string when it matches the address', () => {
    expect(unexpected([response(401, `${ME}?x=1`), console_(LOAD_401)], [allow401])).toEqual([])
  })

  it.each([
    ['a 500 on the same address', [response(500)]],
    ['a 401 on another address', [response(401, 'http://127.0.0.1:3002/api/staff/dashboard')]],
    ['a 401 with another method', [response(401, ME, 'POST')]],
    ['a 403 on the same address', [response(403)]],
  ])('reports %s', (_name, observations) => {
    expect(unexpected(observations, [allow401])).not.toEqual([])
  })

  it('reports the console line of a 401 that was not declared, even when another 401 was', () => {
    const findings = unexpected(
      [response(401), console_(LOAD_401), response(401, 'http://127.0.0.1:3002/api/staff/dashboard'), console_(LOAD_401)],
      [allow401],
    )
    expect(findings).toHaveLength(2)
    expect(findings.join('\n')).toContain('/api/staff/dashboard')
  })

  it('lets through no more console lines than declared responses', () => {
    expect(unexpected([response(401), console_(LOAD_401), console_(LOAD_401)], [allow401])).toHaveLength(1)
  })

  it('reports a console line of a different status', () => {
    const line = 'Failed to load resource: the server responded with a status of 500 (Internal Server Error)'
    expect(unexpected([response(401), console_(LOAD_401), console_(line)], [allow401])).toHaveLength(1)
  })
})

describe('UNIT-09 · AC-41 · a declared failed request, a declared console line, and everything else', () => {
  const abort: Rule = { kind: 'failedRequest', reason: 'the answer is aborted on purpose', method: 'POST', url: /^\/api\/tickets\/[0-9a-f-]+\/actions$/ }
  const failed = (url: string, method = 'POST'): Observation => ({ kind: 'failedRequest', method, url, failure: 'net::ERR_FAILED' })

  it('lets the declared failed request and one "Failed to load resource" line through, in any engine\'s wording', () => {
    const url = 'http://127.0.0.1:3002/api/tickets/9fdd83d2-e376/actions'
    expect(unexpected([failed(url), console_('Failed to load resource: net::ERR_FAILED')], [abort])).toEqual([])
    expect(unexpected([failed(url), console_('Failed to load resource: NS_ERROR_FAILURE')], [abort])).toEqual([])
  })

  it('reports a failed request elsewhere, and a second console line', () => {
    expect(unexpected([failed('http://127.0.0.1:3002/api/categories', 'GET')], [abort])).toHaveLength(1)
    const url = 'http://127.0.0.1:3002/api/tickets/9fdd83d2-e376/actions'
    expect(unexpected([failed(url), console_('Failed to load resource: net::ERR_FAILED'), console_('Failed to load resource: net::ERR_FAILED')], [abort])).toHaveLength(1)
  })

  it('reports any other console error and any page error, unless a console rule names it', () => {
    expect(unexpected([console_('TypeError: x is undefined')], [allow401])).toHaveLength(1)
    expect(unexpected([{ kind: 'pageError', message: 'boom' }], [allow401])).toHaveLength(1)
    const rule: Rule = { kind: 'console', reason: 'Firefox words an aborted save as a CORS refusal', pattern: /^Cross-Origin Request Blocked: .*\/actions\./ }
    expect(unexpected([console_('Cross-Origin Request Blocked: The Same Origin Policy ... /api/tickets/1/actions. (Reason: CORS request did not succeed)')], [rule])).toEqual([])
    expect(unexpected([console_('Cross-Origin Request Blocked: ... /api/categories. (Reason)')], [rule])).toHaveLength(1)
  })

  it('reports nothing for an empty journey', () => {
    expect(unexpected([], [])).toEqual([])
  })
})
