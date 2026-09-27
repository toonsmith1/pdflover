import React, { useState, useEffect } from 'react';
import {
  RotateCw,
  RotateCcw,
  RefreshCw,
  Rotate3D,
  Undo2,
  ArrowLeft,
  ArrowRight,
  FileCheck,
  Sparkles,
  Layers,
  FileText,
  Filter,
} from 'lucide-react';
import DropZone from '../common/DropZone';
import DownloadScreen from '../common/DownloadScreen';

export default function RotateTool() {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('select'); // 'select' | 'rotate' | 'download'
  const [thumbnails, setThumbnails] = useState([]); // array of base64 data URLs
  const [rotations, setRotations] = useState([]); // array of angles in degrees (0, 90, 180, 270)
  const [loadingPages, setLoadingPages] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [resultUrl, setResultUrl] = useState('');

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

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
      const count = data.pages || 1;
      setThumbnails(data.thumbnails || []);
      setRotations(new Array(count).fill(0));
      setStep('rotate');
    } catch (err) {
      setMessage(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setLoadingPages(false);
    }
  };

  // Rotate a single page by delta (-90 or +90)
  const handleRotatePage = (index, delta) => {
    setRotations((prev) => {
      const next = [...prev];
      const current = next[index] || 0;
      next[index] = (current + delta + 360) % 360;
      return next;
    });
  };

  // Reset a single page to 0°
  const handleResetPage = (index) => {
    setRotations((prev) => {
      const next = [...prev];
      next[index] = 0;
      return next;
    });
  };

  // Rotate all pages by delta (-90, +90, or +180)
  const handleRotateAll = (delta) => {
    setRotations((prev) => prev.map((angle) => (angle + delta + 360) % 360));
  };

  // Rotate only odd pages (1, 3, 5...)
  const handleRotateOdd = (delta) => {
    setRotations((prev) =>
      prev.map((angle, idx) => (idx % 2 === 0 ? (angle + delta + 360) % 360 : angle))
    );
  };

  // Rotate only even pages (2, 4, 6...)
  const handleRotateEven = (delta) => {
    setRotations((prev) =>
      prev.map((angle, idx) => (idx % 2 !== 0 ? (angle + delta + 360) % 360 : angle))
    );
  };

  // Reset all pages to 0°
  const handleResetAll = () => {
    setRotations((prev) => new Array(prev.length).fill(0));
  };

  const handleProcess = async (e) => {
    if (e) e.preventDefault();
    if (!file || processing) return;

    setProcessing(true);
    setMessage('');

    const body = new FormData();
    body.append('file', file);
    body.append('rotations', JSON.stringify(rotations));

    try {
      const res = await fetch('/api/rotate', { method: 'POST', body });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'ไม่สามารถหมุนไฟล์ PDF ได้');
      }
      const blob = await res.blob();
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setStep('download');
      setMessage('หมุนหน้า PDF เรียบร้อยแล้ว');
    } catch (err) {
      setMessage(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Count how many pages are modified
  const rotatedCount = rotations.filter((deg) => deg !== 0).length;

  return (
    <div className="panel rotate-panel">
      <p className="merge-step">
        {step === 'select'
          ? '01 / เลือกเอกสาร PDF'
          : step === 'rotate'
          ? '02 / ปรับทิศทางและมุมหมุนของแต่ละหน้า'
          : '03 / ดาวน์โหลดเอกสาร'}
      </p>

      {/* STAGE 3: DOWNLOAD SCREEN */}
      {step === 'download' && resultUrl ? (
        <DownloadScreen
          downloadUrl={resultUrl}
          filename={`rotated_${file?.name || 'document.pdf'}`}
          title="หมุนหน้า PDF สำเร็จแล้ว!"
          subtitle={`เอกสารได้รับการหมุนหน้าตามที่กำหนด (${rotatedCount} หน้าที่มีการหมุน) เรียบร้อย`}
          onBack={() => setStep('rotate')}
          backLabel="← กลับไปปรับแต่งมุมหมุน"
          onReset={() => {
            setStep('select');
            setFile(null);
            setResultUrl('');
            setMessage('');
          }}
          resetLabel="หมุนไฟล์ใหม่"
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
            <p className="rotate-loading-note">กำลังโหลดตัวอย่างหน้าเอกสาร…</p>
          )}
        </div>
      ) : (
        /* STAGE 2: VISUAL PAGE ROTATE WORKSPACE */
        <div className="rotate-workspace">
          {/* HEADER & GLOBAL ACTIONS TOOLBAR */}
          <div className="rotate-top-toolbar">
            <div className="rotate-toolbar-left">
              <button
                type="button"
                className="button small secondary"
                onClick={() => setStep('select')}
              >
                <ArrowLeft size={14} /> เปลี่ยนไฟล์
              </button>
              <span className="rotate-file-pill" title={file?.name}>
                <FileText size={14} />
                <span className="rotate-file-name">{file?.name}</span>
                <span className="rotate-file-badge">({rotations.length} หน้า)</span>
              </span>
            </div>

            {/* BATCH ROTATION ACTIONS */}
            <div className="rotate-toolbar-actions">
              <div className="rotate-btn-group" title="หมุนทุกหน้าพร้อมกัน">
                <button
                  type="button"
                  className="button small secondary rotate-batch-btn"
                  onClick={() => handleRotateAll(-90)}
                  title="หมุนทุกหน้าทวนเข็มนาฬิกา 90°"
                >
                  <RotateCcw size={14} />
                  <span>หมุนซ้ายทุกหน้า</span>
                </button>
                <button
                  type="button"
                  className="button small secondary rotate-batch-btn"
                  onClick={() => handleRotateAll(90)}
                  title="หมุนทุกหน้าตามเข็มนาฬิกา 90°"
                >
                  <RotateCw size={14} />
                  <span>หมุนขวาทุกหน้า</span>
                </button>
                <button
                  type="button"
                  className="button small secondary rotate-batch-btn"
                  onClick={() => handleRotateAll(180)}
                  title="กลับหัวทุกหน้า 180°"
                >
                  <RefreshCw size={14} />
                  <span>กลับหัว 180°</span>
                </button>
              </div>

              {/* QUICK FILTER DROPDOWN / PRESETS */}
              <div className="rotate-sub-actions">
                <button
                  type="button"
                  className="button small text-btn"
                  onClick={() => handleRotateOdd(90)}
                  title="หมุนเฉพาะหน้าคี่ 1, 3, 5... ไปทางขวา 90°"
                >
                  <span>เฉพาะหน้าคี่ ↷</span>
                </button>
                <button
                  type="button"
                  className="button small text-btn"
                  onClick={() => handleRotateEven(90)}
                  title="หมุนเฉพาะหน้าคู่ 2, 4, 6... ไปทางขวา 90°"
                >
                  <span>เฉพาะหน้าคู่ ↷</span>
                </button>
                <button
                  type="button"
                  className="button small text-btn danger-text"
                  onClick={handleResetAll}
                  disabled={rotatedCount === 0}
                  title="รีเซ็ตทุกหน้ากลับเป็น 0°"
                >
                  <Undo2 size={13} />
                  <span>รีเซ็ตทั้งหมด</span>
                </button>
              </div>
            </div>
          </div>

          {/* PAGE CARDS GRID */}
          <div className="rotate-grid" role="region" aria-label="รายการหน้าเอกสาร">
            {rotations.map((deg, idx) => {
              const thumb = thumbnails[idx];
              const pageNum = idx + 1;
              const isRotated = deg !== 0;

              return (
                <div
                  key={idx}
                  className={`rotate-card ${isRotated ? 'is-rotated' : ''}`}
                >
                  {/* Card Header: Page number & angle pill */}
                  <div className="rotate-card-header">
                    <span className="rotate-page-num">หน้า {pageNum}</span>
                    <span
                      className={`rotate-deg-badge deg-${deg}`}
                      title={`มุมหมุนปัจจุบัน: ${deg}°`}
                    >
                      {deg}°
                    </span>
                  </div>

                  {/* Thumbnail Viewport with CSS Transform */}
                  <div
                    className="rotate-thumb-viewport"
                    onClick={() => handleRotatePage(idx, 90)}
                    title="คลิกที่รูปเพื่อหมุนตามเข็มนาฬิกา 90°"
                  >
                    <div
                      className="rotate-thumb-canvas"
                      style={{
                        transform: `rotate(${deg}deg)`,
                      }}
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={`หน้า ${pageNum}`}
                          className="rotate-thumb-img"
                          loading="lazy"
                        />
                      ) : (
                        <div className="rotate-thumb-placeholder">
                          <span>{pageNum}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Controls: Left / Right buttons */}
                  <div className="rotate-card-controls">
                    <button
                      type="button"
                      className="rotate-action-btn"
                      onClick={() => handleRotatePage(idx, -90)}
                      title="หมุนทวนเข็ม 90° (ซ้าย)"
                      aria-label={`หมุนหน้า ${pageNum} ไปทางซ้าย`}
                    >
                      <RotateCcw size={15} />
                    </button>

                    {isRotated ? (
                      <button
                        type="button"
                        className="rotate-reset-btn"
                        onClick={() => handleResetPage(idx)}
                        title="คืนค่าเป็น 0°"
                        aria-label={`คืนค่าหน้า ${pageNum}`}
                      >
                        <Undo2 size={13} />
                      </button>
                    ) : (
                      <span className="rotate-spacer" />
                    )}

                    <button
                      type="button"
                      className="rotate-action-btn"
                      onClick={() => handleRotatePage(idx, 90)}
                      title="หมุนตามเข็ม 90° (ขวา)"
                      aria-label={`หมุนหน้า ${pageNum} ไปทางขวา`}
                    >
                      <RotateCw size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {message && <p className="message">{message}</p>}

          {/* BOTTOM SUMMARY & SUBMIT BAR */}
          <div className="rotate-bottom-bar">
            <div className="rotate-summary-text">
              <span>
                เอกสารทั้งหมด <strong>{rotations.length} หน้า</strong>
                {rotatedCount > 0 ? (
                  <span className="rotate-active-count">
                    {' '}(หมุนแล้ว <strong>{rotatedCount} หน้า</strong>)
                  </span>
                ) : (
                  <span className="rotate-neutral-count"> (ยังไม่มีหน้าที่ถูกหมุน)</span>
                )}
              </span>
            </div>

            <button
              type="button"
              className="primary rotate-submit-btn"
              disabled={processing}
              onClick={handleProcess}
            >
              {processing ? (
                'กำลังหมุนหน้า PDF…'
              ) : (
                <>
                  <span>บันทึกและสร้าง PDF ที่หมุนแล้ว</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
