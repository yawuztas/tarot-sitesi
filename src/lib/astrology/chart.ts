/**
 * Doğum Haritası Hesaplama — Ana Modül
 *
 * Bu modül artık gerçek astroloji hesaplamaları yapıyor.
 * Arkaplanda "celestine" kütüphanesi (pure JavaScript, Swiss Ephemeris-validated)
 * kullanılarak gezegen pozisyonları, evler ve açılar hesaplanır.
 *
 * Mock implementasyon kaldırıldı. Tüm hesaplamalar gerçek astronomik veriye dayanır.
 */

export {
  calculateBirthChart,
  calculateCurrentTransits,
  calculateProgressedChart,
  dateToJulianDay,
  type PlanetPosition,
  type HousePosition,
  type BirthChartInput,
  type BirthChart,
  type ProgressedChart,
} from './celestine-adapter';
