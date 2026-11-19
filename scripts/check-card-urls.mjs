import { db } from '../src/lib/db.ts';

const card = await db.card.findFirst({
  where: { slug: 'major-00-fool' },
  select: { 
    slug: true, 
    imageUrlThumb: true, 
    imageUrlSmall: true, 
    imageUrlMedium: true, 
    imageUrlLarge: true, 
    imageUrlFull: true, 
    style: { select: { slug: true } } 
  }
});
console.log('Card:', JSON.stringify(card, null, 2));

const total = await db.card.count();
console.log(`\nTotal cards: ${total}`);
