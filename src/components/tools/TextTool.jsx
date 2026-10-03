import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  RotateCcw,
  Hand,
} from 'lucide-react';
import DropZone from '../common/DropZone';
import PdfPreview from '../common/PdfPreview';
import DownloadScreen from '../common/DownloadScreen';
import { useI18n } from '../../i18n/LanguageContext';

const FONT_GROUPS = {
  th: {
    label: { th: 'ฟอนต์ภาษาไทย (Thai)', en: 'Thai Fonts', ja: 'タイ語フォント' },
    fonts: [
      { value: 'th-sarabun-new', label: 'TH Sarabun New', family: "'TH Sarabun New', sans-serif" },
      { value: 'loma', label: 'Loma', family: "'Loma', sans-serif" },
      { value: 'krub', label: 'TH Krub', family: "'Kinnari', sans-serif" },
      { value: 'umpush', label: 'Umpush', family: "'Umpush', sans-serif" },
    ],
  },
  en: {
    label: { th: 'ฟอนต์สากล / อังกฤษ (English)', en: 'English / Latin Fonts', ja: '英語・ラテン文字フォント' },
    fonts: [
      { value: 'helvetica', label: 'Helvetica / Arial', family: 'Helvetica, Arial, sans-serif' },
      { value: 'times-roman', label: 'Times Roman', family: "'Times New Roman', Times, serif" },
      { value: 'courier', label: 'Courier', family: "'Courier New', Courier, monospace" },
    ],
  },
  ja: {
    label: { th: 'ฟอนต์ภาษาญี่ปุ่น (Japanese)', en: 'Japanese Fonts', ja: '日本語フォント' },
    fonts: [
      { value: 'heisei-kaku-go', label: 'Heisei Kaku Gothic (ゴシック)', family: "'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'Noto Sans JP', sans-serif" },
      { value: 'heisei-min', label: 'Heisei Mincho (明朝体)', family: "'Hiragino Mincho ProN', 'Yu Mincho', 'MS Mincho', 'Noto Serif JP', serif" },
    ],
  },
};

const ALL_FONTS = [
  ...FONT_GROUPS.th.fonts,
  ...FONT_GROUPS.en.fonts,
  ...FONT_GROUPS.ja.fonts,
];

const DEFAULT_FONT_BY_LANG = {
  th: 'th-sarabun-new',
  en: 'helvetica',
  ja: 'heisei-kaku-go',
};

const DEFAULT_TEXT_BY_LANG = {
  th: 'ข้อความใหม่',
  en: 'New Text',
  ja: '新しいテキスト',
};

const PRESET_COLORS = [
  '#222222', // Charcoal Black
  '#79352f', // Classic Red
  '#1e3a8a', // Navy Blue
  '#15803d', // Dark Emerald
  '#b45309', // Warm Bronze
];

