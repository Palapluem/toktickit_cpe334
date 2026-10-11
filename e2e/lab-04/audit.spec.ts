// E2E-06 · lab-04 AC-41, FR-26 — each role walks every screen it can reach by following links; nothing logs an error, no link leads
// nowhere, no anchor points at a missing element and no placeholder text shows. Every other Lab 4 journey is audited by ./audit.ts.
import { test, expect } from './audit'
import { PEOPLE, login } from './support'

type Page = import('@playwright/test').Page
type Step = { path: string; hash: string }

const PLACEHOLDER = /lorem ipsum|\bTODO\b|coming soon|not implemented|\bTBD\b/i
const PAGE_LIMIT = 30

const stepFor = (href: string): Step => {
  const [path, hash = ''] = href.split('#')
  return { path, hash }
}

/** Follows every internal link from the start pages, one page each, and returns the paths it opened. */
async function walk(page: Page, start: string[]): Promise<string[]> {
  const queue = start.map(stepFor)
  const opened: string[] = []
  const seen = new Set<string>()
  while (queue.length > 0 && opened.length < PAGE_LIMIT) {
    const { path, hash } = queue.shift()!
    if (seen.has(path + '#' + hash)) continue
    seen.add(path + '#' + hash)
    const first = !opened.includes(path)
    const response = await page.goto(path)
    // A navigation that only adds or drops the #hash is a same-document one and answers null (seen in WebKit); the heading below proves the page.
    // 304 is a revalidated copy of the same page, which Firefox and WebKit ask for on a second visit; only 4xx and 5xx are failures.
    if (response) expect(response.status(), `${path} loads`).toBeLessThan(400)
    await expect(page.getByRole('heading').first(), `${path} shows a heading`).toBeVisible()
    await page.waitForLoadState('networkidle')
    if (hash) expect(await page.locator(`[id="${hash}"]`).count(), `${path}: the anchor #${hash} points at an element`).toBeGreaterThan(0)
    if (!first) continue
    opened.push(path)

    expect(await page.locator('body').innerText(), `${path} shows no placeholder text`).not.toMatch(PLACEHOLDER)
    const hrefs = await page.locator('a[href]').evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute('href') ?? ''))
    expect(hrefs.filter((href) => href === '' || href === '#'), `${path}: links that lead nowhere`).toEqual([])
    for (const href of new Set(hrefs)) {
      if (href.startsWith('#')) {
        expect(await page.locator(`[id="${href.slice(1)}"]`).count(), `${path}: the anchor ${href} points at an element`).toBeGreaterThan(0)
      } else if (href.startsWith('/') && !href.startsWith('/api/')) {
        queue.push(stepFor(href))
      }
    }
  }
  return opened
}

test('E2E-06 · AC-41 · FR-26 · a signed-out visitor reaches the sign-in and the two public pages without an error', async ({ page, audit }) => {
  // Asking who is signed in answers 401 by the Lab 3 contract (api-spec §2); Chromium logs every non-2xx fetch.
  audit.allow('the session check of a signed-out visit answers 401 (lab-03 api-spec)', /\/api\/auth\/me/, /status of 401/)
  const opened = await walk(page, ['/login', '/system-check', '/style-guide'])
  expect(opened).toEqual(expect.arrayContaining(['/login', '/system-check', '/style-guide']))
})

for (const [role, email, start] of [
  ['Requester', PEOPLE.jennifer, ['/dashboard', '/tickets', '/tickets/new']],
  ['IT Staff', PEOPLE.patricia, ['/staff/dashboard', '/staff/tickets']],
  ['Administrator', PEOPLE.margaret, ['/staff/dashboard', '/staff/tickets', '/admin/users']],
] as const) {
  test(`E2E-06 · AC-41 · FR-26 · the ${role} follows every link from the first screens without an error`, async ({ page }) => {
    await login(page.request, email)
    const opened = await walk(page, [...start])
    expect(opened.length, 'the walk opened more than its start pages').toBeGreaterThan(start.length)
    expect(opened).toEqual(expect.arrayContaining([...start]))
  })
}
