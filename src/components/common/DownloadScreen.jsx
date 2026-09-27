import React, { useState } from 'react';
import {
  Download,
  CheckCircle2,
  RotateCcw,
  Eye,
  EyeOff,
  ExternalLink,
  ArrowLeft,
  FileCheck,
} from 'lucide-react';
import PartnerSpotlight from './PartnerSpotlight';

export default function DownloadScreen({
  downloadUrl,
  filename = 'document.pdf',
  title = 'ไฟล์ของคุณพร้อมดาวน์โหลดแล้ว!',
  subtitle = 'ประมวลผลสำเร็จ ปลอดภัยบนเครื่องของคุณ 100%',
  onReset,
  resetLabel = 'ทำรายการใหม่',
  onBack,
  backLabel = '← กลับไปแก้ไข',
}) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <section className="download-stage" aria-label="หน้าดาวน์โหลดเอกสาร">
      <div className="download-stage-grid">
        {/* Left Side: Success Action Card */}
        <div className="download-main-card">
          <div className="download-card-header">
            <div className="download-success-icon-wrap">
              <CheckCircle2 size={36} color="#436d41" strokeWidth={1.8} />
            </div>
            <div>
              <span className="download-status-tag">ประมวลผลเสร็จสมบูรณ์</span>
              <h2>{title}</h2>
              <p className="download-subtitle">{subtitle}</p>
            </div>
          </div>

          <div className="download-file-info-pill">
            <FileCheck size={16} color="#557551" />
            <span className="download-filename">{filename}</span>
          </div>

          {/* Primary Download Button */}
          <div className="download-action-group">
            <a
              href={downloadUrl}
              download={filename}
              className="button primary download-main-btn"
            >
              <Download size={18} />
              <span>ดาวน์โหลด PDF ทันที</span>
            </a>

            {/* Secondary Actions */}
            <div className="download-secondary-actions">
              <button
                type="button"
                className="button small secondary"
                onClick={() => setShowPreview((prev) => !prev)}
                title={showPreview ? 'ซ่อนหน้าต่างตัวอย่าง' : 'ดูตัวอย่างเอกสาร'}
              >
                {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{showPreview ? 'ซ่อนตัวอย่าง' : 'ดูตัวอย่างเอกสาร'}</span>
              </button>

              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="button small secondary"
                title="เปิดไฟล์ในแท็บใหม่"
              >
                <ExternalLink size={14} />
                <span>เปิดแท็บใหม่</span>
              </a>

              {onBack && (
                <button
                  type="button"
                  className="button small secondary"
                  onClick={onBack}
                >
                  <ArrowLeft size={14} />
                  <span>{backLabel}</span>
                </button>
              )}

              {onReset && (
                <button
                  type="button"
                  className="button small secondary"
                  onClick={onReset}
                >
                  <RotateCcw size={14} />
                  <span>{resetLabel}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: The Ad / Shopee Recommendation / Buy Me a Coffee */}
        <div className="download-spotlight-wrapper">
          <div className="download-spotlight-header">
            <span className="download-spotlight-label">ข้อเสนอแนะนำสำหรับคุณ</span>
          </div>
          <PartnerSpotlight />
        </div>
      </div>

      {/* Collapsible Full Preview */}
      {showPreview && (
        <div className="download-preview-drawer">
          <div className="download-preview-drawer-head">
            <strong>ตัวอย่างเอกสาร ({filename})</strong>
            <button
              type="button"
              className="button small secondary"
              onClick={() => setShowPreview(false)}
            >
              <EyeOff size={13} /> ซ่อนตัวอย่าง
            </button>
          </div>
          <iframe src={downloadUrl} title={`ตัวอย่าง ${filename}`} />
        </div>
      )}
    </section>
  );
}
