import React, { useState, useEffect } from 'react';
import { Download, ExternalLink, Maximize2, Minimize2, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function PdfPreview({
  previewUrl,
  downloadFilename,
  metaText = 'ตัวอย่างเอกสาร',
  onBack,
  backLabel = '← กลับไปแก้ไข',
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('preview-expanded', isExpanded);
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('preview-expanded');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded]);

  if (!previewUrl) return null;

  return (
    <div className={`preview ${isExpanded ? 'is-expanded' : ''}`}>
      <div className="preview-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onBack && (
            <button type="button" className="button small secondary" onClick={onBack}>
              <ArrowLeft size={14} /> {backLabel}
            </button>
          )}
          <span className="preview-meta-pill">
            <CheckCircle2 size={14} color="#557551" /> {metaText}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="button small secondary"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((prev) => !prev)}
            title={isExpanded ? 'ย่อกลับ (Esc)' : 'ขยายเต็มจอ'}
          >
            {isExpanded ? (
              <>
                <Minimize2 size={14} /> ย่อกลับ (Esc)
              </>
            ) : (
              <>
                <Maximize2 size={14} /> ขยายเต็มจอ
              </>
            )}
          </button>

          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="button small secondary"
            title="เปิดในแท็บใหม่"
          >
            <ExternalLink size={14} /> เปิดแท็บใหม่
          </a>

          {downloadFilename && (
            <a
              href={previewUrl}
              download={downloadFilename}
              className="button small primary"
            >
              <Download size={14} /> ดาวน์โหลด PDF
            </a>
          )}
        </div>
      </div>

      <iframe src={previewUrl} title="ตัวอย่าง PDF" />
    </div>
  );
}
