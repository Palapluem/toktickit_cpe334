// E2E-06 · lab-04 AC-41, FR-26 — a Lab 4 journey fails on a console error, a page error, a failed request or an error response it did not declare.
import { test as base, expect } from '../lab-02/fixtures'

type Audit = {
  /** Declares one error the journey causes on purpose; `reason` says which journey step and why. */
  allow: (reason: string, ...patterns: RegExp[]) => void
}

export const test = base.extend<{ audit: Audit }>({
  audit: [
    async ({ page }, use) => {
      const allowed: RegExp[] = []
      const findings: string[] = []
      page.on('console', (message) => {
        if (message.type() === 'error') findings.push(`console error: ${message.text()}`)
      })
      page.on('pageerror', (error) => findings.push(`page error: ${error.message}`))
      page.on('requestfailed', (request) => findings.push(`request failed: ${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`))
      page.on('response', (response) => {
        if (response.status() >= 400) findings.push(`HTTP ${response.status()}: ${response.request().method()} ${response.url()}`)
      })

      await use({ allow: (_reason, ...patterns) => allowed.push(...patterns) })

      const unexpected = findings.filter((finding) => !allowed.some((pattern) => pattern.test(finding)))
      expect(unexpected, 'console errors, failed requests and error responses the journey did not declare').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
