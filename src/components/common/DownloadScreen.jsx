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
import { useI18n } from '../../i18n/LanguageContext';
import PartnerSpotlight from './PartnerSpotlight';

export default function DownloadScreen({
  downloadUrl,
  filename = 'document.pdf',
  title,
  subtitle,
  onReset,
  resetLabel,
  onBack,
  backLabel,
}) {
  const { t } = useI18n();
  const [showPreview, setShowPreview] = useState(false);

  const resolvedTitle = title || t('download.title');
  const resolvedSubtitle = subtitle || t('download.subtitle');
  const resolvedResetLabel = resetLabel || t('download.reset');
  const resolvedBackLabel = backLabel || t('download.back');

  return (
    <section className="download-stage" aria-label="Download section">
      <div className="download-stage-grid">
        {/* Left Side: Success Action Card */}
        <div className="download-main-card">
          <div className="download-card-header">
            <div className="download-success-icon-wrap">
              <CheckCircle2 size={36} color="#436d41" strokeWidth={1.8} />
            </div>
            <div>
              <span className="download-status-tag">{t('download.statusTag')}</span>
              <h2>{resolvedTitle}</h2>
              <p className="download-subtitle">{resolvedSubtitle}</p>
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
              <span>{t('download.downloadBtn')}</span>
            </a>

            {/* Secondary Actions */}
            <div className="download-secondary-actions">
              <button
                type="button"
                className="button small secondary"
                onClick={() => setShowPreview((prev) => !prev)}
                title={showPreview ? t('download.hidePreview') : t('download.showPreview')}
              >
                {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{showPreview ? t('download.hidePreview') : t('download.showPreview')}</span>
              </button>

              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="button small secondary"
                title={t('download.newTab')}
              >
                <ExternalLink size={14} />
                <span>{t('download.newTab')}</span>
              </a>

              {onBack && (
                <button
                  type="button"
                  className="button small secondary"
                  onClick={onBack}
                >
                  <ArrowLeft size={14} />
                  <span>{resolvedBackLabel}</span>
                </button>
              )}

              {onReset && (
                <button
                  type="button"
                  className="button small secondary"
                  onClick={onReset}
                >
                  <RotateCcw size={14} />
                  <span>{resolvedResetLabel}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Spotlight / Support */}
        <div className="download-spotlight-wrapper">
          <PartnerSpotlight />
        </div>
      </div>

      {/* Collapsible Full Preview */}
      {showPreview && (
        <div className="download-preview-drawer">
          <div className="download-preview-drawer-head">
            <strong>{t('download.previewHeading', { filename })}</strong>
            <button
              type="button"
              className="button small secondary"
              onClick={() => setShowPreview(false)}
            >
              <EyeOff size={13} /> {t('download.hidePreview')}
            </button>
          </div>
          <iframe src={downloadUrl} title={`preview ${filename}`} />
        </div>
      )}
    </section>
  );
}
