import React, { useState, useRef, useEffect } from 'react';
import DropZone from '../common/DropZone';
import PdfPreview from '../common/PdfPreview';
import DownloadScreen from '../common/DownloadScreen';
import { useI18n } from '../../i18n';

export default function MergeTool() {
  const { t, currentLang } = useI18n();
  const [entries, setEntries] = useState([]);
  const [step, setStep] = useState('select'); // 'select' | 'arrange' | 'download'
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [singlePreview, setSinglePreview] = useState(null); // { name, url }
  const [draggedIndex, setDraggedIndex] = useState(null);
  const hiddenAddRef = useRef(null);

  const fileKey = (f) => `${f.name}:${f.size}:${f.lastModified}`;

  const addFiles = (newFiles) => {
    setEntries((prev) => {
      const existingKeys = new Set(prev.map(e => fileKey(e.file)));
      const toAdd = [];
      for (const file of newFiles) {
        if (!existingKeys.has(fileKey(file))) {
          existingKeys.add(fileKey(file));
          toAdd.push({ id: crypto.randomUUID(), file });
        }
      }
      const updated = [...prev, ...toAdd];
      setMessage(`เลือกไว้ ${updated.length} ไฟล์`);
      return updated;
    });
  };

  const removeEntry = (id) => {
    setEntries(prev => {
      const next = prev.filter(e => e.id !== id);
      if (next.length < 2 && step === 'arrange') {
        // If less than 2 files, go back or update
      }
      return next;
    });
    if (singlePreview) {
      URL.revokeObjectURL(singlePreview.url);
      setSinglePreview(null);
    }
  };

  const move = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= entries.length) return;
    setEntries(prev => {
      const copy = [...prev];
      const [item] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, item);
      return copy;
    });
  };

  const handleShowSingle = (entry) => {
    if (singlePreview) {
      URL.revokeObjectURL(singlePreview.url);
    }
    const url = URL.createObjectURL(entry.file);
    setSinglePreview({ name: entry.file.name, url });
  };

  const handleCloseSingle = () => {
    if (singlePreview) {
      URL.revokeObjectURL(singlePreview.url);
      setSinglePreview(null);
    }
  };

  const handleMerge = async (e) => {
    e.preventDefault();
    if (entries.length < 2 || processing) return;

    setProcessing(true);
    setMessage('');
    const body = new FormData();
    entries.forEach(e => body.append('files', e.file));

    try {
      const res = await fetch('/api/merge', { method: 'POST', body });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setStep('download');
      setMessage(`รวม ${entries.length} ไฟล์เรียบร้อย พร้อมดาวน์โหลดแล้ว`);
    } catch (err) {
      setMessage(`รวมไฟล์ไม่สำเร็จ: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (singlePreview) URL.revokeObjectURL(singlePreview.url);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, []);

  return (
    <div className="panel merge-flow">
      <p className="merge-step">
        {step === 'select'
          ? t('mergeTool.stepSelect')
          : step === 'arrange'
          ? t('mergeTool.stepArrange')
          : t('common.stepDownload')}
      </p>

      {step === 'download' && resultUrl ? (
        <DownloadScreen
          downloadUrl={resultUrl}
          filename="merged.pdf"
          title={t('mergeTool.successTitle')}
          subtitle={t('mergeTool.successSubtitle', { count: entries.length })}
          onBack={() => setStep('arrange')}
          backLabel={t('mergeTool.backLabel')}
          onReset={() => {
            setStep('select');
            setEntries([]);
            setResultUrl('');
            setMessage('');
          }}
          resetLabel={t('mergeTool.resetLabel')}
        />
      ) : step === 'select' ? (
        <div className="tool-controls">
          <DropZone
            onFilesSelected={addFiles}
            multiple={true}
            buttonText={currentLang === 'ja' ? '＋ PDFを選択' : currentLang === 'en' ? '＋ Select PDFs' : '＋ เลือกไฟล์ PDF'}
            hintText={currentLang === 'ja' ? 'PDFファイルをここにドラッグ＆ドロップ' : currentLang === 'en' ? 'Drag and drop PDF files here' : 'ลากไฟล์ PDF มาวางที่นี่'}
            label={
              entries.length
                ? t('mergeTool.selectedCount', { count: entries.length })
                : t('mergeTool.noFiles')
            }
          />
          <button
            type="button"
            className="primary merge-next"
            disabled={entries.length < 2}
            onClick={() => setStep('arrange')}
          >
            {t('mergeTool.btnArrange')}
          </button>
          {message && <p className="message">{message}</p>}
        </div>
      ) : (
        <form onSubmit={handleMerge} className="merge-workspace">
          <div className="merge-toolbar">
            <button
              type="button"
              onClick={() => {
                setStep('select');
                handleCloseSingle();
              }}
            >
              {t('common.changeFile')}
            </button>
            <button
              type="button"
              onClick={() => hiddenAddRef.current?.click()}
            >
              {t('mergeTool.addMoreFiles')}
            </button>
            <input
              ref={hiddenAddRef}
              type="file"
              accept="application/pdf"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files.length) {
                  addFiles(Array.from(e.target.files));
                }
                e.target.value = '';
              }}
            />
          </div>

          <p aria-live="polite">
            {t('mergeTool.summary', { count: entries.length })}
          </p>

          <div className="merge-file-grid">
            {entries.map((entry, index) => (
              <article
                key={entry.id}
                className={`merge-file-card ${draggedIndex === index ? 'dragging' : ''}`}
                draggable
                onDragStart={() => setDraggedIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedIndex !== null && draggedIndex !== index) {
                    move(draggedIndex, index);
                  }
                  setDraggedIndex(null);
                }}
                onDragEnd={() => setDraggedIndex(null)}
              >
                <strong>{index + 1}. PDF</strong>
                <p>{entry.file.name}</p>
                <small>{(entry.file.size / 1048576).toFixed(1)} MB</small>
                <div>
                  <button
                    type="button"
                    aria-label={t('mergeTool.moveUp')}
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    aria-label={t('mergeTool.moveDown')}
                    disabled={index === entries.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    →
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShowSingle(entry)}
                  >
                    {t('mergeTool.preview')}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.id)}
                  >
                    {t('mergeTool.remove')}
                  </button>
                </div>
              </article>
            ))}
          </div>

          {singlePreview && (
            <div className="merge-single-viewer">
              <div className="merge-single-viewer-head">
                <strong>{singlePreview.name}</strong>
                <button type="button" onClick={handleCloseSingle}>
                  {t('mergeTool.closePreview')}
                </button>
              </div>
              <iframe src={singlePreview.url} title={singlePreview.name} />
            </div>
          )}

          <div style={{ marginTop: '20px', marginBottom: '20px' }}>
            <button
              type="submit"
              className="primary"
              disabled={processing || entries.length < 2}
            >
              {processing ? t('mergeTool.processing') : t('mergeTool.btnMerge', { count: entries.length })}
            </button>
            {message && <p className="message">{message}</p>}
          </div>
        </form>
      )}
    </div>
  );
}
