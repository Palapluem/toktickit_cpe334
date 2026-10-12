// E2E-06 · lab-04 AC-41, FR-26 — a Lab 4 journey fails on a console error, a page error, a failed request or an error response it did not declare.
// A declaration names the status or failure, the method and the exact address, so it cannot let anything else through (UNIT-09).
import { test as base, expect } from '../lab-02/fixtures'
import { unexpected, type Observation, type Rule } from './audit-rules'

type Audit = {
  /** The journey causes this error response on purpose; `url` is matched against the path, so anchor it. */
  allowResponse: (reason: string, status: number, method: string, url: RegExp) => void
  /** The journey aborts this request on purpose; the browser's own wording of the failure does not matter. */
  allowFailedRequest: (reason: string, method: string, url: RegExp) => void
  /** An engine-specific console line that the journey causes on purpose; it is not tied to a response, so name it exactly. */
  allowConsole: (reason: string, pattern: RegExp) => void
}

// A fetch the browser itself cancels (the page navigates away, a component goes away) is not a failure; each engine words it differently.
const CANCELLED_BY_BROWSER = /ERR_ABORTED|NS_BINDING_ABORTED|^cancelled$/i

export const test = base.extend<{ audit: Audit }>({
  audit: [
    async ({ page }, use) => {
      const seen: Observation[] = []
      const rules: Rule[] = []
      page.on('console', (message) => {
        if (message.type() === 'error') seen.push({ kind: 'console', text: message.text() })
      })
      page.on('pageerror', (error) => seen.push({ kind: 'pageError', message: error.message }))
      page.on('requestfailed', (request) => {
        const failure = request.failure()?.errorText ?? ''
        if (!CANCELLED_BY_BROWSER.test(failure)) seen.push({ kind: 'failedRequest', method: request.method(), url: request.url(), failure })
      })
      page.on('response', (response) => {
        if (response.status() >= 400) seen.push({ kind: 'response', status: response.status(), method: response.request().method(), url: response.url() })
      })

      await use({
        allowResponse: (reason, status, method, url) => rules.push({ kind: 'response', reason, status, method, url }),
        allowFailedRequest: (reason, method, url) => rules.push({ kind: 'failedRequest', reason, method, url }),
        allowConsole: (reason, pattern) => rules.push({ kind: 'console', reason, pattern }),
      })

      expect(unexpected(seen, rules), 'console errors, failed requests and error responses the journey did not declare').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
