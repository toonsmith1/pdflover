import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Highlighter,
  Pen,
  StickyNote,
  Square,
  Eraser,
  Undo2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ArrowLeft,
  ArrowRight,
  FileText,
  Sparkles,
  Check,
  Plus,
  Palette,
  Type,
} from 'lucide-react';
import DropZone from '../common/DropZone';
import DownloadScreen from '../common/DownloadScreen';

const HIGHLIGHTER_COLORS = [
  { value: '#ffeb3b', label: 'เหลืองนีออน' },
  { value: '#69f0ae', label: 'เขียวมิ้นต์' },
  { value: '#ff80ab', label: 'ชมพูสด' },
  { value: '#80d8ff', label: 'ฟ้าพาสเทล' },
  { value: '#ffd180', label: 'ส้มพีช' },
];

const PEN_COLORS = [
  { value: '#222222', label: 'ดำสนิท' },
  { value: '#79352f', label: 'แดงคลาสสิก' },
  { value: '#1e3a8a', label: 'น้ำเงิน' },
  { value: '#15803d', label: 'เขียวเข้ม' },
  { value: '#b45309', label: 'บรอนซ์' },
];

const NOTE_COLORS = [
  { bg: '#fff9c4', border: '#fbc02d', text: '#3e2723', label: 'เหลืองคลาสสิก' },
  { bg: '#e8f5e9', border: '#81c784', text: '#1b5e20', label: 'เขียวสบายตา' },
  { bg: '#fce4ec', border: '#f48fb1', text: '#880e4f', label: 'ชมพูอ่อน' },
  { bg: '#f7f4ed', border: '#d5cec5', text: '#3c3630', label: 'ครีมธรรมชาติ' },
];

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

function hitStroke(stroke, ex, ey, radius = 24) {
  if (stroke.tool === 'rect') {
    const x1 = stroke.x;
    const y1 = stroke.y;
    const x2 = stroke.x + stroke.widthPx;
    const y2 = stroke.y + stroke.heightPx;
    const dTop = distanceToSegment(ex, ey, x1, y1, x2, y1);
    const dBottom = distanceToSegment(ex, ey, x1, y2, x2, y2);
    const dLeft = distanceToSegment(ex, ey, x1, y1, x1, y2);
    const dRight = distanceToSegment(ex, ey, x2, y1, x2, y2);
    return Math.min(dTop, dBottom, dLeft, dRight) <= radius;
  }
  if (!stroke.points || stroke.points.length === 0) return false;
  if (stroke.points.length === 1) {
    const p = stroke.points[0];
    return Math.hypot(p.x - ex, p.y - ey) <= radius;
  }
  for (let i = 0; i < stroke.points.length - 1; i++) {
    const p1 = stroke.points[i];
    const p2 = stroke.points[i + 1];
    if (distanceToSegment(ex, ey, p1.x, p1.y, p2.x, p2.y) <= radius) {
      return true;
    }
  }
  return false;
}

