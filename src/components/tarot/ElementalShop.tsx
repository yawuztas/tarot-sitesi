'use client';

import React, { useState } from 'react';
import { Sparkles, ShoppingBag, ShieldCheck, Check, MessageCircle, Copy, X } from 'lucide-react';

interface ShopItem {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice: number;
  description: string;
  element: 'Su' | 'Ateş' | 'Toprak' | 'Hava';
  badge: string;
  iconText: string;
}

const ELEMENT_PRODUCTS: Record<string, ShopItem[]> = {
  love: [
    {
      id: 'rose-quartz',
      name: 'Doğal Pembe Kuvars Aşk Taşı',
      category: 'Şifalı Doğal Taş',
      price: 249,
      originalPrice: 380,
      description: 'Kalp çakrasını açar, sevgi ve uyum enerjisini çeker. İlişki yaralarını onarır.',
      element: 'Su',
      badge: 'Kalp Enerjisi',
      iconText: '🌸',
    },
    {
      id: 'amethyst-cluster',
      name: 'Uruguay Ametist Dinginlik Taşı',
      category: 'Mistik Kristal',
      price: 299,
      originalPrice: 420,
      description: 'Aşkta zihinsel karmaşayı dindirir, üçüncü gözü ve sezgileri uyarır.',
      element: 'Su',
      badge: 'Sezgi & Sadakat',
      iconText: '🔮',
    },
  ],
  career: [
    {
      id: 'citrine-abundance',
      name: 'Brezilya Sitrin Bolluk Taşı',
      category: 'Para & Kariyer Taşı',
      price: 279,
      originalPrice: 390,
      description: 'Tüccar taşı olarak bilinir. Maddi tıkanıklıkları çözer, para akışını hızlandırır.',
      element: 'Ateş',
      badge: 'Bolluk & Para',
      iconText: '💰',
    },
    {
      id: 'pyrite-wealth',
      name: 'Doğal Pirit Zenginlik Küpü',
      category: 'Başarı Kristali',
      price: 239,
      originalPrice: 340,
      description: 'Özgüveni artırır, iş görüşmelerinde kararlılık ve liderlik manyetizması verir.',
      element: 'Ateş',
      badge: 'Başarı & İrade',
      iconText: '✨',
    },
  ],
  spirit: [
    {
      id: 'white-sage',
      name: 'Kaliforniya Beyaz Adaçayı & Tütsü Demeti',
      category: 'Arındırıcı Tütsü',
      price: 189,
      originalPrice: 260,
      description: 'Mekandaki ve bedendeki negatif enerjiyi anında nötrler, ruhsal ağırlığı temizler.',
      element: 'Toprak',
      badge: 'Enerji Temizliği',
      iconText: '🌿',
    },
    {
      id: 'lapis-lazuli',
      name: 'Afgan Lapis Lazuli Hakikat Taşı',
      category: 'Ruhsal Denge Taşı',
      price: 269,
      originalPrice: 380,
      description: 'Boğaz ve zihin çakrasını dengeler. İç huzuru ve dinginliği geri getirir.',
      element: 'Hava',
      badge: 'İçsel Huzur',
      iconText: '🌌',
    },
  ],
};

interface ElementalShopProps {
  pillarType: 'love' | 'career' | 'spirit';
}

