import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  PenTool,
  Upload,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Move,
  ArrowLeft,
  Sparkles,
  Check,
  RotateCw,
} from 'lucide-react';
import DropZone from '../common/DropZone';
import DownloadScreen from '../common/DownloadScreen';

export default function SignatureTool() {
  // File & page state
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('select'); // 'select' | 'draw' | 'place' | 'download'
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageImages, setPageImages] = useState({});
  const [loadingPage, setLoadingPage] = useState(false);

  // Signature image (drawn or uploaded)
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [signatureMode, setSignatureMode] = useState('draw'); // 'draw' | 'upload'
  const [penWidth, setPenWidth] = useState(2.5);
  const [penColor, setPenColor] = useState('#222222');

  // Placed signatures: [{ id, page, x, y, width, image }]
  const [placedSignatures, setPlacedSignatures] = useState([]);
  const [activeSignatureId, setActiveSignatureId] = useState(null);

  // View
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Processing
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [resultUrl, setResultUrl] = useState('');

  // Refs
  const drawCanvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const imageRef = useRef(null);
  const urlsRef = useRef(new Set());
  const pageImagesRef = useRef({});
  const dragRef = useRef({ active: false, offsetX: 0, offsetY: 0, sigId: null });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      urlsRef.current.forEach((url) => {
        try { URL.revokeObjectURL(url); } catch { /* ignore */ }
      });
      urlsRef.current.clear();
    };
  }, []);

  // Load a page image
  const loadPageImage = useCallback(async (selectedFile, pageNum) => {
    if (pageImagesRef.current[pageNum]) return;
    setLoadingPage(true);
    const body = new FormData();
    body.append('file', selectedFile);
    try {
      const res = await fetch(`/api/render-preview?page=${pageNum}`, { method: 'POST', body });
      if (!res.ok) throw new Error('ไม่สามารถโหลดภาพหน้านี้ได้');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      urlsRef.current.add(url);
      pageImagesRef.current[pageNum] = url;
      setPageImages((prev) => ({ ...prev, [pageNum]: url }));
    } catch {
      // Ignore preview errors
    } finally {
      setLoadingPage(false);
    }
  }, []);

  // Handle file selection
  const handleFile = async (files) => {
    if (!files.length) return;
    const selected = files[0];

    urlsRef.current.forEach((url) => {
      try { URL.revokeObjectURL(url); } catch { /* ignore */ }
    });
    urlsRef.current.clear();
    pageImagesRef.current = {};
    setPageImages({});

    setFile(selected);
    setMessage('');
    setCurrentPage(1);
    setPlacedSignatures([]);

    const body = new FormData();
    body.append('file', selected);
    try {
      const infoRes = await fetch('/api/pdf-info', { method: 'POST', body });
      if (infoRes.ok) {
        const infoData = await infoRes.json();
        setTotalPages(infoData.pages || 1);
      }
    } catch { /* ignore */ }

    if (signatureDataUrl) {
      // Already have a signature, go straight to place
      await loadPageImage(selected, 1);
      setStep('place');
    } else {
      setStep('draw');
    }
  };

  // Page change
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    if (file && !pageImagesRef.current[newPage]) {
      loadPageImage(file, newPage);
    }
  };

  // -- Drawing canvas logic --
  const initDrawCanvas = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [penColor, penWidth]);

  useEffect(() => {
    if (step === 'draw') {
      initDrawCanvas();
    }
  }, [step, initDrawCanvas]);

  const handleDrawStart = (e) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    lastPointRef.current = { x: x * (canvas.width / rect.width), y: y * (canvas.height / rect.height) };
  };

  const handleDrawMove = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const currentPoint = { x: x * scaleX, y: y * scaleY };

    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();
    lastPointRef.current = currentPoint;
  };

  const handleDrawEnd = () => {
    isDrawingRef.current = false;
  };

  const handleClearDraw = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleConfirmSignature = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    // Check if canvas has any content
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasContent = imageData.data.some((v, i) => i % 4 === 3 && v > 0);
    if (!hasContent) {
      setMessage('กรุณาวาดลายเซ็นก่อนกดยืนยัน');
      return;
    }
    setSignatureDataUrl(canvas.toDataURL('image/png'));
    setMessage('');
    if (file) {
      loadPageImage(file, currentPage);
      setStep('place');
    }
  };

  const handleUploadSignature = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSignatureDataUrl(ev.target.result);
      setMessage('');
      if (file) {
        loadPageImage(file, currentPage);
        setStep('place');
      }
    };
    reader.readAsDataURL(f);
  };

  // -- Placing signatures on pages --
  const handlePlaceSignature = (e) => {
    if (!imageRef.current || !signatureDataUrl) return;
    if (dragRef.current.active) return; // Don't place new if dragging

    const rect = imageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const newSig = {
      id: `sig_${Date.now()}`,
      page: currentPage,
      x: Math.max(0, Math.min(0.75, x - 0.1)),
      y: Math.max(0, Math.min(0.88, y - 0.05)),
      width: 0.2,
      image: signatureDataUrl,
    };
    setPlacedSignatures((prev) => [...prev, newSig]);
    setActiveSignatureId(newSig.id);
  };

  const handleSigPointerDown = (e, sig) => {
    e.stopPropagation();
    setActiveSignatureId(sig.id);
    if (!imageRef.current) return;
    const imgRect = imageRef.current.getBoundingClientRect();
    const sigX = imgRect.left + sig.x * imgRect.width;
    const sigY = imgRect.top + sig.y * imgRect.height;
    dragRef.current = {
      active: true,
      offsetX: e.clientX - sigX,
      offsetY: e.clientY - sigY,
      sigId: sig.id,
    };
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!dragRef.current.active || !imageRef.current) return;
      const rect = imageRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - dragRef.current.offsetX) / rect.width;
      const y = (e.clientY - rect.top - dragRef.current.offsetY) / rect.height;
      setPlacedSignatures((prev) =>
        prev.map((s) =>
          s.id === dragRef.current.sigId
            ? { ...s, x: Math.max(0, Math.min(0.8, x)), y: Math.max(0, Math.min(0.9, y)) }
            : s
        )
      );
    };

    const handlePointerUp = () => {
      dragRef.current.active = false;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  const handleResizeSignature = (sigId, delta) => {
    setPlacedSignatures((prev) =>
      prev.map((s) =>
        s.id === sigId
          ? { ...s, width: Math.max(0.08, Math.min(0.6, s.width + delta)) }
          : s
      )
    );
  };

  const handleRemoveSignature = (sigId) => {
    setPlacedSignatures((prev) => prev.filter((s) => s.id !== sigId));
    if (activeSignatureId === sigId) setActiveSignatureId(null);
  };

  // -- Process / Export --
  const handleProcess = async () => {
    if (!file || processing) return;
    const sigs = placedSignatures.filter((s) => s.image);
    if (!sigs.length) {
      setMessage('กรุณาวางลายเซ็นอย่างน้อย 1 จุดบนเอกสาร');
      return;
    }

    setProcessing(true);
    setMessage('');
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('signatures', JSON.stringify(sigs));

      const res = await fetch('/api/signature', { method: 'POST', body });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'ไม่สามารถวางลายเซ็นได้');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      urlsRef.current.add(url);
      setResultUrl(url);
      setStep('download');
      setMessage('วางลายเซ็นลงในเอกสารเรียบร้อยแล้ว');
    } catch (err) {
      setMessage(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const sigsOnPage = placedSignatures.filter((s) => s.page === currentPage);
  const totalSigPages = new Set(placedSignatures.map((s) => s.page)).size;

  return (
    <div className="panel signature-panel">
      <p className="merge-step">
        {step === 'select'
          ? '01 / เลือกเอกสาร PDF'
          : step === 'draw'
          ? '02 / วาดหรืออัปโหลดลายเซ็น'
          : step === 'place'
          ? '03 / วางลายเซ็นบนเอกสาร'
          : '04 / ดาวน์โหลดเอกสาร'}
      </p>

      {/* STAGE 4: DOWNLOAD */}
      {step === 'download' && resultUrl ? (
        <DownloadScreen
          downloadUrl={resultUrl}
          filename={`signed_${file?.name || 'document.pdf'}`}
          title="ลงลายเซ็นสำเร็จแล้ว!"
          subtitle={`ลายเซ็นถูกวางลงใน ${totalSigPages} หน้า (${placedSignatures.length} จุด) เรียบร้อย`}
          onBack={() => setStep('place')}
          backLabel="← กลับไปแก้ไข"
          onReset={() => {
            urlsRef.current.forEach((u) => {
              try { URL.revokeObjectURL(u); } catch { /* ignore */ }
            });
            urlsRef.current.clear();
            pageImagesRef.current = {};
            setStep('select');
            setFile(null);
            setPageImages({});
            setPlacedSignatures([]);
            setSignatureDataUrl('');
            setResultUrl('');
            setMessage('');
          }}
          resetLabel="เปิดไฟล์ใหม่"
        />
      ) : step === 'select' ? (
        /* STAGE 1: FILE SELECTION */
        <div className="tool-controls">
          <DropZone
            onFilesSelected={handleFile}
            multiple={false}
            label={file ? file.name : 'ยังไม่ได้เลือกไฟล์'}
          />
        </div>
      ) : step === 'draw' ? (
        /* STAGE 2: DRAW / UPLOAD SIGNATURE */
        <div className="sig-draw-stage">
          <div className="sig-mode-tabs">
            <button
              type="button"
              className={`sig-mode-tab ${signatureMode === 'draw' ? 'active' : ''}`}
              onClick={() => setSignatureMode('draw')}
            >
              <PenTool size={16} /> วาดลายเซ็น
            </button>
            <button
              type="button"
              className={`sig-mode-tab ${signatureMode === 'upload' ? 'active' : ''}`}
              onClick={() => setSignatureMode('upload')}
            >
              <Upload size={16} /> อัปโหลดรูปลายเซ็น
            </button>
          </div>

          {signatureMode === 'draw' ? (
            <div className="sig-draw-area">
              <p className="sig-draw-hint">ใช้เมาส์หรือปากกาวาดลายเซ็นในกรอบด้านล่าง</p>
              <div className="sig-canvas-wrap">
                <canvas
                  ref={drawCanvasRef}
                  width={600}
                  height={200}
                  className="sig-draw-canvas"
                  onMouseDown={handleDrawStart}
                  onMouseMove={handleDrawMove}
                  onMouseUp={handleDrawEnd}
                  onMouseLeave={handleDrawEnd}
                  onTouchStart={handleDrawStart}
                  onTouchMove={handleDrawMove}
                  onTouchEnd={handleDrawEnd}
                />
              </div>
              <div className="sig-pen-settings">
                <span className="strip-label">ขนาดเส้น:</span>
                <div className="size-selector">
                  {[1.5, 2.5, 4, 6].map((w) => (
                    <button
                      key={w}
                      type="button"
                      className={`size-btn ${penWidth === w ? 'active' : ''}`}
                      onClick={() => setPenWidth(w)}
                    >
                      {w <= 1.5 ? 'เบาบาง' : w <= 2.5 ? 'ปกติ' : w <= 4 ? 'หนา' : 'หนามาก'}
                    </button>
                  ))}
                </div>
                <span className="strip-label">สีหมึก:</span>
                <div className="color-dots">
                  {['#222222', '#1e3a8a', '#79352f', '#15803d'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`color-dot ${penColor === c ? 'active' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setPenColor(c)}
                    />
                  ))}
                </div>
              </div>
              <div className="sig-draw-actions">
                <button type="button" className="button small secondary" onClick={handleClearDraw}>
                  <Trash2 size={14} /> ล้างและวาดใหม่
                </button>
                <button type="button" className="button primary" onClick={handleConfirmSignature}>
                  <Check size={16} /> ยืนยันลายเซ็น
                </button>
              </div>
            </div>
          ) : (
            <div className="sig-upload-area">
              <p className="sig-draw-hint">เลือกไฟล์รูปภาพลายเซ็น (.png, .jpg) — แนะนำพื้นหลังโปร่งใส (PNG)</p>
              <label className="sig-upload-label">
                <Upload size={20} />
                <span>เลือกรูปลายเซ็น</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleUploadSignature}
                  hidden
                />
              </label>
              {signatureDataUrl && (
                <div className="sig-preview-wrap">
                  <img src={signatureDataUrl} alt="ลายเซ็นที่อัปโหลด" className="sig-preview-img" />
                  <button type="button" className="button primary" onClick={() => {
                    if (file) {
                      loadPageImage(file, currentPage);
                      setStep('place');
                    }
                  }}>
                    <Check size={16} /> ใช้ลายเซ็นนี้
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            className="button small secondary"
            style={{ marginTop: 12 }}
            onClick={() => setStep('select')}
          >
            <ArrowLeft size={14} /> เลือกไฟล์ใหม่
          </button>
        </div>
      ) : (
        /* STAGE 3: PLACE SIGNATURE ON PDF */
        <div className={`sig-workspace ${isFullscreen ? 'is-fullscreen' : ''}`}>
          {/* Toolbar */}
          <div className="note-top-toolbar">
            {/* Left: File & Page */}
            <div className="note-toolbar-group">
              <button
                type="button"
                className="button small secondary"
                onClick={() => setStep('draw')}
                title="เปลี่ยนลายเซ็น"
              >
                <PenTool size={14} /> เปลี่ยนลายเซ็น
              </button>

              <div className="note-page-nav">
                <button
                  type="button"
                  className="page-nav-btn"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="page-indicator">
                  หน้า <strong>{currentPage}</strong> / {totalPages}
                </span>
                <button
                  type="button"
                  className="page-nav-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Center: Info */}
            <div className="sig-toolbar-info">
              <span className="sig-count-badge">
                <PenTool size={13} /> ลายเซ็น {placedSignatures.length} จุด
              </span>
              <span className="strip-hint" style={{ fontSize: 12 }}>
                💡 คลิกบนหน้ากระดาษเพื่อวางลายเซ็น แล้วลากเพื่อย้ายตำแหน่ง
              </span>
            </div>

            {/* Right: Zoom & Export */}
            <div className="note-toolbar-group">
              <div className="note-zoom-controls">
                <button
                  type="button"
                  className="page-nav-btn"
                  onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.15))}
                >
                  <ZoomOut size={15} />
                </button>
                <span className="zoom-label">{Math.round(zoomLevel * 100)}%</span>
                <button
                  type="button"
                  className="page-nav-btn"
                  onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.15))}
                >
                  <ZoomIn size={15} />
                </button>
              </div>

              <button
                type="button"
                className="button small secondary"
                onClick={() => setIsFullscreen((f) => !f)}
                title={isFullscreen ? 'ออกจากเต็มจอ' : 'ขยายเต็มจอ'}
              >
                {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>

              <button
                type="button"
                className="button primary"
                disabled={processing || !placedSignatures.length}
                onClick={handleProcess}
              >
                {processing ? 'กำลังส่งออก…' : 'บันทึก PDF →'}
              </button>
            </div>
          </div>

          {/* Canvas area */}
          <div className="note-canvas-stage">
            <div
              className="note-sheet-wrapper"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top center',
              }}
            >
              {pageImages[currentPage] ? (
                <img
                  ref={imageRef}
                  key={`page-${currentPage}-${pageImages[currentPage]}`}
                  src={pageImages[currentPage]}
                  alt={`หน้า ${currentPage}`}
                  className="sig-base-img"
                  draggable={false}
                  onClick={handlePlaceSignature}
                  onError={() => {
                    if (file) loadPageImage(file, currentPage, true);
                  }}
                />
              ) : (
                <div className="note-loading-sheet">
                  <span>{loadingPage ? 'กำลังโหลดหน้า…' : `กำลังโหลดหน้า ${currentPage}…`}</span>
                </div>
              )}

              {/* Placed signatures on this page */}
              {sigsOnPage.map((sig) => (
                <div
                  key={sig.id}
                  className={`sig-placed ${activeSignatureId === sig.id ? 'active' : ''}`}
                  style={{
                    left: `${sig.x * 100}%`,
                    top: `${sig.y * 100}%`,
                    width: `${sig.width * 100}%`,
                  }}
                  onPointerDown={(e) => handleSigPointerDown(e, sig)}
                >
                  <img src={sig.image} alt="ลายเซ็น" draggable={false} />
                  {activeSignatureId === sig.id && (
                    <div className="sig-controls">
                      <label className="sig-size-control" onPointerDown={(e) => e.stopPropagation()}>
                        <span>ขนาด {Math.round(sig.width * 100)}%</span>
                        <input
                          type="range"
                          min="8"
                          max="60"
                          step="1"
                          value={Math.round(sig.width * 100)}
                          onChange={(e) => setPlacedSignatures((prev) => prev.map((s) => s.id === sig.id ? { ...s, width: Number(e.target.value) / 100 } : s))}
                        />
                      </label>
                      <button
                        type="button"
                        className="sig-ctrl-btn"
                        onClick={(e) => { e.stopPropagation(); handleResizeSignature(sig.id, -0.03); }}
                        title="ย่อ"
                      >−</button>
                      <button
                        type="button"
                        className="sig-ctrl-btn"
                        onClick={(e) => { e.stopPropagation(); handleResizeSignature(sig.id, 0.03); }}
                        title="ขยาย"
                      >+</button>
                      <button
                        type="button"
                        className="sig-ctrl-btn danger"
                        onClick={(e) => { e.stopPropagation(); handleRemoveSignature(sig.id); }}
                        title="ลบ"
                      >✕</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {message && <p className="tool-message">{message}</p>}
    </div>
  );
}
