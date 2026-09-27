import React, { useState } from 'react';
import DropZone from '../common/DropZone';
import PdfPreview from '../common/PdfPreview';
import DownloadScreen from '../common/DownloadScreen';

export default function SplitTool() {
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
          ? '01 / เลือกเอกสาร'
          : step === 'configure'
          ? '02 / กำหนดหน้าที่ต้องการแยก'
          : '03 / เอกสารพร้อมดาวน์โหลด'}
      </p>

      {/* DEDICATED STAGE: Download Screen with Ad */}
      {step === 'download' && resultUrl ? (
        <DownloadScreen
          downloadUrl={resultUrl}
          filename={`split_${file?.name || 'document.pdf'}`}
          title="แยกหน้า PDF สำเร็จแล้ว!"
          subtitle={`แยกหน้าที่ระบุ (${pages}) ${totalPages ? `จากทั้งหมด ${totalPages} หน้า ` : ''}ออกมาเป็นไฟล์ใหม่เรียบร้อย`}
          onBack={() => setStep('configure')}
          backLabel="← กลับไปตั้งค่าหน้า"
          onReset={() => {
            setStep('select');
            setFile(null);
            setPages('1');
            setTotalPages(null);
            setResultUrl('');
            setMessage('');
          }}
          resetLabel="แยกไฟล์ใหม่"
        />
      ) : step === 'select' ? (
        <div className="tool-controls">
          <DropZone
            onFilesSelected={handleFile}
            multiple={false}
            label={
              file
                ? `${file.name} ${totalPages ? `(เอกสารมี ${totalPages} หน้า)` : ''}`
                : 'ยังไม่ได้เลือกไฟล์'
            }
          />
          <button
            type="button"
            className="primary merge-next"
            disabled={!file}
            onClick={() => setStep('configure')}
          >
            ตั้งค่าและดูตัวอย่าง →
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
              ← กลับไปเปลี่ยนไฟล์
            </button>

            <label id="pages-field">
              <span>
                หน้าที่ต้องการแยก {totalPages ? `(เอกสารมี ${totalPages} หน้า)` : ''}
              </span>
              <input
                id="pages"
                name="pages"
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                placeholder="เช่น 1, 3, 5 หรือ 1-5"
              />
              <small style={{ color: 'var(--muted-foreground)', fontSize: '12px', marginTop: '2px' }}>
                💡 ระบุเป็นรายหน้า เช่น <code>1, 3, 5</code> หรือระบุเป็นช่วง เช่น <code>1-5</code>
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
                  เฉพาะหน้า 1
                </button>
                {totalPages >= 3 && (
                  <button
                    type="button"
                    className="button small secondary"
                    style={{ fontSize: '12px', padding: '3px 8px' }}
                    onClick={() => setPages('1-3')}
                  >
                    3 หน้าแรก (1-3)
                  </button>
                )}
                <button
                  type="button"
                  className="button small secondary"
                  style={{ fontSize: '12px', padding: '3px 8px' }}
                  onClick={() => setPages(`1-${totalPages}`)}
                >
                  ทั้งหมด (1-{totalPages})
                </button>
              </div>
            )}

            <button
              type="submit"
              className="primary"
              id="run"
              disabled={processing}
            >
              {processing ? 'กำลังประมวลผล…' : 'เริ่มแยกหน้าเอกสาร'}
            </button>

            {message && <p className="message">{message}</p>}
          </div>

          <PdfPreview
            previewUrl={sourcePreviewUrl}
            metaText="ตัวอย่างไฟล์ต้นฉบับ"
          />
        </form>
      )}
    </div>
  );
}
