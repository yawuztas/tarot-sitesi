import { db } from '../src/lib/db.ts';

const spreads = await db.spread.findMany({ select: { id: true, slug: true, nameTr: true, isActive: true, cardCount: true }});
console.log('All spreads:');
console.log(JSON.stringify(spreads, null, 2));
