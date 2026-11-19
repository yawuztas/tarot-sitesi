/**
 * Türkiye Şehir Veritabanı
 *
 * 81 il merkezi. latitude/longitude derece ondalık olarak.
 * Doğum yeri seçimi için kullanılır.
 */

export interface BirthCity {
  name: string;        // "İstanbul"
  province: string;    // "İstanbul"
  lat: number;
  lng: number;
  timezone: string;    // IANA timezone
}

/**
 * 81 ilin merkez ilçeleri. latitude/longitude derece ondalık.
 * Timezone: Tüm Türkiye tek timezone kullanır (Europe/Istanbul, UTC+3 year-round since 2016).
 */
export const TURKISH_CITIES: BirthCity[] = [
  { name: "Adana", province: "Adana", lat: 37.0000, lng: 35.3213, timezone: "Europe/Istanbul" },
  { name: "Adıyaman", province: "Adıyaman", lat: 37.7648, lng: 38.2786, timezone: "Europe/Istanbul" },
  { name: "Afyonkarahisar", province: "Afyonkarahisar", lat: 38.7507, lng: 30.5567, timezone: "Europe/Istanbul" },
  { name: "Ağrı", province: "Ağrı", lat: 39.7191, lng: 43.0503, timezone: "Europe/Istanbul" },
  { name: "Aksaray", province: "Aksaray", lat: 38.3687, lng: 34.0370, timezone: "Europe/Istanbul" },
  { name: "Amasya", province: "Amasya", lat: 40.6499, lng: 35.8353, timezone: "Europe/Istanbul" },
  { name: "Ankara", province: "Ankara", lat: 39.9334, lng: 32.8597, timezone: "Europe/Istanbul" },
  { name: "Antalya", province: "Antalya", lat: 36.8969, lng: 30.7133, timezone: "Europe/Istanbul" },
  { name: "Ardahan", province: "Ardahan", lat: 41.1105, lng: 42.7022, timezone: "Europe/Istanbul" },
  { name: "Artvin", province: "Artvin", lat: 41.1828, lng: 41.8183, timezone: "Europe/Istanbul" },
  { name: "Aydın", province: "Aydın", lat: 37.8394, lng: 27.8456, timezone: "Europe/Istanbul" },
  { name: "Balıkesir", province: "Balıkesir", lat: 39.6484, lng: 27.8826, timezone: "Europe/Istanbul" },
  { name: "Bartın", province: "Bartın", lat: 41.6358, lng: 32.3375, timezone: "Europe/Istanbul" },
  { name: "Batman", province: "Batman", lat: 37.8812, lng: 41.1351, timezone: "Europe/Istanbul" },
  { name: "Bayburt", province: "Bayburt", lat: 40.2552, lng: 40.2249, timezone: "Europe/Istanbul" },
  { name: "Bilecik", province: "Bilecik", lat: 40.1426, lng: 29.9793, timezone: "Europe/Istanbul" },
  { name: "Bingöl", province: "Bingöl", lat: 38.8847, lng: 40.4986, timezone: "Europe/Istanbul" },
  { name: "Bitlis", province: "Bitlis", lat: 38.4011, lng: 42.1080, timezone: "Europe/Istanbul" },
  { name: "Bolu", province: "Bolu", lat: 40.7392, lng: 31.6094, timezone: "Europe/Istanbul" },
  { name: "Burdur", province: "Burdur", lat: 37.7203, lng: 30.2908, timezone: "Europe/Istanbul" },
  { name: "Bursa", province: "Bursa", lat: 40.1828, lng: 29.0667, timezone: "Europe/Istanbul" },
  { name: "Çanakkale", province: "Çanakkale", lat: 40.1553, lng: 26.4142, timezone: "Europe/Istanbul" },
  { name: "Çankırı", province: "Çankırı", lat: 40.6013, lng: 33.6134, timezone: "Europe/Istanbul" },
  { name: "Çorum", province: "Çorum", lat: 40.5499, lng: 34.9533, timezone: "Europe/Istanbul" },
  { name: "Denizli", province: "Denizli", lat: 37.7765, lng: 29.0864, timezone: "Europe/Istanbul" },
  { name: "Diyarbakır", province: "Diyarbakır", lat: 37.9144, lng: 40.2306, timezone: "Europe/Istanbul" },
  { name: "Düzce", province: "Düzce", lat: 40.8438, lng: 31.1565, timezone: "Europe/Istanbul" },
  { name: "Edirne", province: "Edirne", lat: 41.6764, lng: 26.5559, timezone: "Europe/Istanbul" },
  { name: "Elazığ", province: "Elazığ", lat: 38.6810, lng: 39.2264, timezone: "Europe/Istanbul" },
  { name: "Erzincan", province: "Erzincan", lat: 39.7464, lng: 39.4914, timezone: "Europe/Istanbul" },
  { name: "Erzurum", province: "Erzurum", lat: 39.9043, lng: 41.2679, timezone: "Europe/Istanbul" },
  { name: "Eskişehir", province: "Eskişehir", lat: 39.7767, lng: 30.5206, timezone: "Europe/Istanbul" },
  { name: "Gaziantep", province: "Gaziantep", lat: 37.0662, lng: 37.3833, timezone: "Europe/Istanbul" },
  { name: "Giresun", province: "Giresun", lat: 40.9128, lng: 38.3895, timezone: "Europe/Istanbul" },
  { name: "Gümüşhane", province: "Gümüşhane", lat: 40.4386, lng: 39.5086, timezone: "Europe/Istanbul" },
  { name: "Hakkari", province: "Hakkari", lat: 37.5744, lng: 43.7408, timezone: "Europe/Istanbul" },
  { name: "Hatay", province: "Hatay", lat: 36.4018, lng: 36.3498, timezone: "Europe/Istanbul" },
  { name: "Iğdır", province: "Iğdır", lat: 39.9237, lng: 44.0450, timezone: "Europe/Istanbul" },
  { name: "Isparta", province: "Isparta", lat: 37.7648, lng: 30.5566, timezone: "Europe/Istanbul" },
  { name: "İstanbul", province: "İstanbul", lat: 41.0082, lng: 28.9784, timezone: "Europe/Istanbul" },
  { name: "İzmir", province: "İzmir", lat: 38.4192, lng: 27.1287, timezone: "Europe/Istanbul" },
  { name: "Kahramanmaraş", province: "Kahramanmaraş", lat: 37.5858, lng: 36.9371, timezone: "Europe/Istanbul" },
  { name: "Karabük", province: "Karabük", lat: 41.2061, lng: 32.6204, timezone: "Europe/Istanbul" },
  { name: "Karaman", province: "Karaman", lat: 37.1759, lng: 33.2287, timezone: "Europe/Istanbul" },
  { name: "Kars", province: "Kars", lat: 40.6013, lng: 43.0975, timezone: "Europe/Istanbul" },
  { name: "Kastamonu", province: "Kastamonu", lat: 41.3887, lng: 33.7827, timezone: "Europe/Istanbul" },
  { name: "Kayseri", province: "Kayseri", lat: 38.7312, lng: 35.4787, timezone: "Europe/Istanbul" },
  { name: "Kırıkkale", province: "Kırıkkale", lat: 39.8468, lng: 33.5153, timezone: "Europe/Istanbul" },
  { name: "Kırklareli", province: "Kırklareli", lat: 41.7333, lng: 27.2167, timezone: "Europe/Istanbul" },
  { name: "Kırşehir", province: "Kırşehir", lat: 39.1425, lng: 34.1709, timezone: "Europe/Istanbul" },
  { name: "Kilis", province: "Kilis", lat: 36.7161, lng: 37.1150, timezone: "Europe/Istanbul" },
  { name: "Kocaeli", province: "Kocaeli", lat: 40.8533, lng: 29.8815, timezone: "Europe/Istanbul" },
  { name: "Konya", province: "Konya", lat: 37.8746, lng: 32.4932, timezone: "Europe/Istanbul" },
  { name: "Kütahya", province: "Kütahya", lat: 39.4242, lng: 29.9833, timezone: "Europe/Istanbul" },
  { name: "Malatya", province: "Malatya", lat: 38.3552, lng: 38.3095, timezone: "Europe/Istanbul" },
  { name: "Manisa", province: "Manisa", lat: 38.6191, lng: 27.4289, timezone: "Europe/Istanbul" },
  { name: "Mardin", province: "Mardin", lat: 37.3212, lng: 40.7245, timezone: "Europe/Istanbul" },
  { name: "Mersin", province: "Mersin", lat: 36.8000, lng: 34.6333, timezone: "Europe/Istanbul" },
  { name: "Muğla", province: "Muğla", lat: 37.2145, lng: 28.3636, timezone: "Europe/Istanbul" },
  { name: "Muş", province: "Muş", lat: 38.7432, lng: 41.5065, timezone: "Europe/Istanbul" },
  { name: "Nevşehir", province: "Nevşehir", lat: 38.6949, lng: 34.6857, timezone: "Europe/Istanbul" },
  { name: "Niğde", province: "Niğde", lat: 37.9667, lng: 34.6833, timezone: "Europe/Istanbul" },
  { name: "Ordu", province: "Ordu", lat: 40.9839, lng: 37.8764, timezone: "Europe/Istanbul" },
  { name: "Osmaniye", province: "Osmaniye", lat: 37.0742, lng: 36.2478, timezone: "Europe/Istanbul" },
  { name: "Rize", province: "Rize", lat: 41.0201, lng: 40.5234, timezone: "Europe/Istanbul" },
  { name: "Sakarya", province: "Sakarya", lat: 40.7569, lng: 30.3781, timezone: "Europe/Istanbul" },
  { name: "Samsun", province: "Samsun", lat: 41.2867, lng: 36.3300, timezone: "Europe/Istanbul" },
  { name: "Siirt", province: "Siirt", lat: 37.9333, lng: 41.9500, timezone: "Europe/Istanbul" },
  { name: "Sinop", province: "Sinop", lat: 42.0231, lng: 35.1531, timezone: "Europe/Istanbul" },
  { name: "Sivas", province: "Sivas", lat: 39.7477, lng: 37.0179, timezone: "Europe/Istanbul" },
  { name: "Şanlıurfa", province: "Şanlıurfa", lat: 37.1674, lng: 38.7955, timezone: "Europe/Istanbul" },
  { name: "Şırnak", province: "Şırnak", lat: 37.4187, lng: 42.4918, timezone: "Europe/Istanbul" },
  { name: "Tekirdağ", province: "Tekirdağ", lat: 40.9833, lng: 27.5167, timezone: "Europe/Istanbul" },
  { name: "Tokat", province: "Tokat", lat: 40.3167, lng: 36.5500, timezone: "Europe/Istanbul" },
  { name: "Trabzon", province: "Trabzon", lat: 41.0050, lng: 39.7225, timezone: "Europe/Istanbul" },
  { name: "Tunceli", province: "Tunceli", lat: 39.1079, lng: 39.5401, timezone: "Europe/Istanbul" },
  { name: "Uşak", province: "Uşak", lat: 38.6823, lng: 29.4082, timezone: "Europe/Istanbul" },
  { name: "Van", province: "Van", lat: 38.4891, lng: 43.4089, timezone: "Europe/Istanbul" },
  { name: "Yalova", province: "Yalova", lat: 40.6500, lng: 29.2667, timezone: "Europe/Istanbul" },
  { name: "Yozgat", province: "Yozgat", lat: 39.8181, lng: 34.8147, timezone: "Europe/Istanbul" },
  { name: "Zonguldak", province: "Zonguldak", lat: 41.4564, lng: 31.7987, timezone: "Europe/Istanbul" },
];

/**
 * İsme göre şehir bulur. Türkçe karakterlere duyarlı, case-insensitive.
 */
export function findCityByName(name: string): BirthCity | null {
  if (!name) return null;
  const normalized = name.trim().toLocaleLowerCase('tr-TR');
  return TURKISH_CITIES.find(c =>
    c.name.toLocaleLowerCase('tr-TR') === normalized
  ) || null;
}

/**
 * İsme göre en yakın eşleşmeyi bulur (substring veya prefix).
 */
export function searchCities(query: string, limit = 5): BirthCity[] {
  if (!query) return TURKISH_CITIES.slice(0, limit);
  const q = query.trim().toLocaleLowerCase('tr-TR');
  return TURKISH_CITIES
    .filter(c => c.name.toLocaleLowerCase('tr-TR').includes(q))
    .slice(0, limit);
}
