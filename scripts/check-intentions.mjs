import { db } from '../src/lib/db.ts';
const intentions = await db.intentionCategory.findMany({ select: { slug: true, nameTr: true, promptModifierTr: true, color: true, icon: true }});
console.log(JSON.stringify(intentions, null, 2));
