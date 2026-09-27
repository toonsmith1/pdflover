import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Scissors,
  RotateCcw,
  ArrowLeft,
  Loader2,
  Maximize2,
  FileCheck,
} from 'lucide-react';
import DropZone from '../common/DropZone';
import DownloadScreen from '../common/DownloadScreen';

export default function CropTool() {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('select'); // 'select' | 'crop' | 'download'
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [pageImageUrl, setPageImageUrl] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [pdfPoints, setPdfPoints] = useState({ width: 595.28, height: 841.89 });

  // crop stores percentages [0, 100]
  const [crop, setCrop] = useState({ x: 8, y: 8, width: 84, height: 84 });
  const [dragAction, setDragAction] = useState(null);

  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [resultUrl, setResultUrl] = useState('');

  const imageRef = useRef(null);
  const dragDataRef = useRef({ startX: 0, startY: 0, crop: { x: 0, y: 0, width: 0, height: 0 } });

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (pageImageUrl) URL.revokeObjectURL(pageImageUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [pageImageUrl, resultUrl]);

  // Handle file selection
  const handleFile = async (files) => {
    if (!files.length) return;
    const selected = files[0];
    setFile(selected);
    setMessage('');
    setLoadingPreview(true);

    const infoBody = new FormData();
    infoBody.append('file', selected);

    const previewBody = new FormData();
    previewBody.append('file', selected);

    try {
      // 1. Get PDF info (width, height, pages)
      const infoRes = await fetch('/api/pdf-info', { method: 'POST', body: infoBody });
      if (infoRes.ok) {
        const infoData = await infoRes.json();
        setTotalPages(infoData.pages || 1);
        if (infoData.width && infoData.height) {
          setPdfPoints({ width: infoData.width, height: infoData.height });
        }
      }

      // 2. Render first page to PNG
      const previewRes = await fetch('/api/render-preview', { method: 'POST', body: previewBody });
      if (!previewRes.ok) throw new Error('ไม่สามารถแสดงตัวอย่างเอกสารได้');
      const blob = await previewRes.blob();
      if (pageImageUrl) URL.revokeObjectURL(pageImageUrl);
      const url = URL.createObjectURL(blob);
      setPageImageUrl(url);

      // Default crop: 8% margin inwards (standard photo crop look)
      setCrop({ x: 8, y: 8, width: 84, height: 84 });
      setStep('crop');
    } catch (err) {
      setMessage(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Direct Pointer interaction on the photo
  const handlePointerDown = (e, action) => {
    e.preventDefault();
    e.stopPropagation();
    setDragAction(action);
    dragDataRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      crop: { ...crop },
    };
  };

  // Drawing new crop on background click & drag
  const handleBackgroundPointerDown = (e) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const clickY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    setDragAction('draw');
    dragDataRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialClick: { x: clickX, y: clickY },
      crop: { x: clickX, y: clickY, width: 0, height: 0 },
    };
  };

  const handlePointerMove = useCallback(
    (e) => {
      if (!dragAction || !imageRef.current) return;
      const rect = imageRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const dx = ((e.clientX - dragDataRef.current.startX) / rect.width) * 100;
      const dy = ((e.clientY - dragDataRef.current.startY) / rect.height) * 100;
      const orig = dragDataRef.current.crop;
      const minSize = 6; // minimum 6%

      if (dragAction === 'draw') {
        const init = dragDataRef.current.initialClick;
        const curX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const curY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

        const x = Math.min(init.x, curX);
        const y = Math.min(init.y, curY);
        const width = Math.max(minSize, Math.abs(curX - init.x));
        const height = Math.max(minSize, Math.abs(curY - init.y));

        setCrop({ x, y, width: Math.min(width, 100 - x), height: Math.min(height, 100 - y) });
        return;
      }

      if (dragAction === 'move') {
        const newX = Math.max(0, Math.min(100 - orig.width, orig.x + dx));
        const newY = Math.max(0, Math.min(100 - orig.height, orig.y + dy));
        setCrop({ ...orig, x: newX, y: newY });
        return;
      }

      let newCrop = { ...orig };

      // Resize handles
      if (dragAction.includes('w')) {
        const rightEdge = orig.x + orig.width;
        const targetX = Math.max(0, Math.min(rightEdge - minSize, orig.x + dx));
        newCrop.x = targetX;
        newCrop.width = rightEdge - targetX;
      }
      if (dragAction.includes('e')) {
        const maxW = 100 - orig.x;
        newCrop.width = Math.max(minSize, Math.min(maxW, orig.width + dx));
      }
      if (dragAction.includes('n')) {
        const bottomEdge = orig.y + orig.height;
        const targetY = Math.max(0, Math.min(bottomEdge - minSize, orig.y + dy));
        newCrop.y = targetY;
        newCrop.height = bottomEdge - targetY;
      }
      if (dragAction.includes('s')) {
        const maxH = 100 - orig.y;
        newCrop.height = Math.max(minSize, Math.min(maxH, orig.height + dy));
      }

      setCrop(newCrop);
    },
    [dragAction]
  );

  const handlePointerUp = useCallback(() => {
    if (dragAction === 'draw' && (crop.width < 8 || crop.height < 8)) {
      // If it was just a tiny click without drag, restore to comfortable default
      setCrop({ x: 8, y: 8, width: 84, height: 84 });
    }
    setDragAction(null);
  }, [dragAction, crop]);

  useEffect(() => {
    if (dragAction) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [dragAction, handlePointerMove, handlePointerUp]);

  // Execute Crop Submit
  const handleCropSubmit = async () => {
    if (!file || processing) return;

    setProcessing(true);
    setMessage('');

    // Convert percentages to PDF points
    const leftPt = Math.max(0, Math.round((crop.x / 100) * pdfPoints.width));
    const rightPt = Math.max(0, Math.round(((100 - (crop.x + crop.width)) / 100) * pdfPoints.width));
    const topPt = Math.max(0, Math.round((crop.y / 100) * pdfPoints.height));
    const bottomPt = Math.max(0, Math.round(((100 - (crop.y + crop.height)) / 100) * pdfPoints.height));

    const body = new FormData();
    body.append('file', file);
    body.append('left', String(leftPt));
    body.append('bottom', String(bottomPt));
    body.append('right', String(rightPt));
    body.append('top', String(topPt));

    try {
      const res = await fetch('/api/crop', { method: 'POST', body });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setStep('download');
      setMessage('ครอบตัดสำเร็จแล้ว');
    } catch (err) {
      setMessage(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="panel">
      {/* HEADER / BREADCRUMB */}
      <p className="merge-step">
        {step === 'select'
          ? '01 / เลือกเอกสาร'
          : step === 'crop'
          ? '02 / ลากกรอบครอบตัดตามต้องการ'
          : '03 / เอกสารพร้อมดาวน์โหลด'}
      </p>

      {/* STEP 3: DEDICATED DOWNLOAD SCREEN */}
      {step === 'download' && resultUrl ? (
        <DownloadScreen
          downloadUrl={resultUrl}
          filename={`cropped_${file?.name || 'document.pdf'}`}
          title="ครอบตัด PDF สำเร็จแล้ว!"
          subtitle="ตัดส่วนที่ต้องการออกมาเป็นไฟล์ใหม่อย่างแม่นยำ ปลอดภัยบนเครื่องของคุณ 100%"
          onBack={() => setStep('crop')}
          backLabel="← กลับไปปรับกรอบรูป"
          onReset={() => {
            setStep('select');
            setFile(null);
            setResultUrl('');
            setPageImageUrl('');
            setMessage('');
          }}
          resetLabel="ครอบตัดไฟล์ใหม่"
        />
      ) : step === 'select' ? (
        /* STEP 1: FILE SELECTION */
        <div className="tool-controls">
          <DropZone
            onFilesSelected={handleFile}
            multiple={false}
            label={file ? file.name : 'ยังไม่ได้เลือกไฟล์'}
          />
          {loadingPreview && (
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
              <span>กำลังโหลดภาพเอกสารสำหรับครอบตัด…</span>
            </div>
          )}
          {message && <p className="message">{message}</p>}
        </div>
      ) : (
        /* STEP 2: PURE IMAGE CROPPER (เหมือนตัดรูปภาพบนมือถือ) */
        <div className="photo-crop-container">
          {/* Top Quick Action Bar */}
          <div className="photo-crop-topbar">
            <button
              type="button"
              className="button small secondary"
              onClick={() => setStep('select')}
            >
              <ArrowLeft size={14} />
              <span>เปลี่ยนไฟล์</span>
            </button>

            <div className="photo-crop-hint">
              <span>💡 คลิกหรือดึงมุมกรอบบนรูปภาพเพื่อเลือกส่วนที่ต้องการ</span>
            </div>

            <div className="photo-crop-presets">
              <button
                type="button"
                className="button small secondary"
                onClick={() => setCrop({ x: 0, y: 0, width: 100, height: 100 })}
                title="รีเซ็ตเป็นขนาดเต็มภาพ"
              >
                <Maximize2 size={13} />
                <span>เต็มภาพ</span>
              </button>
              <button
                type="button"
                className="button small secondary"
                onClick={() => setCrop({ x: 6, y: 6, width: 88, height: 88 })}
                title="ตัดขอบขาวรอบภาพออกเล็กน้อย"
              >
                <RotateCcw size={13} />
                <span>ตัดขอบขาว</span>
              </button>
            </div>
          </div>

          {/* Center Stage: The Photo with Interactive Crop Box */}
          <div className="photo-crop-viewport">
            <div
              className="photo-crop-box-anchor"
              onPointerDown={handleBackgroundPointerDown}
            >
              {/* Document Image */}
              <img
                ref={imageRef}
                src={pageImageUrl}
                alt="หน้าเอกสารสำหรับครอบตัด"
                className="photo-crop-img"
                draggable={false}
              />

              {/* The Interactive Crop Box */}
              <div
                className="photo-crop-box"
                style={{
                  left: `${crop.x}%`,
                  top: `${crop.y}%`,
                  width: `${crop.width}%`,
                  height: `${crop.height}%`,
                }}
                onPointerDown={(e) => handlePointerDown(e, 'move')}
              >
                {/* 3x3 Grid Lines */}
                <div className="photo-crop-grid" />

                {/* Classic Corner Brackets (เหมือนแอปแต่งรูปมือถือ) */}
                <div
                  className="photo-crop-corner corner-nw"
                  onPointerDown={(e) => handlePointerDown(e, 'nw')}
                />
                <div
                  className="photo-crop-corner corner-ne"
                  onPointerDown={(e) => handlePointerDown(e, 'ne')}
                />
                <div
                  className="photo-crop-corner corner-se"
                  onPointerDown={(e) => handlePointerDown(e, 'se')}
                />
                <div
                  className="photo-crop-corner corner-sw"
                  onPointerDown={(e) => handlePointerDown(e, 'sw')}
                />

                {/* Edge Center Bars */}
                <div
                  className="photo-crop-edge edge-n"
                  onPointerDown={(e) => handlePointerDown(e, 'n')}
                />
                <div
                  className="photo-crop-edge edge-s"
                  onPointerDown={(e) => handlePointerDown(e, 's')}
                />
                <div
                  className="photo-crop-edge edge-w"
                  onPointerDown={(e) => handlePointerDown(e, 'w')}
                />
                <div
                  className="photo-crop-edge edge-e"
                  onPointerDown={(e) => handlePointerDown(e, 'e')}
                />
              </div>
            </div>
          </div>

          {/* Bottom Toolbar: Big Primary Crop Button */}
          <div className="photo-crop-bottombar">
            <div className="photo-crop-status">
              <FileCheck size={16} color="#456847" />
              <span>
                {file?.name} {totalPages > 1 ? `(จะครอบตัดทั้ง ${totalPages} หน้า)` : ''}
              </span>
            </div>

            <button
              type="button"
              className="button primary photo-crop-submit-btn"
              disabled={processing}
              onClick={handleCropSubmit}
            >
              {processing ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>กำลังครอบตัด…</span>
                </>
              ) : (
                <>
                  <Scissors size={17} />
                  <span>ครอบตัดรูปนี้ทันที</span>
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
