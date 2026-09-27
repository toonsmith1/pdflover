import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Scissors,
  RotateCcw,
  Maximize2,
  Sliders,
  Sparkles,
  Minus,
  Plus,
  ArrowLeft,
  Loader2,
  FileCheck,
} from 'lucide-react';
import DropZone from '../common/DropZone';
import DownloadScreen from '../common/DownloadScreen';

const PT_TO_CM = 0.0352778;
const CM_TO_PT = 28.3465;

export default function CropTool() {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('select'); // 'select' | 'configure' | 'download'
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [pageImageUrl, setPageImageUrl] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [pdfPoints, setPdfPoints] = useState({ width: 595.28, height: 841.89 }); // Default A4

  // cropRect stores normalized coordinates [0, 1]
  const [cropRect, setCropRect] = useState({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
  const [activeHandle, setActiveHandle] = useState(null);

  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [resultUrl, setResultUrl] = useState('');

  const imageRef = useRef(null);
  const dragStartRef = useRef({ clientX: 0, clientY: 0, rect: { x: 0, y: 0, width: 0, height: 0 } });

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (pageImageUrl) URL.revokeObjectURL(pageImageUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [pageImageUrl, resultUrl]);

  // Handle file drop/selection
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
      // 1. Fetch PDF info (dimensions & page count)
      const infoRes = await fetch('/api/pdf-info', { method: 'POST', body: infoBody });
      if (infoRes.ok) {
        const infoData = await infoRes.json();
        setTotalPages(infoData.pages || 1);
        if (infoData.width && infoData.height) {
          setPdfPoints({ width: infoData.width, height: infoData.height });
        }
      }

      // 2. Fetch rendered preview of page 1
      const previewRes = await fetch('/api/render-preview', { method: 'POST', body: previewBody });
      if (!previewRes.ok) throw new Error('ไม่สามารถเรนเดอร์หน้าตัวอย่างได้');
      const blob = await previewRes.blob();
      if (pageImageUrl) URL.revokeObjectURL(pageImageUrl);
      const url = URL.createObjectURL(blob);
      setPageImageUrl(url);

      // Default crop: standard 1.2 cm margins (or 5% margin)
      setCropRect({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
      setStep('configure');
    } catch (err) {
      setMessage(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Dragging logic
  const handlePointerDown = (e, handleType) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveHandle(handleType);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      rect: { ...cropRect },
    };
  };

  const handlePointerMove = useCallback(
    (e) => {
      if (!activeHandle || !imageRef.current) return;
      const imgBounds = imageRef.current.getBoundingClientRect();
      if (!imgBounds.width || !imgBounds.height) return;

      const dx = (e.clientX - dragStartRef.current.clientX) / imgBounds.width;
      const dy = (e.clientY - dragStartRef.current.clientY) / imgBounds.height;
      const orig = dragStartRef.current.rect;
      const minSize = 0.06; // Minimum 6% width/height

      let newRect = { ...orig };

      if (activeHandle === 'move') {
        newRect.x = Math.max(0, Math.min(1 - orig.width, orig.x + dx));
        newRect.y = Math.max(0, Math.min(1 - orig.height, orig.y + dy));
      } else {
        // Corner and edge resizers
        if (activeHandle.includes('w')) {
          const rightEdge = orig.x + orig.width;
          const newX = Math.max(0, Math.min(rightEdge - minSize, orig.x + dx));
          newRect.x = newX;
          newRect.width = rightEdge - newX;
        }
        if (activeHandle.includes('e')) {
          const maxW = 1 - orig.x;
          newRect.width = Math.max(minSize, Math.min(maxW, orig.width + dx));
        }
        if (activeHandle.includes('n')) {
          const bottomEdge = orig.y + orig.height;
          const newY = Math.max(0, Math.min(bottomEdge - minSize, orig.y + dy));
          newRect.y = newY;
          newRect.height = bottomEdge - newY;
        }
        if (activeHandle.includes('s')) {
          const maxH = 1 - orig.y;
          newRect.height = Math.max(minSize, Math.min(maxH, orig.height + dy));
        }
      }

      setCropRect(newRect);
    },
    [activeHandle]
  );

  const handlePointerUp = useCallback(() => {
    setActiveHandle(null);
  }, []);

  useEffect(() => {
    if (activeHandle) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [activeHandle, handlePointerMove, handlePointerUp]);

  // Derived margin measurements in points & cm
  const leftPt = Math.max(0, Math.round(cropRect.x * pdfPoints.width));
  const rightPt = Math.max(0, Math.round((1 - (cropRect.x + cropRect.width)) * pdfPoints.width));
  const topPt = Math.max(0, Math.round(cropRect.y * pdfPoints.height));
  const bottomPt = Math.max(0, Math.round((1 - (cropRect.y + cropRect.height)) * pdfPoints.height));

  const leftCm = (leftPt * PT_TO_CM).toFixed(1);
  const rightCm = (rightPt * PT_TO_CM).toFixed(1);
  const topCm = (topPt * PT_TO_CM).toFixed(1);
  const bottomCm = (bottomPt * PT_TO_CM).toFixed(1);

  const origWidthCm = (pdfPoints.width * PT_TO_CM).toFixed(1);
  const origHeightCm = (pdfPoints.height * PT_TO_CM).toFixed(1);
  const newWidthCm = Math.max(0, ((pdfPoints.width - leftPt - rightPt) * PT_TO_CM)).toFixed(1);
  const newHeightCm = Math.max(0, ((pdfPoints.height - topPt - bottomPt) * PT_TO_CM)).toFixed(1);

  const percentKept = Math.round(cropRect.width * cropRect.height * 100);
  const percentCut = 100 - percentKept;

  // Preset Handlers
  const applyPreset = (type) => {
    switch (type) {
      case 'reset':
        setCropRect({ x: 0, y: 0, width: 1, height: 1 });
        break;
      case 'trim-1cm': {
        const xFrac = (1 * CM_TO_PT) / pdfPoints.width;
        const yFrac = (1 * CM_TO_PT) / pdfPoints.height;
        setCropRect({
          x: Math.min(0.2, xFrac),
          y: Math.min(0.2, yFrac),
          width: Math.max(0.2, 1 - 2 * xFrac),
          height: Math.max(0.2, 1 - 2 * yFrac),
        });
        break;
      }
      case 'trim-2cm': {
        const xFrac = (2 * CM_TO_PT) / pdfPoints.width;
        const yFrac = (2 * CM_TO_PT) / pdfPoints.height;
        setCropRect({
          x: Math.min(0.25, xFrac),
          y: Math.min(0.25, yFrac),
          width: Math.max(0.2, 1 - 2 * xFrac),
          height: Math.max(0.2, 1 - 2 * yFrac),
        });
        break;
      }
      case 'header-footer': {
        const yFrac = (2.5 * CM_TO_PT) / pdfPoints.height;
        setCropRect({
          x: 0.04,
          y: Math.min(0.25, yFrac),
          width: 0.92,
          height: Math.max(0.2, 1 - 2 * yFrac),
        });
        break;
      }
      case 'top-half':
        setCropRect({ x: 0.04, y: 0.02, width: 0.92, height: 0.48 });
        break;
      case 'bottom-half':
        setCropRect({ x: 0.04, y: 0.5, width: 0.92, height: 0.48 });
        break;
      default:
        break;
    }
  };

  // Adjust margin by delta cm (+/- 0.5 cm)
  const adjustMarginCm = (side, deltaCm) => {
    const deltaPt = deltaCm * CM_TO_PT;
    if (side === 'left') {
      const curPt = cropRect.x * pdfPoints.width;
      const targetPt = Math.max(0, curPt + deltaPt);
      const rightEdge = cropRect.x + cropRect.width;
      const newX = Math.min(rightEdge - 0.08, targetPt / pdfPoints.width);
      setCropRect((prev) => ({ ...prev, x: newX, width: rightEdge - newX }));
    } else if (side === 'right') {
      const curRightPt = (1 - (cropRect.x + cropRect.width)) * pdfPoints.width;
      const targetRightPt = Math.max(0, curRightPt + deltaPt);
      const newW = Math.max(0.08, 1 - cropRect.x - targetRightPt / pdfPoints.width);
      setCropRect((prev) => ({ ...prev, width: newW }));
    } else if (side === 'top') {
      const curPt = cropRect.y * pdfPoints.height;
      const targetPt = Math.max(0, curPt + deltaPt);
      const bottomEdge = cropRect.y + cropRect.height;
      const newY = Math.min(bottomEdge - 0.08, targetPt / pdfPoints.height);
      setCropRect((prev) => ({ ...prev, y: newY, height: bottomEdge - newY }));
    } else if (side === 'bottom') {
      const curBottomPt = (1 - (cropRect.y + cropRect.height)) * pdfPoints.height;
      const targetBottomPt = Math.max(0, curBottomPt + deltaPt);
      const newH = Math.max(0.08, 1 - cropRect.y - targetBottomPt / pdfPoints.height);
      setCropRect((prev) => ({ ...prev, height: newH }));
    }
  };

  // Process crop submit
  const handleProcess = async (e) => {
    if (e) e.preventDefault();
    if (!file || processing) return;

    setProcessing(true);
    setMessage('');

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
      setMessage('ครอบตัดหน้า PDF เรียบร้อยแล้ว');
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
          ? '02 / ตีกรอบครอบตัดตามต้องการ'
          : '03 / เอกสารพร้อมดาวน์โหลด'}
      </p>

      {/* STAGE 3: DEDICATED DOWNLOAD SCREEN */}
      {step === 'download' && resultUrl ? (
        <DownloadScreen
          downloadUrl={resultUrl}
          filename={`cropped_${file?.name || 'document.pdf'}`}
          title="ครอบตัด PDF สำเร็จแล้ว!"
          subtitle={`ตัดขอบสำเร็จ (ขนาดใหม่: ${newWidthCm} × ${newHeightCm} ซม. ลดลง ${percentCut}%) ปลอดภัยบนเครื่องของคุณ`}
          onBack={() => setStep('configure')}
          backLabel="← กลับไปปรับแต่งกรอบ"
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
        /* STAGE 1: FILE SELECTION */
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
              <span>กำลังโหลดหน้าตัวอย่างเอกสาร…</span>
            </div>
          )}
          {message && <p className="message">{message}</p>}
        </div>
      ) : (
        /* STAGE 2: VISUAL CROP STUDIO */
        <div className="crop-workspace-container">
          {/* Main Visual Crop Canvas */}
          <div className="crop-canvas-section">
            <div className="crop-canvas-hint">
              <span>💡 คลิกแล้วลากกรอบสี่เหลี่ยม หรือดึงมุม/ขอบ เพื่อเลือกบริเวณที่ต้องการเก็บไว้</span>
            </div>

            <div className="crop-desk-area">
              <div className="crop-image-wrapper">
                <img
                  ref={imageRef}
                  src={pageImageUrl}
                  alt="ตัวอย่างหน้า PDF"
                  className="crop-rendered-page"
                  draggable={false}
                />

                {/* Interactive Crop Selection Box */}
                <div
                  className="crop-selection-box"
                  style={{
                    left: `${cropRect.x * 100}%`,
                    top: `${cropRect.y * 100}%`,
                    width: `${cropRect.width * 100}%`,
                    height: `${cropRect.height * 100}%`,
                  }}
                  onPointerDown={(e) => handlePointerDown(e, 'move')}
                >
                  {/* Subtle 3x3 Grid Overlay */}
                  <div className="crop-grid-lines" />

                  {/* Corner Handles */}
                  <div
                    className="crop-handle crop-handle-nw"
                    onPointerDown={(e) => handlePointerDown(e, 'nw')}
                  />
                  <div
                    className="crop-handle crop-handle-ne"
                    onPointerDown={(e) => handlePointerDown(e, 'ne')}
                  />
                  <div
                    className="crop-handle crop-handle-se"
                    onPointerDown={(e) => handlePointerDown(e, 'se')}
                  />
                  <div
                    className="crop-handle crop-handle-sw"
                    onPointerDown={(e) => handlePointerDown(e, 'sw')}
                  />

                  {/* Edge Handles */}
                  <div
                    className="crop-handle crop-handle-n"
                    onPointerDown={(e) => handlePointerDown(e, 'n')}
                  />
                  <div
                    className="crop-handle crop-handle-s"
                    onPointerDown={(e) => handlePointerDown(e, 's')}
                  />
                  <div
                    className="crop-handle crop-handle-w"
                    onPointerDown={(e) => handlePointerDown(e, 'w')}
                  />
                  <div
                    className="crop-handle crop-handle-e"
                    onPointerDown={(e) => handlePointerDown(e, 'e')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Controls Sidebar */}
          <aside className="crop-controls-sidebar">
            <div className="crop-sidebar-header">
              <button
                type="button"
                className="button small secondary"
                onClick={() => setStep('select')}
                style={{ width: 'fit-content' }}
              >
                <ArrowLeft size={13} />
                <span>เปลี่ยนไฟล์</span>
              </button>
              <div className="crop-file-tag">
                <FileCheck size={14} color="#456847" />
                <span title={file?.name}>{file?.name}</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="crop-section-block">
              <label className="crop-block-label">
                <Sparkles size={14} />
                <span>ตัวเลือกครอบตัดด่วน</span>
              </label>
              <div className="crop-presets-grid">
                <button
                  type="button"
                  className="button small secondary crop-preset-btn"
                  onClick={() => applyPreset('reset')}
                >
                  <Maximize2 size={13} />
                  <span>เต็มหน้า (100%)</span>
                </button>
                <button
                  type="button"
                  className="button small secondary crop-preset-btn"
                  onClick={() => applyPreset('trim-1cm')}
                >
                  <span>ตัดขอบ 1 ซม.</span>
                </button>
                <button
                  type="button"
                  className="button small secondary crop-preset-btn"
                  onClick={() => applyPreset('trim-2cm')}
                >
                  <span>ตัดขอบ 2 ซม.</span>
                </button>
                <button
                  type="button"
                  className="button small secondary crop-preset-btn"
                  onClick={() => applyPreset('header-footer')}
                >
                  <span>ตัดหัว-ท้าย</span>
                </button>
                <button
                  type="button"
                  className="button small secondary crop-preset-btn"
                  onClick={() => applyPreset('top-half')}
                >
                  <span>ครึ่งบน</span>
                </button>
                <button
                  type="button"
                  className="button small secondary crop-preset-btn"
                  onClick={() => applyPreset('bottom-half')}
                >
                  <span>ครึ่งล่าง</span>
                </button>
              </div>
            </div>

            {/* Fine-Tuning Margins (cm) */}
            <div className="crop-section-block">
              <label className="crop-block-label">
                <Sliders size={14} />
                <span>ปรับระยะตัดแต่ละด้าน (ซม.)</span>
              </label>
              <div className="crop-steppers-grid">
                <div className="crop-stepper-item">
                  <span className="crop-stepper-name">บน:</span>
                  <button
                    type="button"
                    className="crop-stepper-btn"
                    onClick={() => adjustMarginCm('top', -0.5)}
                    title="ลดระยะตัดบน 0.5 ซม."
                  >
                    <Minus size={11} />
                  </button>
                  <span className="crop-stepper-val">{topCm} ซม.</span>
                  <button
                    type="button"
                    className="crop-stepper-btn"
                    onClick={() => adjustMarginCm('top', 0.5)}
                    title="เพิ่มระยะตัดบน 0.5 ซม."
                  >
                    <Plus size={11} />
                  </button>
                </div>

                <div className="crop-stepper-item">
                  <span className="crop-stepper-name">ล่าง:</span>
                  <button
                    type="button"
                    className="crop-stepper-btn"
                    onClick={() => adjustMarginCm('bottom', -0.5)}
                    title="ลดระยะตัดล่าง 0.5 ซม."
                  >
                    <Minus size={11} />
                  </button>
                  <span className="crop-stepper-val">{bottomCm} ซม.</span>
                  <button
                    type="button"
                    className="crop-stepper-btn"
                    onClick={() => adjustMarginCm('bottom', 0.5)}
                    title="เพิ่มระยะตัดล่าง 0.5 ซม."
                  >
                    <Plus size={11} />
                  </button>
                </div>

                <div className="crop-stepper-item">
                  <span className="crop-stepper-name">ซ้าย:</span>
                  <button
                    type="button"
                    className="crop-stepper-btn"
                    onClick={() => adjustMarginCm('left', -0.5)}
                    title="ลดระยะตัดซ้าย 0.5 ซม."
                  >
                    <Minus size={11} />
                  </button>
                  <span className="crop-stepper-val">{leftCm} ซม.</span>
                  <button
                    type="button"
                    className="crop-stepper-btn"
                    onClick={() => adjustMarginCm('left', 0.5)}
                    title="เพิ่มระยะตัดซ้าย 0.5 ซม."
                  >
                    <Plus size={11} />
                  </button>
                </div>

                <div className="crop-stepper-item">
                  <span className="crop-stepper-name">ขวา:</span>
                  <button
                    type="button"
                    className="crop-stepper-btn"
                    onClick={() => adjustMarginCm('right', -0.5)}
                    title="ลดระยะตัดขวา 0.5 ซม."
                  >
                    <Minus size={11} />
                  </button>
                  <span className="crop-stepper-val">{rightCm} ซม.</span>
                  <button
                    type="button"
                    className="crop-stepper-btn"
                    onClick={() => adjustMarginCm('right', 0.5)}
                    title="เพิ่มระยะตัดขวา 0.5 ซม."
                  >
                    <Plus size={11} />
                  </button>
                </div>
              </div>
            </div>

            {/* Result Dimension Specs */}
            <div className="crop-specs-card">
              <div className="crop-specs-row">
                <span className="crop-specs-label">ขนาดเดิม:</span>
                <span className="crop-specs-value">
                  {origWidthCm} × {origHeightCm} ซม.
                </span>
              </div>
              <div className="crop-specs-row">
                <span className="crop-specs-label">ขนาดผลลัพธ์:</span>
                <strong className="crop-specs-value-highlight">
                  {newWidthCm} × {newHeightCm} ซม.
                </strong>
              </div>
              <div className="crop-specs-row">
                <span className="crop-specs-label">พื้นที่เก็บไว้:</span>
                <span className="crop-specs-badge">
                  {percentKept}% (ตัดออก {percentCut}%)
                </span>
              </div>
              {totalPages > 1 && (
                <small className="crop-specs-note">
                  💡 ระยะตัดนี้จะมีผลกับทั้ง {totalPages} หน้าของเอกสาร
                </small>
              )}
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              className="button primary crop-submit-btn"
              disabled={processing}
              onClick={handleProcess}
            >
              {processing ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>กำลังครอบตัด…</span>
                </>
              ) : (
                <>
                  <Scissors size={16} />
                  <span>ครอบตัดเอกสารหน้านี้</span>
                </>
              )}
            </button>

            {message && <p className="message">{message}</p>}
          </aside>
        </div>
      )}
    </div>
  );
}
