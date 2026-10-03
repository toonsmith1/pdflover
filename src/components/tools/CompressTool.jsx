import React, { useState } from 'react';
import DropZone from '../common/DropZone';
import PdfPreview from '../common/PdfPreview';
import DownloadScreen from '../common/DownloadScreen';
import { useI18n } from '../../i18n/LanguageContext';

export default function CompressTool() {
  const { t, lang } = useI18n();
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('select'); // 'select' | 'configure' | 'download'
  const [quality, setQuality] = useState('balanced');
  const [fileSizes, setFileSizes] = useState({ original: 0, compressed: 0 });
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState('');

  const handleFile = (files) => {
    if (files.length > 0) {
      setFile(files[0]);
      setFileSizes({ original: files[0].size, compressed: 0 });
      if (sourcePreviewUrl) URL.revokeObjectURL(sourcePreviewUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setSourcePreviewUrl(URL.createObjectURL(files[0]));
      setResultUrl('');
      setMessage('');
    }
  };

  const handleBackToSelect = () => {
    setStep('select');
  };

  const handleProcess = async (e) => {
    e.preventDefault();
    if (!file || processing) return;

    setProcessing(true);
    setMessage('');
    const body = new FormData();
    body.append('file', file);
    body.append('quality', quality);

    try {
      const res = await fetch('/api/compress', { method: 'POST', body });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      setFileSizes((prev) => ({ ...prev, compressed: blob.size }));
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setStep('download');
      setMessage('บีบอัดไฟล์เรียบร้อยแล้ว');
    } catch (err) {
      setMessage(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const savedPct =
    fileSizes.original && fileSizes.compressed
      ? Math.max(0, Math.round((1 - fileSizes.compressed / fileSizes.original) * 100))
      : null;

  const subtitleText =
    savedPct !== null && fileSizes.original > 0
      ? (lang === 'ja'
          ? `ファイルサイズを ${(fileSizes.original / 1048576).toFixed(2)} MB から ${(fileSizes.compressed / 1048576).toFixed(2)} MB に縮小 (${savedPct}% 削減)`
          : lang === 'en'
          ? `File size reduced from ${(fileSizes.original / 1048576).toFixed(2)} MB to ${(fileSizes.compressed / 1048576).toFixed(2)} MB (${savedPct}% saved)`
          : `ขนาดไฟล์ลดลงจาก ${(fileSizes.original / 1048576).toFixed(2)} MB เหลือ ${(fileSizes.compressed / 1048576).toFixed(2)} MB (ประหยัดพื้นที่ได้ ${savedPct}%)`)
      : (lang === 'ja'
          ? 'ファイルが効率的に圧縮されました。すぐにダウンロードできます。'
          : lang === 'en'
          ? 'File compressed efficiently and ready to download.'
          : 'ไฟล์ถูกบีบอัดให้มีขนาดเล็กลงอย่างมีประสิทธิภาพ พร้อมดาวน์โหลดทันที');

  return (
    <div className="panel">
      <p className="merge-step">
        {step === 'select'
          ? t('common.stepSelect')
          : step === 'configure'
          ? t('compressTool.stepConfigure')
          : t('common.stepDownload')}
      </p>

      {/* DEDICATED STAGE: Download Screen with Ad & Stats */}
      {step === 'download' && resultUrl ? (
        <DownloadScreen
          downloadUrl={resultUrl}
          filename={`compressed_${file?.name || 'document.pdf'}`}
          title={lang === 'ja' ? 'PDF圧縮が完了しました！' : lang === 'en' ? 'PDF Compressed Successfully!' : 'ลดขนาดไฟล์ PDF สำเร็จแล้ว!'}
          subtitle={subtitleText}
          onBack={() => setStep('configure')}
          onReset={() => {
            setStep('select');
            setFile(null);
            setResultUrl('');
            setMessage('');
          }}
        />
      ) : step === 'select' ? (
        <div className="tool-controls">
          <DropZone
            onFilesSelected={handleFile}
            multiple={false}
            label={file ? file.name : undefined}
          />
          <button
            type="button"
            className="primary merge-next"
            disabled={!file}
            onClick={() => setStep('configure')}
          >
            {t('common.configureAndPreview')}
          </button>
        </div>
      ) : (
        <form onSubmit={handleProcess} className="tool-layout">
          <div className="tool-controls">
            <button
              type="button"
              className="back"
              onClick={handleBackToSelect}
            >
              {t('common.changeFile')}
            </button>

            <label id="quality-field">
              <span>{t('compressTool.qualityLabel')}</span>
              <select
                id="quality"
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
              >
                <option value="low">{t('compressTool.qualityLow')}</option>
                <option value="balanced">{t('compressTool.qualityBalanced')}</option>
                <option value="high">{t('compressTool.qualityHigh')}</option>
              </select>
            </label>

            <button
              type="submit"
              className="primary"
              id="run"
              disabled={processing}
            >
              {processing ? t('compressTool.processing') : t('compressTool.btnCompress')}
            </button>

            {message && <p className="message">{message}</p>}
          </div>

          <PdfPreview
            previewUrl={sourcePreviewUrl}
            metaText={lang === 'ja' ? '元のドキュメントのプレビュー' : lang === 'en' ? 'Original Document Preview' : 'ตัวอย่างไฟล์ต้นฉบับ'}
          />
        </form>
      )}
    </div>
  );
}
