import React, { useState } from 'react';
import DropZone from '../common/DropZone';
import PdfPreview from '../common/PdfPreview';

export default function RotateTool() {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('select');
  const [degrees, setDegrees] = useState('90');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState('');

  const handleFile = (files) => {
    if (files.length > 0) {
      setFile(files[0]);
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
    body.append('degrees', degrees);

    try {
      const res = await fetch('/api/rotate', { method: 'POST', body });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setMessage('ประมวลผลเสร็จแล้ว แสดงตัวอย่างก่อนดาวน์โหลด');
    } catch (err) {
      setMessage(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="panel">
      <p className="merge-step">
        {step === 'select' ? '01 / เลือกเอกสาร' : '02 / ตั้งค่าและดูตัวอย่าง'}
      </p>

      {step === 'select' ? (
        <div className="tool-controls">
          <DropZone
            onFilesSelected={handleFile}
            multiple={false}
            label={file ? file.name : 'ยังไม่ได้เลือกไฟล์'}
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

            <label id="degrees-field">
              <span>องศา</span>
              <select
                id="degrees"
                value={degrees}
                onChange={(e) => setDegrees(e.target.value)}
              >
                <option value="90">90°</option>
                <option value="180">180°</option>
                <option value="270">270°</option>
              </select>
            </label>

            <button
              type="submit"
              className="primary"
              id="run"
              disabled={processing}
            >
              {processing ? 'กำลังประมวลผล…' : resultUrl ? 'ประมวลผลอีกครั้ง' : 'เริ่มประมวลผล'}
            </button>

            {message && <p className={`message ${resultUrl ? 'success' : ''}`}>{message}</p>}
          </div>

          <PdfPreview
            previewUrl={resultUrl || sourcePreviewUrl}
            downloadFilename={resultUrl ? 'rotated.pdf' : null}
            metaText={resultUrl ? 'ผลลัพธ์พร้อมตรวจสอบ' : 'ตัวอย่างไฟล์ต้นฉบับ'}
          />
        </form>
      )}
    </div>
  );
}
