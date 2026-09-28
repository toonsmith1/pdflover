import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Type,
  Copy,
  Trash2,
  Plus,
  Minus,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ArrowLeft,
  ArrowRight,
  Layers,
  Sparkles,
  FileCheck,
} from 'lucide-react';
import DropZone from '../common/DropZone';
import PdfPreview from '../common/PdfPreview';
import DownloadScreen from '../common/DownloadScreen';

const FONTS = [
  { value: 'loma', label: 'Loma' },
  { value: 'krub', label: 'TH Krub' },
  { value: 'umpush', label: 'Umpush' },
];

const PRESET_COLORS = [
  '#222222', // Charcoal Black
  '#79352f', // Classic Red
  '#1e3a8a', // Navy Blue
  '#15803d', // Dark Emerald
  '#b45309', // Warm Bronze
];

export default function TextTool() {
  const [file, setFile] = useState(null);
  const [stage, setStage] = useState('select'); // 'select' | 'place' | 'process'
  const [imageUrl, setImageUrl] = useState('');
  const [loadingImage, setLoadingImage] = useState(false);
  const [baseImageScale, setBaseImageScale] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1); // 0.8, 1, 1.25, 1.5
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [items, setItems] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingInlineId, setEditingInlineId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [resultUrl, setResultUrl] = useState('');

  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const activeTextareaRef = useRef(null);

  const activeItem = items.find((item) => item.id === activeId) || null;

  const updateScale = useCallback(() => {
    if (imageRef.current && imageRef.current.naturalWidth) {
      const clientW = imageRef.current.clientWidth;
      const naturalW = imageRef.current.naturalWidth;
      setBaseImageScale((clientW / naturalW) * 1.5);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  const addItemAt = useCallback((x = 0.2, y = 0.3, text = 'ข้อความใหม่') => {
    const id = crypto.randomUUID();
    const newItem = {
      id,
      text,
      x: Math.max(0.05, Math.min(0.85, x)),
      y: Math.max(0.05, Math.min(0.95, y)),
      size: 18,
      font: 'loma',
      color: '#222222',
    };
    setItems((prev) => [...prev, newItem]);
    setActiveId(id);
    setTimeout(() => {
      activeTextareaRef.current?.focus();
    }, 60);
    return id;
  }, []);

  const duplicateActiveItem = () => {
    if (!activeItem) return;
    addItemAt(activeItem.x + 0.04, activeItem.y + 0.04, activeItem.text);
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (activeId === id) setActiveId(null);
    if (editingInlineId === id) setEditingInlineId(null);
  };

  const updateItem = (id, fields) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...fields } : item))
    );
  };

  const handleSelectFile = (files) => {
    if (!files.length) return;
    setFile(files[0]);
    setMessage('');
    setResultUrl('');
  };

  const handleLoadPreviewAndProceed = async () => {
    if (!file) return;
    setLoadingImage(true);
    setMessage('');

    const body = new FormData();
    body.append('file', file);

    try {
      const res = await fetch('/api/render-preview', { method: 'POST', body });
      if (!res.ok) throw new Error(await res.text() || 'สร้างภาพตัวอย่างไม่ได้');
      const blob = await res.blob();
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
      setStage('place');
      if (items.length === 0) {
        addItemAt(0.2, 0.25, 'เพิ่มข้อความที่นี่');
      }
    } catch (err) {
      setMessage(`เกิดข้อผิดพลาดในการโหลดตัวอย่าง: ${err.message}`);
    } finally {
      setLoadingImage(false);
    }
  };

  // Dragging and positioning
  const setPositionFromClientCoords = (clientX, clientY) => {
    if (!imageRef.current || !activeId) return;
    const rect = imageRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = Math.max(0, Math.min(0.95, (clientX - rect.left - dragOffsetRef.current.x) / rect.width));
    const y = Math.max(0.04, Math.min(1, (clientY - rect.top - dragOffsetRef.current.y) / rect.height));

    updateItem(activeId, { x, y });
  };

  const handleItemPointerDown = (e, item) => {
    if (editingInlineId === item.id) return; // Allow text selection when editing inline
    e.stopPropagation();
    setActiveId(item.id);
    setIsDragging(true);

    if (imageRef.current) {
      const imgRect = imageRef.current.getBoundingClientRect();
      const currentItemX = imgRect.left + item.x * imgRect.width;
      const currentItemY = imgRect.top + item.y * imgRect.height;
      dragOffsetRef.current = {
        x: e.clientX - currentItemX,
        y: e.clientY - currentItemY,
      };
    }
  };

  const handleCanvasPointerDown = (e) => {
    if (editingInlineId) {
      setEditingInlineId(null);
    }
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    if (activeId) {
      dragOffsetRef.current = { x: 0, y: 0 };
      setPositionFromClientCoords(e.clientX, e.clientY);
    } else {
      addItemAt(clickX, clickY, 'ข้อความใหม่');
    }
  };

  useEffect(() => {
    const handleGlobalPointerMove = (e) => {
      if (isDragging) {
        setPositionFromClientCoords(e.clientX, e.clientY);
      }
    };

    const handleGlobalPointerUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('pointermove', handleGlobalPointerMove);
      window.addEventListener('pointerup', handleGlobalPointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [isDragging, activeId]);

  // Keyboard shortcut (Escape to deselect)
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (stage !== 'place') return;
      if (e.key === 'Escape') {
        if (editingInlineId) {
          setEditingInlineId(null);
        } else if (activeId) {
          setActiveId(null);
        } else if (isFullscreen) {
          setIsFullscreen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stage, editingInlineId, activeId, isFullscreen]);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  const handleGoToProcess = () => {
    setIsFullscreen(false);
    const validItems = items.filter((item) => item.text.trim());
    if (validItems.length === 0) {
      setMessage('กรุณาเพิ่มข้อความอย่างน้อยหนึ่งรายการก่อนประมวลผล');
      return;
    }
    setMessage('กดปุ่มด้านล่างเพื่อฝังข้อความทั้งหมดลงใน PDF');
    setStage('process');
  };

  const handleProcessPdf = async () => {
    if (!file || processing) return;
    const validItems = items.filter((item) => item.text.trim());
    if (validItems.length === 0) {
      setMessage('กรุณาพิมพ์ข้อความอย่างน้อยหนึ่งรายการ');
      return;
    }

    setProcessing(true);
    setMessage('');

    // Transform coordinates: backend expects y from bottom (1 - y)
    const exportItems = validItems.map(({ text, x, y, size, font, color }) => ({
      text,
      x,
      y: 1 - y,
      size,
      font,
      color,
    }));

    const body = new FormData();
    body.append('file', file);
    body.append('items', JSON.stringify(exportItems));

    try {
      const res = await fetch('/api/text', { method: 'POST', body });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setStage('download');
      setMessage('ฝังข้อความลงในเอกสารเรียบร้อยแล้ว');
    } catch (err) {
      setMessage(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, []);

  return (
    <div className="panel text-tool">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p className="merge-step">
          {stage === 'select' && '01 / เลือกเอกสาร PDF'}
          {stage === 'place' && '02 / สตูดิโอจัดวางและพิมพ์ข้อความ'}
          {stage === 'process' && '03 / ประมวลผลเอกสาร'}
          {stage === 'download' && '03 / เอกสารพร้อมดาวน์โหลด'}
        </p>

        {stage === 'place' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="canvas-zoom-controls">
              <button
                type="button"
                className="zoom-btn"
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.15))}
                title="ย่อขนาดแสดงผล"
              >
                <ZoomOut size={13} />
              </button>
              <span className="zoom-text">{Math.round(zoomLevel * 100)}%</span>
              <button
                type="button"
                className="zoom-btn"
                onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.15))}
                title="ขยายขนาดแสดงผล"
              >
                <ZoomIn size={13} />
              </button>
              <button
                type="button"
                className="zoom-btn"
                onClick={() => setZoomLevel(1)}
                title="คืนค่า 100%"
              >
                <RotateCcw size={12} />
              </button>
            </div>

            <button
              type="button"
              className={`button small ${isFullscreen ? 'primary' : 'secondary'} fullscreen-toggle-btn`}
              onClick={toggleFullscreen}
              title={isFullscreen ? 'ย่อขนาดกลับปกติ (Esc)' : 'ขยายเต็มหน้าจอ'}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span>{isFullscreen ? 'ย่อขนาด (Esc)' : 'ขยายเต็มจอ'}</span>
            </button>
          </div>
        )}
      </div>

      {/* STAGE 1: File Selection */}
      {stage === 'select' && (
        <div className="tool-controls">
          <DropZone
            onFilesSelected={handleSelectFile}
            multiple={false}
            selectedFile={file}
            hintText="เลือกเอกสาร PDF เพื่อเปิดในสตูดิโอแก้ไขข้อความ"
            label={file ? `${file.name} (${(file.size / 1048576).toFixed(2)} MB)` : 'ยังไม่ได้เลือกไฟล์'}
          />

          <button
            type="button"
            className="button primary merge-next"
            disabled={!file || loadingImage}
            onClick={handleLoadPreviewAndProceed}
          >
            {loadingImage ? (
              <>กำลังเรนเดอร์ภาพหน้าเอกสาร…</>
            ) : (
              <>
                เข้าสู่สตูดิโอวางข้อความ <ArrowRight size={16} />
              </>
            )}
          </button>

          {message && <p className="message">{message}</p>}
        </div>
      )}

      {/* STAGE 2: Interactive Desktop Studio WYSIWYG Editor */}
      {stage === 'place' && (
        <div className="text-editor-stage">
          <div className={`text-workspace ${isFullscreen ? 'is-fullscreen' : ''}`}>
            {/* Studio Contextual Property Toolbar */}
            <div className="text-toolbar">
              <button
                type="button"
                className="button small primary"
                onClick={() => addItemAt(0.2, 0.3, 'ข้อความใหม่')}
              >
                <Type size={15} /> ＋ เพิ่มกล่องข้อความ
              </button>

              <div className="text-toolbar-divider" />

              {activeItem ? (
                <>
                  {/* Font Family */}
                  <div className="text-toolbar-group">
                    <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>ฟอนต์:</span>
                    <select
                      value={activeItem.font}
                      onChange={(e) => updateItem(activeItem.id, { font: e.target.value })}
                    >
                      {FONTS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Font Size Stepper */}
                  <div className="text-toolbar-group">
                    <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>ขนาด:</span>
                    <button
                      type="button"
                      style={{ padding: '4px 8px' }}
                      onClick={() =>
                        updateItem(activeItem.id, {
                          size: Math.max(8, activeItem.size - 2),
                        })
                      }
                      title="ลดขนาด"
                    >
                      <Minus size={12} />
                    </button>
                    <input
                      type="number"
                      min="8"
                      max="300"
                      style={{ width: '56px', textAlign: 'center' }}
                      value={activeItem.size}
                      onChange={(e) =>
                        updateItem(activeItem.id, {
                          size: Math.max(1, Number(e.target.value) || 16),
                        })
                      }
                    />
                    <button
                      type="button"
                      style={{ padding: '4px 8px' }}
                      onClick={() =>
                        updateItem(activeItem.id, {
                          size: Math.min(300, activeItem.size + 2),
                        })
                      }
                      title="เพิ่มขนาด"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Preset Colors + Native Color Dot Picker */}
                  <div className="text-toolbar-group">
                    <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>สี:</span>
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      {PRESET_COLORS.map((clr) => (
                        <button
                          key={clr}
                          type="button"
                          className="swatch-btn"
                          style={{
                            backgroundColor: clr,
                            border: activeItem.color === clr ? '2px solid var(--primary)' : '1px solid #c8c2b7',
                          }}
                          onClick={() => updateItem(activeItem.id, { color: clr })}
                        />
                      ))}
                      <label className="color-dot-picker" title="เลือกสีอื่น ๆ">
                        <span className="color-dot" style={{ backgroundColor: activeItem.color }} />
                        <input
                          type="color"
                          className="color-native-input"
                          value={activeItem.color}
                          onChange={(e) => updateItem(activeItem.id, { color: e.target.value })}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="text-toolbar-divider" />

                  {/* Duplicate & Delete */}
                  <button
                    type="button"
                    className="button small"
                    onClick={duplicateActiveItem}
                    title="สร้างสำเนาข้อความนี้"
                  >
                    <Copy size={13} /> ทำซ้ำ
                  </button>

                  <button
                    type="button"
                    className="button small btn-danger"
                    onClick={() => removeItem(activeItem.id)}
                    title="ลบกล่องข้อความนี้"
                  >
                    <Trash2 size={13} /> ลบ
                  </button>
                </>
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
                  💡 คลิกเลือกข้อความบนเอกสาร หรือคลิกบนผืนกระดาษเพื่อวางข้อความใหม่
                </span>
              )}

              {/* Right Toolbar Actions (Zoom & Fullscreen) */}
              <div
                className="text-toolbar-right"
                style={{
                  marginLeft: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div className="canvas-zoom-controls">
                  <button
                    type="button"
                    className="zoom-btn"
                    onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.15))}
                    title="ย่อขนาด"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <span className="zoom-text">{Math.round(zoomLevel * 100)}%</span>
                  <button
                    type="button"
                    className="zoom-btn"
                    onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.15))}
                    title="ขยายขนาด"
                  >
                    <ZoomIn size={13} />
                  </button>
                </div>

                <button
                  type="button"
                  className={`button small ${isFullscreen ? 'primary' : 'secondary'} fullscreen-btn`}
                  onClick={toggleFullscreen}
                  title={isFullscreen ? 'ย่อขนาดกลับปกติ (Esc)' : 'ขยายเต็มหน้าจอ'}
                >
                  {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                  <span>{isFullscreen ? 'ย่อขนาด (Esc)' : 'ขยายเต็มจอ'}</span>
                </button>

                {isFullscreen && (
                  <button
                    type="button"
                    className="button small primary"
                    onClick={handleGoToProcess}
                    style={{ marginLeft: '4px' }}
                    title="ไปขั้นตอนประมวลผล PDF"
                  >
                    <span>ไปประมวลผล</span>
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Studio Canvas Area & Layers Inspector */}
            <div className="text-editor-main">
              {/* Studio Desk Canvas */}
              <div className="text-canvas-area">
                <div
                  ref={canvasRef}
                  className="text-position-pad"
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
                  onPointerDown={handleCanvasPointerDown}
                >
                  <div id="text-canvas">
                    <img
                      ref={imageRef}
                      id="text-page-image"
                      src={imageUrl}
                      alt="ตัวอย่างหน้า PDF"
                      draggable={false}
                      onLoad={updateScale}
                    />

                    <div id="text-overlay">
                      {items.map((item) => {
                        const fontObj = FONTS.find((f) => f.value === item.font);
                        const fontFamily = fontObj ? fontObj.label : 'Loma';
                        const isSelected = activeId === item.id;
                        const isInlineEditing = editingInlineId === item.id;

                        return (
                          <div
                            key={item.id}
                            data-id={item.id}
                            className={`text-overlay-item ${isSelected ? 'active' : ''}`}
                            style={{
                              left: `${item.x * 100}%`,
                              top: `${item.y * 100}%`,
                              fontSize: `${item.size * baseImageScale}px`,
                              color: item.color,
                              fontFamily,
                            }}
                            onPointerDown={(e) => handleItemPointerDown(e, item)}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setActiveId(item.id);
                              setEditingInlineId(item.id);
                            }}
                          >
                            {isInlineEditing ? (
                              <textarea
                                autoFocus
                                className="inline-canvas-editor"
                                value={item.text}
                                onChange={(e) => updateItem(item.id, { text: e.target.value })}
                                onBlur={() => setEditingInlineId(null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') setEditingInlineId(null);
                                }}
                              />
                            ) : (
                              <span>{item.text || 'ดับเบิลคลิกพิมพ์ข้อความ...'}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar: Layers & Active Content Inspector */}
              <aside className="text-sidebar">
                <div className="layers-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={15} />
                    <span>เลเยอร์ข้อความ ({items.length})</span>
                  </div>
                  <button
                    type="button"
                    className="button small secondary"
                    style={{ padding: '2px 8px', minHeight: '26px' }}
                    onClick={() => addItemAt(0.25, 0.25, 'ข้อความใหม่')}
                  >
                    ＋ เพิ่ม
                  </button>
                </div>

                <div className="layers-list">
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`layer-item ${activeId === item.id ? 'active' : ''}`}
                      onClick={() => setActiveId(item.id)}
                    >
                      <span className="layer-item-title">
                        {idx + 1}. {item.text ? item.text.split('\n')[0] : 'ยังไม่มีข้อความ'}
                      </span>
                      <span className="layer-item-badge">
                        {item.size}pt
                      </span>
                      <button
                        type="button"
                        className="layer-item-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(item.id);
                        }}
                        title="ลบข้อความนี้"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', margin: '12px 0' }}>
                      ยังไม่มีกล่องข้อความ คลิกบนหน้ากระดาษเพื่อเริ่มวางข้อความ
                    </p>
                  )}
                </div>

                {activeItem && (
                  <div className="active-inspector">
                    <div className="active-inspector-head">
                      <span>แก้ไขข้อความในกล่องนี้</span>
                      <small style={{ color: 'var(--muted-foreground)', fontWeight: 400 }}>
                        {activeItem.text.split('\n').length} บรรทัด · {activeItem.text.length} ตัวอักษร
                      </small>
                    </div>
                    <textarea
                      ref={activeTextareaRef}
                      placeholder="พิมพ์หรือวางข้อความที่นี่ (กด Enter เพื่อขึ้นบรรทัดใหม่ได้หลายบรรทัด)"
                      value={activeItem.text}
                      onChange={(e) => updateItem(activeItem.id, { text: e.target.value })}
                    />
                    <p className="active-inspector-hint">
                      💡 1 กล่องพิมพ์ได้หลายบรรทัด หรือดับเบิลคลิกที่ข้อความบนหน้ากระดาษเพื่อพิมพ์ตรงนั้นได้ทันที
                    </p>
                  </div>
                )}
              </aside>
            </div>
          </div>

          <div className="text-stage-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setStage('select');
                setMessage('');
              }}
            >
              <ArrowLeft size={15} /> เปลี่ยนไฟล์เอกสาร
            </button>
            <button
              type="button"
              className="button primary"
              id="text-process-next"
              onClick={handleGoToProcess}
            >
              ไปขั้นตอนประมวลผล PDF <ArrowRight size={15} />
            </button>
          </div>

          {message && <p className="message">{message}</p>}
        </div>
      )}

      {/* STAGE 3: Process Execution */}
      {stage === 'process' && (
        <div className="tool-controls">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setStage('place');
                setMessage('');
              }}
            >
              <ArrowLeft size={15} /> กลับไปปรับแต่งข้อความ
            </button>
            <button
              type="button"
              className="button primary"
              id="run"
              disabled={processing}
              onClick={handleProcessPdf}
            >
              {processing ? <>กำลังฝังข้อความลงใน PDF…</> : <>เริ่มฝังข้อความลงในเอกสาร</>}
            </button>
          </div>

          {message && <p className="message">{message}</p>}
        </div>
      )}

      {/* STAGE 4: Dedicated Download Screen with Ad / Partner Card */}
      {stage === 'download' && resultUrl && (
        <DownloadScreen
          downloadUrl={resultUrl}
          filename={`text_${file?.name || 'document.pdf'}`}
          title="ฝังข้อความลงใน PDF สำเร็จแล้ว!"
          subtitle="ข้อความทั้งหมดถูกฝังลงในเอกสารอย่างคมชัด พร้อมดาวน์โหลดทันที"
          onBack={() => setStage('place')}
          backLabel="← กลับไปแก้ไขข้อความ"
          onReset={() => {
            setStage('select');
            setFile(null);
            setItems([]);
            setResultUrl('');
            setMessage('');
          }}
          resetLabel="แก้ไขไฟล์ใหม่"
        />
      )}
    </div>
  );
}
