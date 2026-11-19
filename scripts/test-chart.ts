import { calculateBirthChart } from '../src/lib/astrology/chart'

// Test: Atatürk'ün doğum haritası (1881, Selanik — bilinen tarih, saat bilinmiyor)
console.log('=== Test 1: Atatürk (1881-05-19, saat bilinmiyor) ===')
const chart1 = calculateBirthChart({
  birthDate: new Date('1881-05-19T12:00:00Z'),
  birthTimeUnknown: true,
  birthLat: 40.6401,
  birthLng: 22.9444,
  birthPlaceName: 'Selanik',
})
console.log('Güneş:', chart1.sunSignFormatted)
console.log('Ay:', chart1.moonSignFormatted)
console.log('Yükselen:', chart1.ascendantFormatted || '(bilinmiyor)')
console.log('Narrative:', chart1.narrative)
console.log('')

// Test 2: Bu ogün İstanbul'da, saat verili
console.log('=== Test 2: 1990-05-15 14:00 İstanbul (saat verili) ===')
const chart2 = calculateBirthChart({
  birthDate: new Date('1990-05-15T11:00:00Z'), // 14:00 Türkiye = 11:00 UTC
  birthTimeUnknown: false,
  birthLat: 41.0082,
  birthLng: 28.9784,
  birthPlaceName: 'İstanbul',
})
console.log('Güneş:', chart2.sunSignFormatted, '/ element:', chart2.elementBalance)
console.log('Ay:', chart2.moonSignFormatted)
console.log('Yükselen:', chart2.ascendantFormatted)
console.log('MC:', chart2.mc)
console.log('Gezegen sayısı:', chart2.planets.length)
console.log('Önemli açılar:', chart2.majorAspects.length)
console.log('Houses:', chart2.houses?.length)
console.log('Narrative:', chart2.narrative)