export default function NoteTool() {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('select'); // 'select' | 'annotate' | 'download'
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageImages, setPageImages] = useState({}); // { 1: url, 2: url }
  const [loadingPage, setLoadingPage] = useState(false);

  // Active Tool & Settings
  const [activeTool, setActiveTool] = useState('highlighter'); // 'highlighter' | 'pen' | 'rect' | 'note' | 'text' | 'eraser'
  const [penColor, setPenColor] = useState('#79352f');
  const [penWidth, setPenWidth] = useState(4);
  const [highlighterColor, setHighlighterColor] = useState('#ffeb3b');
  const [highlighterWidth, setHighlighterWidth] = useState(24);
  const [noteBg, setNoteBg] = useState(NOTE_COLORS[0]);
  const [textSize, setTextSize] = useState(18);
  const [textColor, setTextColor] = useState('#222222');

  // Per-page annotations: { [pageNum]: { strokes: [], notes: [] } }
  const [pageAnnotations, setPageAnnotations] = useState({});
  const [activeNoteId, setActiveNoteId] = useState(null);

  // View state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Processing & Export
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [resultUrl, setResultUrl] = useState('');

  // Canvas Refs
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef(null);
  const containerRef = useRef(null);
  const historyStackRef = useRef({});
  const urlsRef = useRef(new Set());
  const pageImagesRef = useRef({});

  const saveSnapshot = useCallback(() => {
    const pageData = pageAnnotations[currentPage] || { strokes: [], notes: [] };
    if (!historyStackRef.current[currentPage]) {
      historyStackRef.current[currentPage] = [];
    }
    historyStackRef.current[currentPage].push(JSON.parse(JSON.stringify(pageData)));
    if (historyStackRef.current[currentPage].length > 40) {
      historyStackRef.current[currentPage].shift();
    }
  }, [pageAnnotations, currentPage]);

  // Cleanup object URLs ONLY on unmount
  useEffect(() => {
    return () => {
      urlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });
      urlsRef.current.clear();
    };
  }, []);

  // Load a page image
  const loadPageImage = useCallback(async (selectedFile, pageNum, force = false) => {
    if (!force && pageImagesRef.current[pageNum]) return;
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

  // Handle Initial File Selection
  const handleFile = async (files) => {
    if (!files.length) return;
    const selected = files[0];

    urlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    });
    urlsRef.current.clear();
    pageImagesRef.current = {};
    setPageImages({});

    setFile(selected);
    setMessage('');
    setCurrentPage(1);
    setPageAnnotations({});

    const body = new FormData();
    body.append('file', selected);

    try {
      const infoRes = await fetch('/api/pdf-info', { method: 'POST', body });
      if (infoRes.ok) {
        const infoData = await infoRes.json();
        setTotalPages(infoData.pages || 1);
      }
      await loadPageImage(selected, 1);
      setStep('annotate');
    } catch {
      setStep('annotate');
    }
  };

  // Change page
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    if (file && !pageImages[newPage]) {
      loadPageImage(file, newPage);
    }
  };

  // Get current page data
  const currentData = pageAnnotations[currentPage] || { strokes: [], notes: [] };

  // Redraw Canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const strokes = (pageAnnotations[currentPage] && pageAnnotations[currentPage].strokes) || [];

    strokes.forEach((stroke) => {
      ctx.save();
      if (stroke.tool === 'highlighter') {
        ctx.globalAlpha = 0.42;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        stroke.points.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      } else if (stroke.tool === 'pen') {
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        stroke.points.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      } else if (stroke.tool === 'rect') {
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.strokeRect(stroke.x, stroke.y, stroke.widthPx, stroke.heightPx);
      }
      ctx.restore();
    });
  }, [pageAnnotations, currentPage]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Coordinate helper
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Erase strokes touching coordinate
  const eraseAtCoords = (coords) => {
    setPageAnnotations((prev) => {
      const pageData = prev[currentPage] || { strokes: [], notes: [] };
      const remainingStrokes = pageData.strokes.filter(
        (s) => !hitStroke(s, coords.x, coords.y, 22)
      );
      if (remainingStrokes.length !== pageData.strokes.length) {
        return {
          ...prev,
          [currentPage]: {
            ...pageData,
            strokes: remainingStrokes,
          },
        };
      }
      return prev;
    });
  };

  // Drawing Handlers
  const handleMouseDown = (e) => {
    const coords = getCanvasCoords(e);

    if (activeTool === 'note' || activeTool === 'text') {
      saveSnapshot();
      const newNote = {
        id: `note_${Date.now()}`,
        x: coords.x,
        y: coords.y,
        text: activeTool === 'text' ? 'พิมพ์ข้อความ…' : 'ข้อความบันทึก…',
        kind: activeTool,
        size: activeTool === 'text' ? textSize : 14,
        bg: activeTool === 'text' ? 'transparent' : noteBg.bg,
        border: activeTool === 'text' ? 'transparent' : noteBg.border,
        color: activeTool === 'text' ? textColor : noteBg.text,
      };
      setPageAnnotations((prev) => {
        const pageData = prev[currentPage] || { strokes: [], notes: [] };
        return {
          ...prev,
          [currentPage]: {
            ...pageData,
            notes: [...pageData.notes, newNote],
          },
        };
      });
      setActiveNoteId(newNote.id);
      return;
    }

    if (activeTool === 'eraser') {
      saveSnapshot();
      isDrawingRef.current = true;
      eraseAtCoords(coords);
      return;
    }

    saveSnapshot();
    isDrawingRef.current = true;

    if (activeTool === 'rect') {
      currentStrokeRef.current = {
        tool: 'rect',
        startX: coords.x,
        startY: coords.y,
        color: penColor,
        width: penWidth,
      };
    } else {
      currentStrokeRef.current = {
        tool: activeTool,
        color: activeTool === 'highlighter' ? highlighterColor : penColor,
        width: activeTool === 'highlighter' ? highlighterWidth : penWidth,
        points: [coords],
      };
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawingRef.current) return;

    if (activeTool === 'eraser') {
      const coords = getCanvasCoords(e);
      eraseAtCoords(coords);
      return;
    }

    if (!currentStrokeRef.current) return;
    const coords = getCanvasCoords(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (currentStrokeRef.current.tool === 'rect') {
      redrawCanvas();
      const s = currentStrokeRef.current;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      const w = coords.x - s.startX;
      const h = coords.y - s.startY;
      ctx.strokeRect(s.startX, s.startY, w, h);
      ctx.restore();
    } else {
      currentStrokeRef.current.points.push(coords);
      const s = currentStrokeRef.current;
      const pts = s.points;
      if (pts.length > 1) {
        ctx.save();
        if (s.tool === 'highlighter') {
          ctx.globalAlpha = 0.42;
          ctx.strokeStyle = s.color;
          ctx.lineWidth = s.width;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        } else {
          ctx.globalAlpha = 1.0;
          ctx.strokeStyle = s.color;
          ctx.lineWidth = s.width;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }
        ctx.beginPath();
        ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.stroke();
        ctx.restore();
      }
    }
  };

  const handleMouseUp = (e) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (activeTool === 'eraser') {
      return;
    }

    if (!currentStrokeRef.current) return;

    let completedStroke = null;
    if (currentStrokeRef.current.tool === 'rect') {
      const coords = getCanvasCoords(e);
      const s = currentStrokeRef.current;
      const w = coords.x - s.startX;
      const h = coords.y - s.startY;
      if (Math.abs(w) > 4 && Math.abs(h) > 4) {
        completedStroke = {
          tool: 'rect',
          x: Math.min(s.startX, s.startX + w),
          y: Math.min(s.startY, s.startY + h),
          widthPx: Math.abs(w),
          heightPx: Math.abs(h),
          color: s.color,
          width: s.width,
        };
      }
    } else if (currentStrokeRef.current.points.length > 1) {
      completedStroke = currentStrokeRef.current;
    }

    currentStrokeRef.current = null;

    if (completedStroke) {
      setPageAnnotations((prev) => {
        const pageData = prev[currentPage] || { strokes: [], notes: [] };
        return {
          ...prev,
          [currentPage]: {
            ...pageData,
            strokes: [...pageData.strokes, completedStroke],
          },
        };
      });
    } else {
      redrawCanvas();
    }
  };

  // Undo Last Action (from snapshot history)
  const handleUndo = () => {
    const stack = historyStackRef.current[currentPage];
    if (stack && stack.length > 0) {
      const prevState = stack.pop();
      setPageAnnotations((prev) => ({
        ...prev,
        [currentPage]: prevState,
      }));
      return;
    }

    // Fallback: pop last stroke or note
    setPageAnnotations((prev) => {
      const pageData = prev[currentPage] || { strokes: [], notes: [] };
      if (pageData.strokes.length > 0) {
        return {
          ...prev,
          [currentPage]: {
            ...pageData,
            strokes: pageData.strokes.slice(0, -1),
          },
        };
      }
      if (pageData.notes.length > 0) {
        return {
          ...prev,
          [currentPage]: {
            ...pageData,
            notes: pageData.notes.slice(0, -1),
          },
        };
      }
      return prev;
    });
  };

  // Clear current page annotations with confirmation and undoable snapshot
  const handleClearPage = () => {
    const pageData = pageAnnotations[currentPage];
    if (!pageData || (!pageData.strokes?.length && !pageData.notes?.length)) return;
    if (!window.confirm('ต้องการล้างลายเส้นและโน้ตทั้งหมดในหน้านี้ใช่หรือไม่? (สามารถกดย้อนกลับ Undo เพื่อกู้คืนได้)')) {
      return;
    }
    saveSnapshot();
    setPageAnnotations((prev) => ({
      ...prev,
      [currentPage]: { strokes: [], notes: [] },
    }));
  };

  // Update note text
  const handleUpdateNote = (id, newText) => {
    setPageAnnotations((prev) => {
      const pageData = prev[currentPage] || { strokes: [], notes: [] };
      return {
        ...prev,
        [currentPage]: {
          ...pageData,
          notes: pageData.notes.map((n) => (n.id === id ? { ...n, text: newText } : n)),
        },
      };
    });
  };

  // Delete note
  const handleDeleteNote = (id) => {
    saveSnapshot();
    setPageAnnotations((prev) => {
      const pageData = prev[currentPage] || { strokes: [], notes: [] };
      return {
        ...prev,
        [currentPage]: {
          ...pageData,
          notes: pageData.notes.filter((n) => n.id !== id),
        },
      };
    });
  };

  // Export & Process
  const handleProcess = async () => {
    if (!file || processing) return;

    setProcessing(true);
    setMessage('');

    try {
      // Build PNG overlays for all pages that have annotations
      const overlays = {};
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1700;
      const ctx = canvas.getContext('2d');

      for (const [pNum, data] of Object.entries(pageAnnotations)) {
        if (!data.strokes.length && !data.notes.length) continue;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Draw strokes (Highlighter, Pen, Rect)
        data.strokes.forEach((stroke) => {
          ctx.save();
          if (stroke.tool === 'highlighter') {
            ctx.globalAlpha = 0.42;
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            stroke.points.forEach((pt, idx) => {
              if (idx === 0) ctx.moveTo(pt.x, pt.y);
              else ctx.lineTo(pt.x, pt.y);
            });
            ctx.stroke();
          } else if (stroke.tool === 'pen') {
            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            stroke.points.forEach((pt, idx) => {
              if (idx === 0) ctx.moveTo(pt.x, pt.y);
              else ctx.lineTo(pt.x, pt.y);
            });
            ctx.stroke();
          } else if (stroke.tool === 'rect') {
            ctx.globalAlpha = 0.9;
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.width;
            ctx.strokeRect(stroke.x, stroke.y, stroke.widthPx, stroke.heightPx);
          }
          ctx.restore();
        });

        // 2. Draw Sticky Notes
        data.notes.forEach((note) => {
          ctx.save();
          const w = note.kind === 'text' ? 420 : 180;
          const h = note.kind === 'text' ? 70 : 100;
          // Card Box
          ctx.fillStyle = note.bg;
          ctx.strokeStyle = note.border;
          ctx.lineWidth = 1.5;
          ctx.fillRect(note.x, note.y, w, h);
          ctx.strokeRect(note.x, note.y, w, h);

          // Text content
          ctx.fillStyle = note.color;
          ctx.font = '14px sans-serif';
          const lines = note.text.split('\n');
          lines.slice(0, 4).forEach((line, lineIdx) => {
          ctx.font = `${note.size || 14}px sans-serif`;
          ctx.fillText(line, note.x + (note.kind === 'text' ? 0 : 10), note.y + (note.kind === 'text' ? note.size || 18 : 24) + lineIdx * ((note.size || 14) + 4));
          });
          ctx.restore();
        });

        overlays[pNum] = canvas.toDataURL('image/png');
      }

      const body = new FormData();
      body.append('file', file);
      body.append('overlays', JSON.stringify(overlays));

      const res = await fetch('/api/note', { method: 'POST', body });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'ไม่สามารถบันทึกโน้ตและไฮไลต์ได้');
      }
      const blob = await res.blob();
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setStep('download');
      setMessage('บันทึกโน้ตและไฮไลต์ลงใน PDF เรียบร้อยแล้ว');
    } catch (err) {
      setMessage(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const annotatedPageCount = Object.keys(pageAnnotations).filter(
    (k) => pageAnnotations[k].strokes?.length || pageAnnotations[k].notes?.length
  ).length;

  return (
    <div className="panel note-panel">
      <p className="merge-step">
        {step === 'select'
          ? '01 / เลือกเอกสาร PDF'
          : step === 'annotate'
          ? '02 / จดโน้ต ไฮไลต์ และวาดเขียนทับเอกสาร'
          : '03 / ดาวน์โหลดเอกสาร'}
      </p>

      {/* STAGE 3: DOWNLOAD SCREEN */}
      {step === 'download' && resultUrl ? (
        <DownloadScreen
          downloadUrl={resultUrl}
          filename={`annotated_${file?.name || 'document.pdf'}`}
          title="บันทึกโน้ตและไฮไลต์สำเร็จแล้ว!"
          subtitle={`เอกสารได้รับการบันทึกลายเส้น ไฮไลต์ และโน้ต (${annotatedPageCount} หน้าที่ได้รับการแก้ไข) เรียบร้อย`}
          onBack={() => setStep('annotate')}
          backLabel="← กลับไปแก้ไขเพิ่มเติม"
          onReset={() => {
            urlsRef.current.forEach((u) => {
              try {
                URL.revokeObjectURL(u);
              } catch {
                // ignore
              }
            });
            urlsRef.current.clear();
            pageImagesRef.current = {};
            setStep('select');
            setFile(null);
            setPageAnnotations({});
            setPageImages({});
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
      ) : (
        /* STAGE 2: NOTE & HIGHLIGHT WORKSPACE */
        <div className={`note-workspace ${isFullscreen ? 'is-fullscreen' : ''}`}>
          {/* TOOLBAR */}
          <div className="note-top-toolbar">
            {/* Left: File & Page navigation */}
            <div className="note-toolbar-group">
              <button
                type="button"
                className="button small secondary"
                onClick={() => setStep('select')}
                title="เลือกไฟล์ใหม่"
              >
                <ArrowLeft size={14} /> เปลี่ยนไฟล์
              </button>

              <div className="note-page-nav">
                <button
                  type="button"
                  className="page-nav-btn"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  title="หน้าก่อนหน้า"
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
                  title="หน้าถัดไป"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Center: Tools Switcher */}
            <div className="note-tools-bar">
              {/* 1. Highlighter */}
              <button
                type="button"
                className={`note-tool-btn ${activeTool === 'highlighter' ? 'active' : ''}`}
                onClick={() => setActiveTool('highlighter')}
                title="ปากกาเน้นข้อความ / ไฮไลต์"
              >
                <Highlighter size={16} />
                <span>ไฮไลต์</span>
              </button>

              {/* 2. Pen */}
              <button
                type="button"
                className={`note-tool-btn ${activeTool === 'pen' ? 'active' : ''}`}
                onClick={() => setActiveTool('pen')}
                title="ปากกาเขียนทับ / วาดเส้น"
              >
                <Pen size={16} />
                <span>ปากกา</span>
              </button>

              {/* 3. Sticky Note */}
              <button
                type="button"
                className={`note-tool-btn ${activeTool === 'note' ? 'active' : ''}`}
                onClick={() => setActiveTool('note')}
                title="แปะกระดาษโน้ต / บันทึกข้อความ"
              >
                <StickyNote size={16} />
                <span>จดโน้ต</span>
              </button>

              <button
                type="button"
                className={`note-tool-btn ${activeTool === 'text' ? 'active' : ''}`}
                onClick={() => setActiveTool('text')}
                title="เพิ่มข้อความบนหน้าเอกสาร"
              >
                <Type size={16} />
                <span>ข้อความ</span>
              </button>

              {/* 4. Rectangle Outline */}
              <button
                type="button"
                className={`note-tool-btn ${activeTool === 'rect' ? 'active' : ''}`}
                onClick={() => setActiveTool('rect')}
                title="ตีกรอบสี่เหลี่ยม / เน้นจุดสำคัญ"
              >
                <Square size={16} />
                <span>กรอบ</span>
              </button>

              {/* 5. Eraser */}
              <button
                type="button"
                className={`note-tool-btn ${activeTool === 'eraser' ? 'active' : ''}`}
                onClick={() => setActiveTool('eraser')}
                title="ยางลบ / ลบเฉพาะลายเส้นหรือไฮไลต์ที่ต้องการ"
              >
                <Eraser size={16} />
                <span>ยางลบ</span>
              </button>

              {/* Divider */}
              <span className="note-tool-divider" />

              {/* Undo & Clear */}
              <button
                type="button"
                className="note-tool-btn text-muted"
                onClick={handleUndo}
                title="ย้อนกลับ (Undo - กู้คืนสิ่งที่ลบได้)"
              >
                <Undo2 size={16} />
                <span>ย้อนกลับ</span>
              </button>

              <button
                type="button"
                className="note-tool-btn text-danger"
                onClick={handleClearPage}
                title="ล้างที่วาดในหน้านี้ทั้งหมด (Clear Page)"
              >
                <Trash2 size={16} />
                <span>ล้างทั้งหน้า</span>
              </button>
            </div>

            {/* Right: Zoom & Export */}
            <div className="note-toolbar-group">
              <div className="note-zoom-controls">
                <button
                  type="button"
                  className="page-nav-btn"
                  onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.15))}
                  title="ย่อขนาด"
                >
                  <ZoomOut size={15} />
                </button>
                <span className="zoom-label">{Math.round(zoomLevel * 100)}%</span>
                <button
                  type="button"
                  className="page-nav-btn"
                  onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.15))}
                  title="ขยายขนาด"
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
                className="button primary note-save-btn"
                disabled={processing}
                onClick={handleProcess}
              >
                {processing ? 'กำลังส่งออก…' : 'บันทึก PDF →'}
              </button>
            </div>
          </div>

          {/* SECONDARY TOOL SETTINGS STRIP */}
          <div className="note-sub-strip">
            {activeTool === 'highlighter' && (
              <div className="sub-strip-options">
                <span className="strip-label">สีไฮไลต์:</span>
                <div className="color-dots">
                  {HIGHLIGHTER_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className={`color-dot ${highlighterColor === c.value ? 'active' : ''}`}
                      style={{ backgroundColor: c.value }}
                      onClick={() => setHighlighterColor(c.value)}
                      title={c.label}
                    />
                  ))}
                </div>
                <span className="strip-label">ขนาดเส้น:</span>
                <div className="size-selector">
                  {[16, 24, 34].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      className={`size-btn ${highlighterWidth === sz ? 'active' : ''}`}
                      onClick={() => setHighlighterWidth(sz)}
                    >
                      {sz === 16 ? 'เล็ก' : sz === 24 ? 'กลาง' : 'ใหญ่'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTool === 'pen' && (
              <div className="sub-strip-options">
                <span className="strip-label">สีปากกา:</span>
                <div className="color-dots">
                  {PEN_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className={`color-dot ${penColor === c.value ? 'active' : ''}`}
                      style={{ backgroundColor: c.value }}
                      onClick={() => setPenColor(c.value)}
                      title={c.label}
                    />
                  ))}
                </div>
                <span className="strip-label">ขนาดหัวปากกา:</span>
                <div className="size-selector">
                  {[2, 4, 8].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      className={`size-btn ${penWidth === sz ? 'active' : ''}`}
                      onClick={() => setPenWidth(sz)}
                    >
                      {sz === 2 ? 'บาง' : sz === 4 ? 'ปกติ' : 'หนา'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTool === 'note' && (
              <div className="sub-strip-options">
                <span className="strip-label">สีกระดาษโน้ต:</span>
                <div className="note-color-picker">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c.bg}
                      type="button"
                      className={`note-color-chip ${noteBg.bg === c.bg ? 'active' : ''}`}
                      style={{ backgroundColor: c.bg, borderColor: c.border }}
                      onClick={() => setNoteBg(c)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <span className="strip-hint">💡 คลิกบนจุดใดก็ได้บนหน้ากระดาษเพื่อแปะโน้ต</span>
              </div>
            )}

            {activeTool === 'text' && (
              <div className="sub-strip-options">
                <span className="strip-label">ขนาด:</span>
                {[14, 18, 24, 32].map((size) => (
                  <button key={size} type="button" className={`size-btn ${textSize === size ? 'active' : ''}`} onClick={() => setTextSize(size)}>{size}</button>
                ))}
                <span className="strip-label">สี:</span>
                {PEN_COLORS.map((c) => (
                  <button key={c.value} type="button" className={`color-dot ${textColor === c.value ? 'active' : ''}`} style={{ backgroundColor: c.value }} onClick={() => setTextColor(c.value)} title={c.label} />
                ))}
                <span className="strip-hint">คลิกบนหน้าเอกสารเพื่อเพิ่มข้อความ แล้วแก้ไขในกล่องข้อความ</span>
              </div>
            )}

            {activeTool === 'rect' && (
              <div className="sub-strip-options">
                <span className="strip-label">สีกรอบ:</span>
                <div className="color-dots">
                  {PEN_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className={`color-dot ${penColor === c.value ? 'active' : ''}`}
                      style={{ backgroundColor: c.value }}
                      onClick={() => setPenColor(c.value)}
                      title={c.label}
                    />
                  ))}
                </div>
                <span className="strip-hint">💡 ลากเมาส์เป็นสี่เหลี่ยมเพื่อสร้างกรอบเน้นข้อความ</span>
              </div>
            )}

            {activeTool === 'eraser' && (
              <div className="sub-strip-options">
                <span className="strip-hint">
                  🧹 โหมดยางลบ: คลิกหรือลากเมาส์ผ่านเส้นวาด ไฮไลต์ หรือกรอบ เพื่อลบเฉพาะจุดที่ต้องการ (หากเผลอลบ กดปุ่ม &quot;ย้อนกลับ&quot; เพื่อกู้คืนได้เสมอ)
                </span>
              </div>
            )}
          </div>

          {/* MAIN CANVAS VIEWER CONTAINER */}
          <div className="note-canvas-stage" ref={containerRef}>
            <div
              className="note-sheet-wrapper"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top center',
              }}
            >
              {/* 1. Underlying Rendered PDF Page Image */}
              {pageImages[currentPage] ? (
                <img
                  key={`page-${currentPage}-${pageImages[currentPage]}`}
                  src={pageImages[currentPage]}
                  alt={`หน้า ${currentPage}`}
                  className="note-base-img"
                  draggable={false}
                  onError={() => {
                    if (file) {
                      loadPageImage(file, currentPage, true);
                    }
                  }}
                />
              ) : (
                <div className="note-loading-sheet">
                  <span>กำลังโหลดหน้า {currentPage}…</span>
                </div>
              )}

              {/* 2. Drawing Canvas Overlay */}
              <canvas
                ref={canvasRef}
                width={1200}
                height={1700}
                className={`note-drawing-canvas tool-${activeTool}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />

              {/* 3. Interactive Sticky Notes */}
              {(currentData.notes || []).map((note) => (
                <div
                  key={note.id}
                  className={`interactive-sticky-note ${note.kind === 'text' ? 'interactive-text-note' : ''}`}
                  style={{
                    left: `${(note.x / 1200) * 100}%`,
                    top: `${(note.y / 1700) * 100}%`,
                    backgroundColor: note.bg,
                    borderColor: note.border,
                    color: note.color,
                  }}
                >
                  {note.kind !== 'text' && <div className="sticky-note-header">
                    <span className="sticky-pin">📌 โน้ต</span>
                    <button
                      type="button"
                      className="sticky-close-btn"
                      onClick={() => handleDeleteNote(note.id)}
                      title="ลบโน้ตนี้"
                    >
                      ×
                    </button>
                  </div>}
                  <textarea
                    value={note.text}
                    onChange={(e) => handleUpdateNote(note.id, e.target.value)}
                    placeholder="พิมพ์โน้ตที่นี่…"
                    rows={3}
                  />
                </div>
              ))}
            </div>
          </div>

          {message && <p className="message note-msg">{message}</p>}
        </div>
      )}
    </div>
  );
}
