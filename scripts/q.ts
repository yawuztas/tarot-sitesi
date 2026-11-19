import { PrismaClient } from '@prisma/client'
async function main() {
  const prisma = new PrismaClient()
  const total = await prisma.card.count()
  const withAstro = await prisma.card.count({ where: { NOT: { astrologicalCorrespondence: null } } })
  const withElement = await prisma.card.count({ where: { NOT: { element: null } } })
  const sample = await prisma.card.findMany({
    where: { style: { slug: 'rider-waite' }, astrologicalCorrespondence: { not: null } },
    select: { nameTr: true, astrologicalCorrespondence: true, element: true, numerologyKey: true },
    take: 8
  })
  console.log(`Toplam kart: ${total}, astro karşılığı dolu: ${withAstro}, element dolu: ${withElement}`)
  console.log('--- örnekler ---')
  for (const c of sample) {
    console.log(`  ${c.nameTr.padEnd(28)} | ${c.astrologicalCorrespondence} | element: ${c.element}`)
  }
  await prisma.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
