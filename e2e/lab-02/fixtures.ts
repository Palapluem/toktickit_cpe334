import { test as base, expect } from '@playwright/test'
import { cleanupE2ETickets } from './cleanup'

type Lab02Fixtures = {
  e2eSummaries: Set<string>
}

export const test = base.extend<Lab02Fixtures>({
  e2eSummaries: [
    async ({}, use) => {
      const summaries = new Set<string>()
      await use(summaries)
      cleanupE2ETickets([...summaries])
    },
    { auto: true },
  ],
})

export { expect }
