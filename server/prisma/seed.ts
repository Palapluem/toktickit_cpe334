import prisma from '../src/prisma.js'

const CATEGORY_NAMES = ['Account and Access', 'Hardware', 'Software', 'Network']

async function main() {
  for (const name of CATEGORY_NAMES) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }

  const categories = await prisma.category.findMany({ orderBy: { id: 'asc' } })
  console.log('Seeded categories:', categories)
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
