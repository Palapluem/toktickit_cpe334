// Reference-data seed. Identities are fixed in specification.md §7 because they
// appear in the submission screenshots. Upsert, not create — see the idempotency
// test in tests/lab-02/seed-idempotency.test.ts.
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

// Robert Wilson is inactive so BR-10 and BR-11 can be proved, not assumed.
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
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } })
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
      // Restated so a row flipped by hand during testing returns to spec.
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
