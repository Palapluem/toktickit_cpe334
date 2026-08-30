/**
 * Reference-data seed — idempotent by design.
 *
 * Authority: `specification.md` §7. The identities below are fixed in the
 * specification rather than chosen here, because they appear in the submission
 * screenshots and renaming one later means retaking them.
 *
 * Every write is an upsert keyed on the natural unique column — `name` for
 * reference data, `email` for Requesters — so running this repeatedly inserts
 * nothing and updates nothing. `create` would work perfectly on a clean database
 * and duplicate every row on the second run; `tests/lab-02/seed-idempotency.test.ts`
 * is what stops that reaching a merge.
 */
import prisma from '../src/prisma.js'

const CATEGORY_NAMES = [
  'Account and Access',
  'Hardware',
  'Network',
  'Software',
]

const RELATED_SYSTEM_NAMES = [
  'Campus Wi-Fi',
  'Corporate Laptop',
  'Email',
  'Grade Submission App',
  'LEB2 App',
  'Printer',
  'VPN',
]

/**
 * Robert Wilson is inactive on purpose. He must never appear in the selector
 * (BR-10) and must never be a Ticket's requester (BR-11); a seed with only
 * active rows cannot demonstrate either rule, so the tests for them would pass
 * against an endpoint with no filter at all.
 */
const REQUESTERS = [
  {
    displayName: 'Jennifer Anderson',
    email: 'jennifer.anderson@example.ac.th',
    isActive: true,
  },
  {
    displayName: 'Michael Brown',
    email: 'michael.brown@example.ac.th',
    isActive: true,
  },
  {
    displayName: 'Sarah Johnson',
    email: 'sarah.johnson@example.ac.th',
    isActive: true,
  },
  {
    displayName: 'David Lee',
    email: 'david.lee@example.ac.th',
    isActive: true,
  },
  {
    displayName: 'Robert Wilson',
    email: 'robert.wilson@example.ac.th',
    isActive: false,
  },
]

async function main() {
  for (const name of CATEGORY_NAMES) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }

  for (const name of RELATED_SYSTEM_NAMES) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }

  for (const requester of REQUESTERS) {
    await prisma.requesterUser.upsert({
      where: { email: requester.email },
      // `isActive` is restated on update so that a row flipped by hand during
      // testing returns to its specified state; the rest is left untouched.
      update: { isActive: requester.isActive },
      create: requester,
    })
  }

  const [categories, relatedSystems, requesters] = await Promise.all([
    prisma.category.count(),
    prisma.relatedSystem.count(),
    prisma.requesterUser.count(),
  ])

  console.log(
    `Seeded reference data: ${categories} categories, ` +
      `${relatedSystems} related systems, ${requesters} requesters ` +
      `(${REQUESTERS.filter((r) => r.isActive).length} active).`,
  )
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
