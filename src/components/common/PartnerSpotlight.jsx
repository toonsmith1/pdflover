import React, { useState, useEffect } from 'react';
import { ExternalLink, Coffee, ShoppingBag, ShieldCheck, Tag, ArrowRight } from 'lucide-react';

const DEFAULT_CONFIG = {
  enabled: true,
  partner: {
    type: 'product',
    badge: 'SHOPEE แนะนำ',
    tag: 'ส่งฟรี 🚚 • Shopee Mall',
    title: 'กระดาษ Double A 80 แกรม A4 (กล่อง 5 รีม)',
    desc: 'กระดาษเนื้อหนา เรียบเนียน พิมพ์งานและเอกสารคมชัด ไม่ติดขัดในเครื่องปริ้นต์',
    price: '฿489',
    originalPrice: '฿560',
    image: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=180&auto=format&fit=crop&q=80',
    buttonText: 'ซื้อใน Shopee',
    targetUrl: 'https://shopee.co.th',
  },
  support: {
    type: 'coffee',
    badge: 'สนับสนุนผู้พัฒนา',
    tag: '🔒 100% Local & Free',
    title: 'ชอบที่เอกสารไม่ออกนอกเครื่อง?',
    desc: 'ร่วมเป็นกำลังใจให้เราพัฒนาเครื่องมือ PDF ปลอดภัยและฟรีแบบนี้ต่อไป',
    buttonText: 'เลี้ยงกาแฟผู้พัฒนา ☕',
    targetUrl: 'https://buymeacoffee.com',
  },
};

export default function PartnerSpotlight() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [imageError, setImageError] = useState(false);
  const [previewMode, setPreviewMode] = useState(null); // 'shopee' | 'coffee' | null (auto)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    try {
      const cached = localStorage.getItem('pdflover_partner_cache');
      if (cached) {
        const { timestamp, data } = JSON.parse(cached);
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          setConfig(data);
        }
      }
    } catch {
      // Ignore localStorage errors
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Determine active view: manual preview override OR automatic network detection
  const isPartner = previewMode === 'coffee' ? false : (previewMode === 'shopee' ? true : (isOnline && config.enabled));
  const content = isPartner ? config.partner : config.support;

  return (
    <aside
      className={`spotlight-card ${isPartner ? 'is-partner is-shopee' : 'is-support'}`}
      aria-label="แนะนำพาร์ทเนอร์หรือสนับสนุน"
    >
      {/* Card Header with Badges */}
      <div className="spotlight-header">
        <span className="spotlight-badge">
          {isPartner ? <ShoppingBag size={12} /> : <Coffee size={12} />}
          {content.badge}
        </span>
        <span className="spotlight-tag">
          {content.tag}
        </span>
      </div>

      {/* Main Content: Thumbnail + Text Details */}
      <div className="spotlight-content-row">
        {isPartner && content.image && !imageError && (
          <div className="spotlight-thumb-wrapper">
            <img
              src={content.image}
              alt={content.title}
              className="spotlight-thumb"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          </div>
        )}

        <div className="spotlight-body">
          <strong className="spotlight-title">{content.title}</strong>
          <p className="spotlight-desc">{content.desc}</p>

          {isPartner && content.price && (
            <div className="spotlight-price-row">
              <span className="spotlight-price">{content.price}</span>
              {content.originalPrice && (
                <span className="spotlight-original-price">{content.originalPrice}</span>
              )}
              <span className="spotlight-deal-badge">ลดพิเศษ</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer: Action Link + Test Switcher */}
      <div className="spotlight-footer">
        {/* Toggle to let user preview both Shopee & Buy Me a Coffee easily */}
        <button
          type="button"
          className="spotlight-switch-btn"
          onClick={() => setPreviewMode((prev) => (prev === 'coffee' ? 'shopee' : 'coffee'))}
          title="คลิกเพื่อสลับดูการ์ดทั้งสองแบบ"
        >
          {isPartner ? '☕ ดูแบบกาแฟ' : '🛍️ ดูแบบ Shopee'}
        </button>

        <a
          href={content.targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="spotlight-action-btn"
        >
          <span>{content.buttonText}</span>
          <ArrowRight size={13} />
        </a>
      </div>
    </aside>
  );
}