export default function TextTool() {
  const { lang, t } = useI18n();
  const currentLang = lang || 'th';

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

  const [isPanMode, setIsPanMode] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const canvasAreaRef = useRef(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ startX: 0, startY: 0, initialPanX: 0, initialPanY: 0 });
  const isSpacePressedRef = useRef(false);
  const activeTextareaRef = useRef(null);
  const prevLangRef = useRef(currentLang);

  const activeItem = items.find((item) => item.id === activeId) || null;

  // Language-based font grouping order (active language first)
  const orderedGroupKeys = useMemo(() => {
    const primary = currentLang === 'ja' ? 'ja' : currentLang === 'en' ? 'en' : 'th';
    const others = ['th', 'en', 'ja'].filter((k) => k !== primary);
    return [primary, ...others];
  }, [currentLang]);

  // When user switches language, switch default font and update active item
  useEffect(() => {
    if (prevLangRef.current !== currentLang) {
      const newDefaultFont = DEFAULT_FONT_BY_LANG[currentLang] || 'th-sarabun-new';
      if (activeId) {
        setItems((prev) =>
          prev.map((item) => (item.id === activeId ? { ...item, font: newDefaultFont } : item))
        );
      }
      prevLangRef.current = currentLang;
    }
  }, [currentLang, activeId]);

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

  const addItemAt = useCallback(
    (x = 0.2, y = 0.3, text = null) => {
      const id = crypto.randomUUID();
      const defaultFont = DEFAULT_FONT_BY_LANG[currentLang] || 'th-sarabun-new';
      const defaultText = text || DEFAULT_TEXT_BY_LANG[currentLang] || 'ข้อความใหม่';
      const newItem = {
        id,
        text: defaultText,
        x: Math.max(0.05, Math.min(0.85, x)),
        y: Math.max(0.05, Math.min(0.95, y)),
        size: 18,
        font: defaultFont,
        color: '#222222',
      };
      setItems((prev) => [...prev, newItem]);
      setActiveId(id);
      setTimeout(() => {
        activeTextareaRef.current?.focus();
      }, 60);
      return id;
    },
    [currentLang]
  );

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
      setIsFullscreen(true);
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
      setIsPanMode(false);
      if (items.length === 0) {
        addItemAt(0.2, 0.25, DEFAULT_TEXT_BY_LANG[currentLang] || 'ข้อความใหม่');
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

    // Accounts for CSS transform zoom scale
    const offsetX = (clientX - dragOffsetRef.current.startX) / rect.width;
    const offsetY = (clientY - dragOffsetRef.current.startY) / rect.height;

    const x = Math.max(0, Math.min(0.95, dragOffsetRef.current.initialItemX + offsetX));
    const y = Math.max(0.04, Math.min(1, dragOffsetRef.current.initialItemY + offsetY));

    updateItem(activeId, { x, y });
  };

  const handleItemPointerDown = (e, item) => {
    if (isPanMode) {
      handleAreaPointerDown(e);
      return;
    }
    if (editingInlineId === item.id) return; // Allow text selection when editing inline
    e.stopPropagation();
    setActiveId(item.id);
    setIsDragging(true);

    dragOffsetRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialItemX: item.x,
      initialItemY: item.y,
    };
  };

  const handleAreaPointerDown = (e) => {
    // Left click or middle click starts panning
    if (e.button === 0 || e.button === 1) {
      setIsPanning(true);
      panStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialPanX: panOffset.x,
        initialPanY: panOffset.y,
      };
      e.preventDefault();
    }
  };

  const handleCanvasPointerDown = (e) => {
    if (isPanMode || e.button === 1) {
      handleAreaPointerDown(e);
      return;
    }

    if (editingInlineId) {
      setEditingInlineId(null);
    }
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    // If an item is active, clicking canvas deselects it (no jumping)
    if (activeId) {
      setActiveId(null);
    } else {
      addItemAt(clickX, clickY, 'ข้อความใหม่');
    }
  };

  useEffect(() => {
    const handleGlobalPointerMove = (e) => {
      if (isDragging) {
        setPositionFromClientCoords(e.clientX, e.clientY);
      } else if (isPanning) {
        const dx = e.clientX - panStartRef.current.startX;
        const dy = e.clientY - panStartRef.current.startY;
        setPanOffset({
          x: panStartRef.current.initialPanX + dx,
          y: panStartRef.current.initialPanY + dy,
        });
      }
    };

    const handleGlobalPointerUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
      if (isPanning) {
        setIsPanning(false);
      }
    };

    if (isDragging || isPanning) {
      window.addEventListener('pointermove', handleGlobalPointerMove);
      window.addEventListener('pointerup', handleGlobalPointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [isDragging, isPanning, activeId]);

  // Keyboard shortcut (Escape to deselect, Space to pan)
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
      if (
        e.code === 'Space' &&
        !isSpacePressedRef.current &&
        !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)
      ) {
        e.preventDefault();
        isSpacePressedRef.current = true;
        setIsPanMode(true);
        return;
      }
      if (e.key === 'Escape') {
        if (editingInlineId) {
          setEditingInlineId(null);
        } else if (activeId) {
          setActiveId(null);
        } else if (isFullscreen) {
          setIsFullscreen(false);
        }
      } else if (!editingInlineId && (e.key === '+' || e.key === '=')) {
        setZoomLevel((z) => Math.min(3.0, Number((z + 0.15).toFixed(2))));
      } else if (!editingInlineId && (e.key === '-' || e.key === '_')) {
        setZoomLevel((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))));
      } else if (!editingInlineId && e.key === '0') {
        setZoomLevel(1);
        setPanOffset({ x: 0, y: 0 });
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space' && isSpacePressedRef.current) {
        isSpacePressedRef.current = false;
        setIsPanMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [stage, editingInlineId, activeId, isFullscreen]);

  // Mouse wheel zoom support on canvas area
  const handleCanvasWheel = (e) => {
    if (editingInlineId) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.12 : -0.12;
    setZoomLevel((z) => Math.min(3.0, Math.max(0.4, Number((z + delta).toFixed(2)))));
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  const handleProcessPdf = async () => {
    if (!file || processing) return;
    const validItems = items.filter((item) => item.text.trim());
    if (validItems.length === 0) {
      setMessage('กรุณาพิมพ์ข้อความอย่างน้อยหนึ่งรายการ');
      return;
    }

    setIsFullscreen(false);
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
          {stage === 'select' && (currentLang === 'ja' ? '01 / PDFドキュメントを選択' : currentLang === 'en' ? '01 / Select PDF Document' : '01 / เลือกเอกสาร PDF')}
          {stage === 'place' && (currentLang === 'ja' ? '02 / テキスト編集スタジオ' : currentLang === 'en' ? '02 / Text Studio & Placement' : '02 / สตูดิโอจัดวางและพิมพ์ข้อความ')}
          {stage === 'download' && (currentLang === 'ja' ? '03 / プレビュー確認とダウンロード' : currentLang === 'en' ? '03 / Preview & Download PDF' : '03 / ตรวจสอบตัวอย่างและดาวน์โหลด PDF')}
        </p>

        {/* Top Header Step Indicator */}
      </div>

      {/* STAGE 1: File Selection */}
      {stage === 'select' && (
        <div className="tool-controls">
          <DropZone
            onFilesSelected={handleSelectFile}
            multiple={false}
            selectedFile={file}
            hintText={currentLang === 'ja' ? 'テキストを追加したいPDFファイルを選択してください' : currentLang === 'en' ? 'Select a PDF document to open in the Text Studio' : 'เลือกเอกสาร PDF เพื่อเปิดในสตูดิโอแก้ไขข้อความ'}
            label={file ? `${file.name} (${(file.size / 1048576).toFixed(2)} MB)` : undefined}
          />

          <button
            type="button"
            className="button primary merge-next"
            disabled={!file || loadingImage}
            onClick={handleLoadPreviewAndProceed}
          >
            {loadingImage ? (
              <>{currentLang === 'ja' ? 'ページプレビューを生成中…' : currentLang === 'en' ? 'Rendering page preview…' : 'กำลังเรนเดอร์ภาพหน้าเอกสาร…'}</>
            ) : (
              <>
                {currentLang === 'ja' ? 'テキスト編集スタジオへ' : currentLang === 'en' ? 'Enter Text Studio' : 'เข้าสู่สตูดิโอวางข้อความ'} <ArrowRight size={16} />
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
                onClick={() => {
                  setIsPanMode(false);
                  addItemAt(0.2, 0.3, DEFAULT_TEXT_BY_LANG[currentLang] || 'ข้อความใหม่');
                }}
              >
                <Type size={15} /> {currentLang === 'ja' ? '＋ テキストボックス追加' : currentLang === 'en' ? '＋ Add Text Box' : '＋ เพิ่มกล่องข้อความ'}
              </button>

              <button
                type="button"
                className={`button small ${isPanMode ? 'primary' : 'secondary'}`}
                onClick={() => {
                  setIsPanMode((prev) => !prev);
                  setActiveId(null);
                }}
                title={isPanMode ? (currentLang === 'ja' ? '移動モード終了' : currentLang === 'en' ? 'Exit Pan Mode' : 'กำลังเปิดโหมดจับเลื่อนหน้า (คลิกเพื่อปิด)') : (currentLang === 'ja' ? '画面を移動 (Spacebar)' : currentLang === 'en' ? 'Pan Page (Spacebar)' : 'จับเลื่อนหน้า PDF ซ้าย-ขวา ขึ้น-ลง (Spacebar)')}
              >
                <Hand size={15} /> <span>{isPanMode ? (currentLang === 'ja' ? '移動モード中' : currentLang === 'en' ? 'Panning' : 'โหมดจับเลื่อน') : (currentLang === 'ja' ? '画面を移動' : currentLang === 'en' ? 'Pan Page' : 'จับเลื่อนหน้า')}</span>
              </button>

              <div className="text-toolbar-divider" />

              {activeItem ? (
                <>
                  {/* Font Family */}
                  <div className="text-toolbar-group">
                    <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                      {currentLang === 'ja' ? 'フォント:' : currentLang === 'en' ? 'Font:' : 'ฟอนต์:'}
                    </span>
                    <select
                      value={activeItem.font}
                      onChange={(e) => updateItem(activeItem.id, { font: e.target.value })}
                    >
                      {orderedGroupKeys.map((groupKey) => {
                        const grp = FONT_GROUPS[groupKey];
                        return (
                          <optgroup key={groupKey} label={grp.label[currentLang] || grp.label.th}>
                            {grp.fonts.map((f) => (
                              <option key={f.value} value={f.value}>
                                {f.label}
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </select>
                  </div>

                  {/* Font Size Stepper */}
                  <div className="text-toolbar-group">
                    <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                      {currentLang === 'ja' ? 'サイズ:' : currentLang === 'en' ? 'Size:' : 'ขนาด:'}
                    </span>
                    <button
                      type="button"
                      style={{ padding: '4px 8px' }}
                      onClick={() =>
                        updateItem(activeItem.id, {
                          size: Math.max(8, activeItem.size - 2),
                        })
                      }
                      title={currentLang === 'ja' ? 'サイズ縮小' : currentLang === 'en' ? 'Decrease size' : 'ลดขนาด'}
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
                      title={currentLang === 'ja' ? 'サイズ拡大' : currentLang === 'en' ? 'Increase size' : 'เพิ่มขนาด'}
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Preset Colors + Native Color Dot Picker */}
                  <div className="text-toolbar-group">
                    <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                      {currentLang === 'ja' ? '色:' : currentLang === 'en' ? 'Color:' : 'สี:'}
                    </span>
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
                      <label className="color-dot-picker" title={currentLang === 'ja' ? 'カスタムカラー選択' : currentLang === 'en' ? 'Pick custom color' : 'เลือกสีอื่น ๆ'}>
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
                    title={currentLang === 'ja' ? '複製' : currentLang === 'en' ? 'Duplicate' : 'สร้างสำเนาข้อความนี้'}
                  >
                    <Copy size={13} /> {currentLang === 'ja' ? '複製' : currentLang === 'en' ? 'Duplicate' : 'ทำซ้ำ'}
                  </button>

                  <button
                    type="button"
                    className="button small btn-danger"
                    onClick={() => removeItem(activeItem.id)}
                    title={currentLang === 'ja' ? '削除' : currentLang === 'en' ? 'Delete' : 'ลบกล่องข้อความนี้'}
                  >
                    <Trash2 size={13} /> {currentLang === 'ja' ? '削除' : currentLang === 'en' ? 'Delete' : 'ลบ'}
                  </button>
                </>
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
                  {currentLang === 'ja'
                    ? '💡 ページ上の文字をクリックして選択、または用紙をクリックして新規追加'
                    : currentLang === 'en'
                    ? '💡 Click text on document or click canvas to add new text'
                    : '💡 คลิกเลือกข้อความบนเอกสาร หรือคลิกบนผืนกระดาษเพื่อวางข้อความใหม่'}
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
                    onClick={() => setZoomLevel((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
                    title={currentLang === 'ja' ? '縮小 (-)' : currentLang === 'en' ? 'Zoom Out (-)' : 'ย่อขนาด (-)'}
                  >
                    <ZoomOut size={13} />
                  </button>
                  <button
                    type="button"
                    className="zoom-btn"
                    onClick={() => {
                      setZoomLevel(1);
                      setPanOffset({ x: 0, y: 0 });
                    }}
                    title={currentLang === 'ja' ? '100%・中央揃え' : currentLang === 'en' ? 'Reset 100% and Center' : 'คืนค่าขนาด 100% และจัดกึ่งกลาง'}
                  >
                    <span className="zoom-text">{Math.round(zoomLevel * 100)}%</span>
                  </button>
                  <button
                    type="button"
                    className="zoom-btn"
                    onClick={() => setZoomLevel((z) => Math.min(3.0, Number((z + 0.15).toFixed(2))))}
                    title={currentLang === 'ja' ? '拡大 (+)' : currentLang === 'en' ? 'Zoom In (+)' : 'ขยายขนาด (+)'}
                  >
                    <ZoomIn size={13} />
                  </button>
                  <button
                    type="button"
                    className="zoom-btn"
                    onClick={() => {
                      setZoomLevel(1);
                      setPanOffset({ x: 0, y: 0 });
                    }}
                    title={currentLang === 'ja' ? '100%にリセット' : currentLang === 'en' ? 'Reset to 100%' : 'รีเซ็ตเป็น 100% และจัดกึ่งกลาง'}
                  >
                    <RotateCcw size={12} />
                  </button>
                </div>

                <button
                  type="button"
                  className={`button small ${isFullscreen ? 'primary' : 'secondary'} fullscreen-btn`}
                  onClick={toggleFullscreen}
                  title={isFullscreen ? (currentLang === 'ja' ? '全画面解除 (Esc)' : currentLang === 'en' ? 'Exit Fullscreen (Esc)' : 'ย่อขนาดกลับปกติ (Esc)') : (currentLang === 'ja' ? '全画面表示' : currentLang === 'en' ? 'Fullscreen' : 'ขยายเต็มหน้าจอ')}
                >
                  {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                  <span>{isFullscreen ? (currentLang === 'ja' ? '全画面解除' : currentLang === 'en' ? 'Exit (Esc)' : 'ย่อขนาด (Esc)') : (currentLang === 'ja' ? '全画面表示' : currentLang === 'en' ? 'Fullscreen' : 'ขยายเต็มจอ')}</span>
                </button>

                <button
                  type="button"
                  className="button small primary"
                  onClick={handleProcessPdf}
                  disabled={processing}
                  style={{ marginLeft: '4px' }}
                  title={currentLang === 'ja' ? '文字を埋め込んでPDFを作成' : currentLang === 'en' ? 'Embed text and generate PDF' : 'ฝังข้อความและสร้างเอกสาร PDF ทันที'}
                >
                  <FileCheck size={13} />
                  <span>{processing ? (currentLang === 'ja' ? '作成中…' : currentLang === 'en' ? 'Creating…' : 'กำลังสร้าง…') : (currentLang === 'ja' ? '今すぐPDF作成' : currentLang === 'en' ? 'Create PDF' : 'สร้าง PDF ทันที')}</span>
                </button>
              </div>
            </div>

            {/* Studio Canvas Area & Layers Inspector */}
            <div className="text-editor-main">
              {/* Studio Desk Canvas */}
              <div
                ref={canvasAreaRef}
                className={`text-canvas-area ${isPanMode ? 'is-pan-mode' : ''} ${isPanning ? 'is-panning' : ''}`}
                onWheel={handleCanvasWheel}
                onPointerDown={handleAreaPointerDown}
              >
                <div
                  ref={canvasRef}
                  className="text-position-pad"
                  style={{
                    transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoomLevel})`,
                    transformOrigin: 'center center',
                  }}
                  onPointerDown={handleCanvasPointerDown}
                >
                  <div id="text-canvas">
                    <img
                      ref={imageRef}
                      id="text-page-image"
                      src={imageUrl}
                      alt={currentLang === 'ja' ? 'PDFプレビュー' : currentLang === 'en' ? 'PDF Page Preview' : 'ตัวอย่างหน้า PDF'}
                      draggable={false}
                      onLoad={updateScale}
                    />

                    <div id="text-overlay">
                      {items.map((item) => {
                        const fontObj = ALL_FONTS.find((f) => f.value === item.font);
                        const fontFamily = fontObj ? fontObj.family : 'sans-serif';
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
                              <span>{item.text || (currentLang === 'ja' ? 'ダブルクリックで入力...' : currentLang === 'en' ? 'Double-click to type...' : 'ดับเบิลคลิกพิมพ์ข้อความ...')}</span>
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
                    <span>
                      {currentLang === 'ja'
                        ? `テキスト一覧 (${items.length})`
                        : currentLang === 'en'
                        ? `Text Boxes (${items.length})`
                        : `เลเยอร์ข้อความ (${items.length})`}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="button small secondary"
                    style={{ padding: '2px 8px', minHeight: '26px' }}
                    onClick={() => addItemAt(0.25, 0.25, DEFAULT_TEXT_BY_LANG[currentLang] || 'ข้อความใหม่')}
                  >
                    {currentLang === 'ja' ? '＋ 追加' : currentLang === 'en' ? '＋ Add' : '＋ เพิ่ม'}
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
                        {idx + 1}. {item.text ? item.text.split('\n')[0] : (currentLang === 'ja' ? '（テキストなし）' : currentLang === 'en' ? '(Empty)' : 'ยังไม่มีข้อความ')}
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
                        title={currentLang === 'ja' ? 'このテキストを削除' : currentLang === 'en' ? 'Delete this text' : 'ลบข้อความนี้'}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', margin: '12px 0' }}>
                      {currentLang === 'ja'
                        ? 'テキストボックスがありません。ページをクリックしてテキストを追加してください。'
                        : currentLang === 'en'
                        ? 'No text boxes yet. Click on the page to add text.'
                        : 'ยังไม่มีกล่องข้อความ คลิกบนหน้ากระดาษเพื่อเริ่มวางข้อความ'}
                    </p>
                  )}
                </div>

                {activeItem && (
                  <div className="active-inspector">
                    <div className="active-inspector-head">
                      <span>
                        {currentLang === 'ja'
                          ? '選択中のテキストを編集'
                          : currentLang === 'en'
                          ? 'Edit Selected Text'
                          : 'แก้ไขข้อความในกล่องนี้'}
                      </span>
                      <small style={{ color: 'var(--muted-foreground)', fontWeight: 400 }}>
                        {currentLang === 'ja'
                          ? `${activeItem.text.split('\n').length} 行 · ${activeItem.text.length} 文字`
                          : currentLang === 'en'
                          ? `${activeItem.text.split('\n').length} lines · ${activeItem.text.length} chars`
                          : `${activeItem.text.split('\n').length} บรรทัด · ${activeItem.text.length} ตัวอักษร`}
                      </small>
                    </div>
                    <textarea
                      ref={activeTextareaRef}
                      placeholder={
                        currentLang === 'ja'
                          ? 'テキストを入力または貼り付け（Enterで改行）'
                          : currentLang === 'en'
                          ? 'Type or paste text here (Enter for new lines)'
                          : 'พิมพ์หรือวางข้อความที่นี่ (กด Enter เพื่อขึ้นบรรทัดใหม่ได้หลายบรรทัด)'
                      }
                      value={activeItem.text}
                      onChange={(e) => updateItem(activeItem.id, { text: e.target.value })}
                    />
                    <p className="active-inspector-hint">
                      {currentLang === 'ja'
                        ? '💡 複数行テキストに対応。ページ上のテキストをダブルクリックして直接編集も可能。'
                        : currentLang === 'en'
                        ? '💡 Supports multiline text. Double-click on any text box on the page to edit directly.'
                        : '💡 1 กล่องพิมพ์ได้หลายบรรทัด หรือดับเบิลคลิกที่ข้อความบนหน้ากระดาษเพื่อพิมพ์ตรงนั้นได้ทันที'}
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
              <ArrowLeft size={15} /> {currentLang === 'ja' ? 'ファイルを変更' : currentLang === 'en' ? 'Change Document' : 'เปลี่ยนไฟล์เอกสาร'}
            </button>
            <button
              type="button"
              className="button primary"
              id="text-process-next"
              disabled={processing}
              onClick={handleProcessPdf}
            >
              {processing ? (
                <>{currentLang === 'ja' ? 'PDFにテキストを埋め込み中…' : currentLang === 'en' ? 'Embedding text into PDF…' : 'กำลังฝังข้อความลงใน PDF…'}</>
              ) : (
                <>
                  <FileCheck size={15} />{' '}
                  {currentLang === 'ja'
                    ? '文字を埋め込んでPDFを作成'
                    : currentLang === 'en'
                    ? 'Embed Text & Create PDF'
                    : 'ฝังข้อความและสร้าง PDF'}{' '}
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>

          {message && <p className="message">{message}</p>}
        </div>
      )}

      {/* STAGE 3: Dedicated Download Screen with Auto Preview */}
      {stage === 'download' && resultUrl && (
        <DownloadScreen
          downloadUrl={resultUrl}
          filename={`text_${file?.name || 'document.pdf'}`}
          title={
            currentLang === 'ja'
              ? 'PDFへのテキスト埋め込みが完了しました！'
              : currentLang === 'en'
              ? 'Text embedded successfully!'
              : 'ฝังข้อความลงใน PDF สำเร็จแล้ว!'
          }
          subtitle={
            currentLang === 'ja'
              ? 'すべてのテキストが綺麗に埋め込まれました。すぐにダウンロードできます。'
              : currentLang === 'en'
              ? 'All text has been cleanly embedded and is ready to download.'
              : 'ข้อความทั้งหมดถูกฝังลงในเอกสารอย่างคมชัด พร้อมดาวน์โหลดทันที'
          }
          defaultShowPreview={true}
          onBack={() => setStage('place')}
          backLabel={currentLang === 'ja' ? '← テキスト編集に戻る' : currentLang === 'en' ? '← Back to Edit Text' : '← กลับไปแก้ไขข้อความ'}
          onReset={() => {
            setStage('select');
            setFile(null);
            setItems([]);
            setResultUrl('');
            setMessage('');
          }}
          resetLabel={currentLang === 'ja' ? '別のファイルを編集' : currentLang === 'en' ? 'Edit Another Document' : 'แก้ไขไฟล์ใหม่'}
        />
      )}
    </div>
  );
}
