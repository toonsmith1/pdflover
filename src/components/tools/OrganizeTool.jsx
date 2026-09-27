import React, { useState } from 'react';
import DropZone from '../common/DropZone';
import PdfPreview from '../common/PdfPreview';
import DownloadScreen from '../common/DownloadScreen';

export default function OrganizeTool() {
  const [file, setFile] = useState(null);
  const [order, setOrder] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [loadingPages, setLoadingPages] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [step, setStep] = useState('select'); // 'select' | 'organize' | 'download'

  const handleFile = async (files) => {
    if (!files.length) return;
    const selected = files[0];
    setFile(selected);
    setResultUrl('');
    setMessage('');
    setLoadingPages(true);

    const body = new FormData();
    body.append('file', selected);

    try {
      const res = await fetch('/api/pdf-info', { method: 'POST', body });
      if (!res.ok) throw new Error('อ่านจำนวนหน้าไม่ได้');
      const data = await res.json();
      const count = data.pages;
      setOrder(Array.from({ length: count }, (_, i) => i + 1));
      setStep('organize');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoadingPages(false);
    }
  };

  const handleDropPage = (targetIndex) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    setOrder(prev => {
      const next = [...prev];
      const [item] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
    setDraggedIndex(null);
  };

  const handleOrganize = async (e) => {
    e.preventDefault();
    if (!file || !order.length || processing) return;

    setProcessing(true);
    setMessage('');
    const body = new FormData();
    body.append('file', file);
    body.append('order', order.join(','));

    try {
      const res = await fetch('/api/organize', { method: 'POST', body });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setStep('download');
      setMessage('จัดลำดับหน้า PDF เรียบร้อยแล้ว');
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
          : step === 'organize'
          ? '02 / ลากจัดเรียงลำดับหน้า'
          : '03 / เอกสารพร้อมดาวน์โหลด'}
      </p>

      {/* DEDICATED DOWNLOAD SCREEN */}
      {step === 'download' && resultUrl ? (
        <DownloadScreen
          downloadUrl={resultUrl}
          filename={`organized_${file?.name || 'document.pdf'}`}
          title="จัดลำดับหน้า PDF สำเร็จแล้ว!"
          subtitle={`จัดเรียงหน้าเอกสารทั้งหมด ${order.length} หน้าตามลำดับใหม่เรียบร้อย`}
          onBack={() => setStep('organize')}
          backLabel="← กลับไปจัดเรียงใหม่"
          onReset={() => {
            setStep('select');
            setFile(null);
            setOrder([]);
            setResultUrl('');
            setMessage('');
          }}
          resetLabel="จัดเอกสารใหม่"
        />
      ) : (
        <form onSubmit={handleOrganize} className="tool-layout wide">
          <div className="tool-controls">
            <DropZone
              onFilesSelected={handleFile}
              multiple={false}
              label={file ? `${file.name} ${order.length ? `(${order.length} หน้า)` : ''}` : 'ยังไม่ได้เลือกไฟล์'}
            />

            {loadingPages && <p className="message">กำลังอ่านข้อมูลหน้า PDF…</p>}

            {order.length > 0 && (
              <div className="page-order-grid">
                <strong>ลากหน้าเพื่อจัดลำดับ</strong>
                <div className="page-cards">
                  {order.map((page, index) => (
                    <div
                      key={page}
                      className={`page-card ${draggedIndex === index ? 'dragging' : ''}`}
                      draggable
                      onDragStart={() => setDraggedIndex(index)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDropPage(index);
                      }}
                      onDragEnd={() => setDraggedIndex(null)}
                    >
                      <span className="page-number">{page}</span>
                      <b>หน้า {page}</b>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {order.length > 0 && (
              <button
                type="submit"
                className="primary"
                disabled={processing}
              >
                {processing ? 'กำลังจัดลำดับหน้า…' : 'บันทึกลำดับหน้าใหม่'}
              </button>
            )}

            {message && <p className="message">{message}</p>}
          </div>
        </form>
      )}
    </div>
  );
}
