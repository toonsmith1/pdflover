import React, { useState } from 'react';
import DropZone from '../common/DropZone';
import PdfPreview from '../common/PdfPreview';
import DownloadScreen from '../common/DownloadScreen';
import { useI18n } from '../../i18n/LanguageContext';

export default function SplitTool() {
  const { t, lang } = useI18n();
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('select'); // 'select' | 'configure' | 'download'
  const [pages, setPages] = useState('1');
  const [totalPages, setTotalPages] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState('');

  const handleFile = async (files) => {
    if (!files.length) return;
    const selected = files[0];
    setFile(selected);
    if (sourcePreviewUrl) URL.revokeObjectURL(sourcePreviewUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setSourcePreviewUrl(URL.createObjectURL(selected));
    setResultUrl('');
    setMessage('');

    // Fetch page count info
    const body = new FormData();
    body.append('file', selected);
    try {
      const res = await fetch('/api/pdf-info', { method: 'POST', body });
      if (res.ok) {
        const data = await res.json();
        setTotalPages(data.pages);
      }
    } catch {
      // Ignore info fetch error
    }
  };

  const handleBackToSelect = () => {
    setStep('select');
  };

  const handleProcess = async (e) => {
    e.preventDefault();
    if (!file || processing) return;

    if (!pages.trim()) {
      setMessage('กรุณาระบุหน้าที่ต้องการแยก เช่น 1, 3, 5 หรือ 1-5');
      return;
    }

    setProcessing(true);
    setMessage('');
    const body = new FormData();
    body.append('file', file);
    body.append('pages', pages);

    try {
      const res = await fetch('/api/split', { method: 'POST', body });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setStep('download');
      setMessage('แยกหน้า PDF เรียบร้อยแล้ว');
    } catch (err) {
      setMessage(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="panel">
      <p className="merge-step">
        {step === 'select'
          ? t('common.stepSelect')
          : step === 'configure'
          ? t('splitTool.stepConfigure')
          : t('common.stepDownload')}
      </p>

      {/* DEDICATED STAGE: Download Screen with Ad */}
      {step === 'download' && resultUrl ? (
        <DownloadScreen
          downloadUrl={resultUrl}
          filename={`split_${file?.name || 'document.pdf'}`}
          title={lang === 'ja' ? 'PDF分割が完了しました！' : lang === 'en' ? 'PDF Pages Extracted Successfully!' : 'แยกหน้า PDF สำเร็จแล้ว!'}
          subtitle={lang === 'ja' ? `指定されたページ (${pages}) を新しいファイルとして抽出しました` : lang === 'en' ? `Extracted specified pages (${pages}) into a new document` : `แยกหน้าที่ระบุ (${pages}) ${totalPages ? `จากทั้งหมด ${totalPages} หน้า ` : ''}ออกมาเป็นไฟล์ใหม่เรียบร้อย`}
          onBack={() => setStep('configure')}
          onReset={() => {
            setStep('select');
            setFile(null);
            setPages('1');
            setTotalPages(null);
            setResultUrl('');
            setMessage('');
          }}
        />
      ) : step === 'select' ? (
        <div className="tool-controls">
          <DropZone
            onFilesSelected={handleFile}
            multiple={false}
            label={
              file
                ? `${file.name} ${totalPages ? (lang === 'ja' ? `(全 ${totalPages} ページ)` : lang === 'en' ? `(${totalPages} pages)` : `(เอกสารมี ${totalPages} หน้า)`) : ''}`
                : undefined
            }
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

            <label id="pages-field">
              <span>
                {t('splitTool.pagesLabel')} {totalPages ? (lang === 'ja' ? `(全 ${totalPages} ページ)` : lang === 'en' ? `(${totalPages} pages)` : `(เอกสารมี ${totalPages} หน้า)`) : ''}
              </span>
              <input
                id="pages"
                name="pages"
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                placeholder={lang === 'ja' ? '例: 1, 3, 5 または 1-5' : lang === 'en' ? 'e.g. 1, 3, 5 or 1-5' : 'เช่น 1, 3, 5 หรือ 1-5'}
              />
              <small style={{ color: 'var(--muted-foreground)', fontSize: '12px', marginTop: '2px' }}>
                💡 {lang === 'ja' ? <>個別指定は <code>1, 3, 5</code>、範囲指定は <code>1-5</code> と入力</> : lang === 'en' ? <>Specify individual pages like <code>1, 3, 5</code> or ranges like <code>1-5</code></> : <>ระบุเป็นรายหน้า เช่น <code>1, 3, 5</code> หรือระบุเป็นช่วง เช่น <code>1-5</code></>}
              </small>
            </label>

            {/* Quick Presets */}
            {totalPages && totalPages > 1 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="button small secondary"
                  style={{ fontSize: '12px', padding: '3px 8px' }}
                  onClick={() => setPages('1')}
                >
                  {lang === 'ja' ? '1ページ目のみ' : lang === 'en' ? 'Page 1 only' : 'เฉพาะหน้า 1'}
                </button>
                {totalPages >= 3 && (
                  <button
                    type="button"
                    className="button small secondary"
                    style={{ fontSize: '12px', padding: '3px 8px' }}
                    onClick={() => setPages('1-3')}
                  >
                    {lang === 'ja' ? '最初の3ページ (1-3)' : lang === 'en' ? 'First 3 pages (1-3)' : '3 หน้าแรก (1-3)'}
                  </button>
                )}
                <button
                  type="button"
                  className="button small secondary"
                  style={{ fontSize: '12px', padding: '3px 8px' }}
                  onClick={() => setPages(`1-${totalPages}`)}
                >
                  {lang === 'ja' ? `全ページ (1-${totalPages})` : lang === 'en' ? `All pages (1-${totalPages})` : `ทั้งหมด (1-${totalPages})`}
                </button>
              </div>
            )}

            <button
              type="submit"
              className="primary"
              id="run"
              disabled={processing}
            >
              {processing ? t('splitTool.processing') : t('splitTool.btnSplit')}
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