export default function ElementalShop({ pillarType }: ElementalShopProps) {
  const [orderedId, setOrderedId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ShopItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const products = ELEMENT_PRODUCTS[pillarType] || ELEMENT_PRODUCTS.love;
  const configuredWhatsappPhone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE?.replace(/\D/g, '') || '';

  const buildOrderText = (product: ShopItem) =>
    `Merhaba! Mystic Tarot üzerinden "${product.name}" (${product.price} TL) siparişi vermek istiyorum. Yardımcı olabilir misiniz?`;

  const handleOrder = (product: ShopItem) => {
    setOrderedId(product.id);
    if (configuredWhatsappPhone) {
      const message = encodeURIComponent(buildOrderText(product));
      const waUrl = `https://wa.me/${configuredWhatsappPhone}?text=${message}`;
      setTimeout(() => {
        window.open(waUrl, '_blank', 'noopener,noreferrer');
        setOrderedId(null);
      }, 300);
      return;
    }

    // WhatsApp numarası tanımlı değilse kopyalanabilir sipariş kartını aç
    setSelectedProduct(product);
    setTimeout(() => setOrderedId(null), 300);
  };

  const handleCopyOrder = async (product: ShopItem) => {
    try {
      await navigator.clipboard.writeText(buildOrderText(product));
      setCopiedId(product.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  return (
    <div className="mt-12 pt-8 border-t border-purple-500/20">
      <div className="text-center max-w-xl mx-auto mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Açılımına Özel Enerji Dengeleyici
        </div>
        <h3 className="font-serif text-2xl text-amber-100">
          Bu Falın Enerjisini Yükseltecek Kristaller
        </h3>
        <p className="text-xs text-zinc-400 mt-2">
          Kartlarının ortaya çıkardığı titreşimi dengelemek ve kehanetin olumlu potansiyelini hayatına çekmek için özenle seçildi.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
        {products.map((item) => (
          <div
            key={item.id}
            className="group relative rounded-2xl bg-gradient-to-b from-[#190c2e]/70 to-[#0e0618]/90 border border-purple-500/20 hover:border-amber-400/40 p-5 transition-all duration-300 hover:shadow-[0_0_25px_rgba(217,119,6,0.15)] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-2xl shadow-inner">
                  {item.iconText}
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-amber-400/10 border border-amber-400/30 text-amber-300">
                  {item.badge}
                </span>
              </div>

              <div className="text-xs text-purple-300/60 uppercase tracking-wider font-medium mb-1">
                {item.category}
              </div>
              <h4 className="font-serif text-lg text-zinc-100 group-hover:text-amber-200 transition-colors mb-2">
                {item.name}
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                {item.description}
              </p>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <div>
                <span className="text-xs text-zinc-500 line-through mr-2">
                  {item.originalPrice} TL
                </span>
                <span className="text-xl font-serif text-amber-300 font-bold">
                  {item.price} TL
                </span>
              </div>

              <button
                onClick={() => handleOrder(item)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold text-xs tracking-wider transition-all shadow-md shadow-amber-500/10 active:scale-95"
              >
                {orderedId === item.id ? (
                  <>
                    <Check className="w-4 h-4" />
                    Yönlendiriliyor...
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    Hemen Satın Al
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Güven Rozeti & Komisyonsuz Açıklaması */}
      <div className="flex items-center justify-center gap-6 mt-6 text-[11px] text-zinc-400 flex-wrap">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          %100 Doğal & Sertifikalı Taşlar
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Adaçayı ile Arındırılmış Gönderim
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MessageCircle className="w-4 h-4 text-purple-400" />
          Doğrudan Sipariş (Komisyonsuz)
        </span>
      </div>

      {/* WhatsApp hattı .env'de tanımlı değilse temiz sipariş özeti paneli */}
      {selectedProduct && (
        <div className="mt-6 max-w-xl mx-auto p-4 rounded-2xl bg-[#130724] border border-amber-400/40 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-serif text-amber-200 font-semibold">
              ✦ {selectedProduct.name} — Sipariş Özeti ({selectedProduct.price} TL)
            </span>
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-zinc-400 leading-relaxed">
            Canlı WhatsApp yönlendirmesi için <code className="text-amber-300">NEXT_PUBLIC_WHATSAPP_PHONE</code> tanımlanabilir. Şimdilik sipariş metnini kopyalayıp doğrudan mağaza hattınıza iletebilirsiniz:
          </p>
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-black/40 border border-purple-500/20 text-zinc-300">
            <span className="truncate">{buildOrderText(selectedProduct)}</span>
            <button
              type="button"
              onClick={() => handleCopyOrder(selectedProduct)}
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/30"
            >
              {copiedId === selectedProduct.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === selectedProduct.id ? 'Kopyalandı' : 'Kopyala'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
