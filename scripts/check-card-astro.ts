import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  const cards = await prisma.card.findMany({
    where: { style: { slug: 'rider-waite' }, arcanaType: 'MAJOR' },
    select: { nameTr: true, astrologicalCorrespondence: true, element: true, numerologyKey: true },
    take: 12,
    orderBy: { number: 'asc' }
  })
  console.log('=== Kart Astrolojik Karşılıkları (Rider-Waite Major) ===')
  for (const c of cards) {
    console.log(`  ${c.nameTr.padEnd(25)} | astro: ${(c.astrologicalCorrespondence||'-').padEnd(20)} | element: ${c.element||'-'} | numerology: ${c.numerologyKey||'-'}`)
  }
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
