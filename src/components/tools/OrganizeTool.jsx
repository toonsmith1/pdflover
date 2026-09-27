import React, { useState } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  ArrowUpDown,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileCheck,
  Sparkles,
} from 'lucide-react';
import DropZone from '../common/DropZone';
import DownloadScreen from '../common/DownloadScreen';

export default function OrganizeTool() {
  const [file, setFile] = useState(null);
  const [order, setOrder] = useState([]); // array of 1-based original page numbers
  const [thumbnails, setThumbnails] = useState([]); // array of base64 data URLs
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
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
      const res = await fetch('/api/pdf-thumbnails', { method: 'POST', body });
      if (!res.ok) throw new Error('ไม่สามารถโหลดภาพหน้าเอกสารได้');
      const data = await res.json();
      const count = data.pages;
      setThumbnails(data.thumbnails || []);
      setOrder(Array.from({ length: count }, (_, i) => i + 1));
      setStep('organize');
    } catch (err) {
      setMessage(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setLoadingPages(false);
    }
  };

  const handleMovePage = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= order.length) return;
    setOrder((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });
  };

  const handleDeletePage = (index) => {
    if (order.length <= 1) {
      setMessage('เอกสารต้องมีอย่างน้อย 1 หน้า');
      return;
    }
    setOrder((prev) => prev.filter((_, i) => i !== index));
    setMessage('');
  };

  const handleResetOrder = () => {
    setOrder(Array.from({ length: thumbnails.length }, (_, i) => i + 1));
    setMessage('');
  };

  const handleReverseOrder = () => {
    setOrder((prev) => [...prev].reverse());
    setMessage('');
  };

  const handleDropPage = (targetIndex) => {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    handleMovePage(draggedIndex, targetIndex);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleOrganize = async (e) => {
    if (e) e.preventDefault();
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

      {/* STAGE 3: DEDICATED DOWNLOAD SCREEN */}
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
            setThumbnails([]);
            setResultUrl('');
            setMessage('');
          }}
          resetLabel="จัดเอกสารใหม่"
        />
      ) : step === 'select' ? (
        /* STAGE 1: FILE SELECTION */
        <div className="tool-controls">
          <DropZone
            onFilesSelected={handleFile}
            multiple={false}
            label={file ? file.name : 'ยังไม่ได้เลือกไฟล์'}
          />
          {loadingPages && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '16px',
                color: 'var(--muted-foreground)',
              }}
            >
              <Loader2 size={18} className="spin" />
              <span>กำลังโหลดภาพหน้าตัวอย่างเอกสารทั้งหมด…</span>
            </div>
          )}
          {message && <p className="message">{message}</p>}
        </div>
      ) : (
        /* STAGE 2: VISUAL THUMBNAIL ORGANIZER */
        <div className="organize-workspace">
          {/* Top Control Bar */}
          <div className="organize-toolbar">
            <div className="organize-toolbar-left">
              <button
                type="button"
                className="button small secondary"
                onClick={() => setStep('select')}
              >
                <ArrowLeft size={14} />
                <span>เปลี่ยนไฟล์</span>
              </button>
              <div className="organize-file-info">
                <FileCheck size={15} color="#456847" />
                <strong>{file?.name}</strong>
                <span className="organize-page-count">
                  ({order.length} หน้า)
                </span>
              </div>
            </div>

            <div className="organize-toolbar-right">
              <button
                type="button"
                className="button small secondary"
                onClick={handleReverseOrder}
                title="กลับลำดับหน้าจากหลังมาหน้า"
              >
                <ArrowUpDown size={13} />
                <span>กลับลำดับหน้า</span>
              </button>
              <button
                type="button"
                className="button small secondary"
                onClick={handleResetOrder}
                title="รีเซ็ตกลับเป็นลำดับเดิม"
              >
                <RotateCcw size={13} />
                <span>รีเซ็ตลำดับเดิม</span>
              </button>
            </div>
          </div>

          <div className="organize-hint-banner">
            <span>💡 ลากภาพเพื่อสลับตำแหน่ง หรือใช้ลูกศรซ้าย-ขวาบนการ์ดแต่ละหน้า</span>
          </div>

          {/* Visual Grid with Real Page Thumbnails */}
          <div className="organize-grid">
            {order.map((pageNumber, index) => {
              const thumbUrl = thumbnails[pageNumber - 1];
              const isDragging = draggedIndex === index;
              const isDragOver = dragOverIndex === index;

              return (
                <div
                  key={`${pageNumber}-${index}`}
                  className={`organize-card ${isDragging ? 'is-dragging' : ''} ${
                    isDragOver ? 'is-drag-over' : ''
                  }`}
                  draggable
                  onDragStart={(e) => {
                    setDraggedIndex(index);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverIndex !== index) setDragOverIndex(index);
                  }}
                  onDragLeave={() => {
                    if (dragOverIndex === index) setDragOverIndex(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDropPage(index);
                  }}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                >
                  {/* Card Header: Position Badge & Delete */}
                  <div className="organize-card-header">
                    <span className="organize-badge-pos">
                      หน้า {index + 1}
                    </span>
                    <button
                      type="button"
                      className="organize-delete-btn"
                      onClick={() => handleDeletePage(index)}
                      title={`ลบหน้านี้ออก (เดิมหน้า ${pageNumber})`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Thumbnail Image */}
                  <div className="organize-thumb-container">
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={`ภาพหน้า ${pageNumber}`}
                        className="organize-thumb-img"
                        loading="lazy"
                        draggable={false}
                      />
                    ) : (
                      <div className="organize-thumb-empty">
                        <span>หน้า {pageNumber}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Original Label & Nudge Buttons */}
                  <div className="organize-card-footer">
                    <button
                      type="button"
                      className="organize-nudge-btn"
                      disabled={index === 0}
                      onClick={() => handleMovePage(index, index - 1)}
                      title="เลื่อนไปข้างหน้า"
                    >
                      <ChevronLeft size={14} />
                    </button>

                    <span className="organize-orig-label">
                      เดิม: หน้า {pageNumber}
                    </span>

                    <button
                      type="button"
                      className="organize-nudge-btn"
                      disabled={index === order.length - 1}
                      onClick={() => handleMovePage(index, index + 1)}
                      title="เลื่อนไปข้างหลัง"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Save Action Bar */}
          <div className="organize-bottom-bar">
            <span className="organize-summary-text">
              ✨ ลำดับใหม่: {order.join(' → ')}
            </span>

            <button
              type="button"
              className="button primary organize-save-btn"
              disabled={processing}
              onClick={handleOrganize}
            >
              {processing ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>กำลังบันทึกลำดับหน้า…</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>บันทึกลำดับหน้าใหม่ ({order.length} หน้า)</span>
                </>
              )}
            </button>
          </div>

          {message && <p className="message">{message}</p>}
        </div>
      )}
    </div>
  );
}
