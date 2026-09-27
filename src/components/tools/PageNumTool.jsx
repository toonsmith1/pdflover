import React, { useState, useEffect } from 'react';
import {
  Hash,
  BookOpen,
  FileText,
  Check,
  Sparkles,
  Type,
  Palette,
  ArrowRight,
  ArrowLeft,
  Info,
} from 'lucide-react';
import DropZone from '../common/DropZone';
import DownloadScreen from '../common/DownloadScreen';

const POSITIONS = [
  { id: 'top-left', label: 'บน-ซ้าย', v: 'top', h: 'left' },
  { id: 'top-center', label: 'บน-กลาง', v: 'top', h: 'center' },
  { id: 'top-right', label: 'บน-ขวา', v: 'top', h: 'right' },
  { id: 'bottom-left', label: 'ล่าง-ซ้าย', v: 'bottom', h: 'left' },
  { id: 'bottom-center', label: 'ล่าง-กลาง', v: 'bottom', h: 'center' },
  { id: 'bottom-right', label: 'ล่าง-ขวา', v: 'bottom', h: 'right' },
];

const PAGE_MODES = [
  {
    id: 'all',
    label: 'ทุกหน้า',
    desc: 'ใส่เลขหน้าทุกแผ่นในเอกสาร',
    badge: 'ทั่วไป',
  },
  {
    id: 'alternate',
    label: 'สลับหน้าคู่-คี่',
    desc: 'เข้าเล่ม/พิมพ์สองหน้า (หน้าคี่อยู่ขวา หน้าคู่อยู่ซ้าย)',
    badge: 'แนะนำสำหรับเข้าเล่ม',
  },
  {
    id: 'odd',
    label: 'เฉพาะหน้าคี่',
    desc: 'ใส่เฉพาะหน้า 1, 3, 5, ...',
    badge: '',
  },
  {
    id: 'even',
    label: 'เฉพาะหน้าคู่',
    desc: 'ใส่เฉพาะหน้า 2, 4, 6, ...',
    badge: '',
  },
];

const FORMAT_STYLES = [
  { id: 'number', label: 'ตัวเลขเดี่ยว', sample: '1' },
  { id: 'prefix', label: 'มีคำนำหน้า', sample: 'หน้า 1' },
  { id: 'fraction', label: 'แสดงหน้าจากทั้งหมด', sample: '1 / 10' },
  { id: 'full', label: 'แบบทางการเต็มรูป', sample: 'หน้า 1 จาก 10 หน้า' },
];

const FONTS = [
  { value: 'loma', label: 'Loma (เรียบง่าย)' },
  { value: 'krub', label: 'TH Krub (ทางการ)' },
  { value: 'umpush', label: 'Umpush (โมเดิร์น)' },
];

const COLORS = [
  { value: '#444444', label: 'เทาเข้ม (มาตรฐาน)' },
  { value: '#111111', label: 'ดำสนิท' },
  { value: '#79352f', label: 'Muji แดง' },
  { value: '#1e3a8a', label: 'น้ำเงินเข้ม' },
];

export default function PageNumTool() {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('select'); // 'select' | 'configure' | 'download'
  const [position, setPosition] = useState('bottom-center');
  const [pageMode, setPageMode] = useState('all');
  const [skipFirst, setSkipFirst] = useState(false);
  const [startNumber, setStartNumber] = useState(1);
  const [formatStyle, setFormatStyle] = useState('number');
  const [fontName, setFontName] = useState('loma');
  const [fontSize, setFontSize] = useState(11);
  const [color, setColor] = useState('#444444');

  const [totalPages, setTotalPages] = useState(1);
  const [pageImageUrl, setPageImageUrl] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [resultUrl, setResultUrl] = useState('');

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (pageImageUrl) URL.revokeObjectURL(pageImageUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [pageImageUrl, resultUrl]);

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
      // 1. Fetch PDF info (page count)
      const infoRes = await fetch('/api/pdf-info', { method: 'POST', body: infoBody });
      if (infoRes.ok) {
        const infoData = await infoRes.json();
        setTotalPages(infoData.pages || 1);
      }

      // 2. Fetch rendered first page preview
      const previewRes = await fetch('/api/render-preview', { method: 'POST', body: previewBody });
      if (previewRes.ok) {
        const blob = await previewRes.blob();
        if (pageImageUrl) URL.revokeObjectURL(pageImageUrl);
        const url = URL.createObjectURL(blob);
        setPageImageUrl(url);
      }
      setStep('configure');
    } catch {
      // Even if preview fails, proceed to configure
      setStep('configure');
    } finally {
      setLoadingPreview(false);
    }
  };

  const getSampleText = (pageIdx = 0) => {
    const displayNum = skipFirst ? startNumber + pageIdx - 1 : startNumber + pageIdx;
    const displayTotal = skipFirst ? Math.max(1, totalPages - 1) : totalPages;
    if (formatStyle === 'prefix') return `หน้า ${displayNum}`;
    if (formatStyle === 'fraction') return `${displayNum} / ${displayTotal}`;
    if (formatStyle === 'full') return `หน้า ${displayNum} จาก ${displayTotal} หน้า`;
    return `${displayNum}`;
  };

  const handleProcess = async (e) => {
    if (e) e.preventDefault();
    if (!file || processing) return;

    setProcessing(true);
    setMessage('');

    const body = new FormData();
    body.append('file', file);
    body.append('position', position);
    body.append('page_mode', pageMode);
    body.append('skip_first', skipFirst);
    body.append('start_number', String(startNumber));
    body.append('format_style', formatStyle);
    body.append('font_size', String(fontSize));
    body.append('font_name', fontName);
    body.append('color', color);

    try {
      const res = await fetch('/api/pagenum', { method: 'POST', body });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'ไม่สามารถใส่เลขหน้าได้');
      }
      const blob = await res.blob();
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setStep('download');
      setMessage('ใส่เลขหน้าเรียบร้อยแล้ว');
    } catch (err) {
      setMessage(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const isTop = position.startsWith('top');
  const isBottom = position.startsWith('bottom');

  return (
    <div className="panel pagenum-panel">
      <p className="merge-step">
        {step === 'select'
          ? '01 / เลือกเอกสาร PDF'
          : step === 'configure'
          ? '02 / ตั้งค่าตำแหน่งและรูปแบบเลขหน้า'
          : '03 / ดาวน์โหลดเอกสาร'}
      </p>

      {/* STAGE 3: DOWNLOAD SCREEN */}
      {step === 'download' && resultUrl ? (
        <DownloadScreen
          downloadUrl={resultUrl}
          filename={`numbered_${file?.name || 'document.pdf'}`}
          title="ใส่เลขหน้า PDF สำเร็จแล้ว!"
          subtitle={`เอกสารจำนวน ${totalPages} หน้า ได้รับการใส่เลขหน้าแบบ ${
            pageMode === 'alternate' ? 'สลับหน้าคู่-คี่' : 'มาตรฐาน'
          } เรียบร้อย`}
          onBack={() => setStep('configure')}
          backLabel="← กลับไปปรับแต่ง"
          onReset={() => {
            setStep('select');
            setFile(null);
            setResultUrl('');
            setMessage('');
          }}
          resetLabel="ใส่เลขหน้าไฟล์ใหม่"
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
            <p className="pagenum-loading-note">กำลังโหลดข้อมูลเอกสารและสร้างภาพตัวอย่าง…</p>
          )}
        </div>
      ) : (
        /* STAGE 2: CONFIGURATION & LIVE VISUAL PREVIEW */
        <div className="pagenum-workspace">
          {/* LEFT: CONTROLS PANEL */}
          <div className="pagenum-settings-pane">
            <div className="pagenum-pane-header">
              <button
                type="button"
                className="button small secondary"
                onClick={() => setStep('select')}
              >
                <ArrowLeft size={14} /> เปลี่ยนไฟล์
              </button>
              <span className="pagenum-file-pill" title={file?.name}>
                <FileText size={14} />
                <span className="pagenum-file-name">{file?.name}</span>
                <span className="pagenum-file-pages">({totalPages} หน้า)</span>
              </span>
            </div>

            {/* 1. POSITION SELECTION */}
            <div className="pagenum-card">
              <div className="pagenum-card-title">
                <Hash size={16} />
                <span>1. ตำแหน่งเลขหน้าบนแผ่นกระดาษ</span>
              </div>
              <p className="pagenum-help-text">
                คลิกเลือกตำแหน่งที่ต้องการวางตัวเลข (บน หรือ ล่าง • ซ้าย กลาง หรือ ขวา)
              </p>

              <div className="pagenum-position-picker" role="radiogroup" aria-label="ตำแหน่งเลขหน้า">
                {POSITIONS.map((pos) => {
                  const isActive = position === pos.id;
                  return (
                    <button
                      key={pos.id}
                      type="button"
                      className={`pagenum-pos-btn ${isActive ? 'active' : ''}`}
                      onClick={() => setPosition(pos.id)}
                      role="radio"
                      aria-checked={isActive}
                    >
                      <div className="pos-btn-paper">
                        <span className={`pos-dot pos-dot-${pos.v}-${pos.h}`} />
                      </div>
                      <span className="pos-btn-text">{pos.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. PAGE MODE (ALL, FACING / ALTERNATE, ODD, EVEN) */}
            <div className="pagenum-card">
              <div className="pagenum-card-title">
                <BookOpen size={16} />
                <span>2. หน้าที่ต้องการใส่เลข</span>
              </div>

              <div className="pagenum-mode-grid">
                {PAGE_MODES.map((mode) => {
                  const isSelected = pageMode === mode.id;
                  return (
                    <div
                      key={mode.id}
                      className={`pagenum-mode-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setPageMode(mode.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setPageMode(mode.id)}
                    >
                      <div className="mode-card-header">
                        <strong className="mode-title">{mode.label}</strong>
                        {mode.badge && <span className="mode-badge">{mode.badge}</span>}
                        {isSelected && <Check size={16} className="mode-check-icon" />}
                      </div>
                      <p className="mode-desc">{mode.desc}</p>
                    </div>
                  );
                })}
              </div>

              {pageMode === 'alternate' && (
                <div className="pagenum-tip-box">
                  <Info size={15} />
                  <span>
                    โหมดสลับหน้าคู่-คี่: ตัวเลขหน้าคี่จะอยู่<strong>ขอบขวา</strong>{' '}
                    และหน้าคู่จะอยู่<strong>ขอบซ้าย</strong> ({isTop ? 'ด้านบน' : 'ด้านล่าง'}){' '}
                    เพื่อป้องกันไม่ให้เลขหน้าติดสันเย็บเล่ม
                  </span>
                </div>
              )}
            </div>

            {/* 3. FORMAT STYLE & NUMBERING OPTIONS */}
            <div className="pagenum-card">
              <div className="pagenum-card-title">
                <Type size={16} />
                <span>3. รูปแบบและการนับหน้า</span>
              </div>

              <div className="pagenum-field-row">
                <label className="pagenum-field-group">
                  <span>รูปแบบตัวเลข</span>
                  <select
                    value={formatStyle}
                    onChange={(e) => setFormatStyle(e.target.value)}
                  >
                    {FORMAT_STYLES.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label} ({f.sample})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="pagenum-field-group">
                  <span>เริ่มนับจากเลข</span>
                  <input
                    type="number"
                    min="1"
                    max="9999"
                    value={startNumber}
                    onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  />
                </label>
              </div>

              <label className="pagenum-checkbox-label">
                <input
                  type="checkbox"
                  checked={skipFirst}
                  onChange={(e) => setSkipFirst(e.target.checked)}
                />
                <span className="checkbox-text">
                  <strong>ข้ามหน้าแรก (ไม่ใส่เลขหน้าปก)</strong>
                  <small>เอกสารจะเว้นหน้า 1 ว่างไว้ และเริ่มนับหน้าที่สองเป็นหน้า {startNumber}</small>
                </span>
              </label>
            </div>

            {/* 4. TYPOGRAPHY & COLOR */}
            <div className="pagenum-card">
              <div className="pagenum-card-title">
                <Palette size={16} />
                <span>4. แบบอักษรและขนาด</span>
              </div>

              <div className="pagenum-field-row">
                <label className="pagenum-field-group">
                  <span>ฟอนต์ไทย</span>
                  <select
                    value={fontName}
                    onChange={(e) => setFontName(e.target.value)}
                  >
                    {FONTS.map((font) => (
                      <option key={font.value} value={font.value}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="pagenum-field-group">
                  <span>ขนาดตัวอักษร</span>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                  >
                    <option value={9}>9 pt (เล็กกะทัดรัด)</option>
                    <option value={10}>10 pt</option>
                    <option value={11}>11 pt (มาตรฐาน)</option>
                    <option value={12}>12 pt</option>
                    <option value={14}>14 pt (เด่นชัด)</option>
                    <option value={16}>16 pt</option>
                  </select>
                </label>

                <label className="pagenum-field-group">
                  <span>สีตัวเลข</span>
                  <select
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  >
                    {COLORS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {message && <p className="message">{message}</p>}

            {/* SUBMIT BUTTON */}
            <button
              type="button"
              className="primary pagenum-run-btn"
              disabled={processing}
              onClick={handleProcess}
            >
              {processing ? (
                'กำลังใส่เลขหน้า…'
              ) : (
                <>
                  <span>ใส่เลขหน้าและสร้าง PDF</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>

          {/* RIGHT: INTERACTIVE VISUAL PAPER PREVIEW */}
          <div className="pagenum-preview-pane">
            <div className="pagenum-preview-header">
              <strong>ตัวอย่างการจัดวางบนหน้ากระดาษ</strong>
              <span className="pagenum-preview-summary-tag">
                {pageMode === 'alternate'
                  ? `สลับหน้าคู่-คี่ (${isTop ? 'ด้านบน' : 'ด้านล่าง'})`
                  : POSITIONS.find((p) => p.id === position)?.label}
              </span>
            </div>

            {/* SPREAD PREVIEW FOR ALTERNATE FACING PAGES */}
            {pageMode === 'alternate' ? (
              <div className="pagenum-spread-preview-wrap">
                <div className="pagenum-spread-container">
                  {/* Left Sheet: Even Page (หน้าคู่) */}
                  <div className="pagenum-mockup-page pagenum-page-even">
                    <div className="mockup-page-header">
                      <span className="page-tag">หน้า 2 (หน้าคู่ / ซ้าย)</span>
                    </div>
                    <div className="mockup-page-body">
                      <div className="mockup-dummy-lines">
                        <div className="dummy-line" />
                        <div className="dummy-line short" />
                        <div className="dummy-line" />
                      </div>
                    </div>
                    {/* Number on left side */}
                    <div
                      className={`mockup-number-badge ${isTop ? 'top-left' : 'bottom-left'}`}
                      style={{ color }}
                    >
                      {getSampleText(1)}
                    </div>
                  </div>

                  {/* Binding Spine / Suture Divider */}
                  <div className="pagenum-spine-divider" title="สันหนังสือ / แนวยึดเย็บเล่ม">
                    <div className="spine-dots" />
                    <span className="spine-label">สันหนังสือ</span>
                    <div className="spine-dots" />
                  </div>

                  {/* Right Sheet: Odd Page (หน้าคี่) */}
                  <div className="pagenum-mockup-page pagenum-page-odd">
                    <div className="mockup-page-header">
                      <span className="page-tag">
                        {skipFirst ? 'หน้า 1 (หน้าปก/ว่าง)' : 'หน้า 1 (หน้าคี่ / ขวา)'}
                      </span>
                    </div>
                    <div className="mockup-page-body">
                      {pageImageUrl ? (
                        <img
                          src={pageImageUrl}
                          alt="ตัวอย่างหน้าแรก"
                          className="mockup-real-preview-img"
                        />
                      ) : (
                        <div className="mockup-dummy-lines">
                          <div className="dummy-line" />
                          <div className="dummy-line" />
                          <div className="dummy-line short" />
                        </div>
                      )}
                    </div>
                    {/* Number on right side (unless skipFirst) */}
                    {!skipFirst && (
                      <div
                        className={`mockup-number-badge ${isTop ? 'top-right' : 'bottom-right'}`}
                        style={{ color }}
                      >
                        {getSampleText(0)}
                      </div>
                    )}
                  </div>
                </div>

                <p className="pagenum-spread-note">
                  📖 <strong>การเข้าเล่ม:</strong> ตัวเลขหน้าจะอยู่ที่ขอบนอกเสมอ
                  ไม่ถูกสันหนังสือทับเวลากางอ่าน
                </p>
              </div>
            ) : (
              /* SINGLE SHEET INTERACTIVE PREVIEW WITH 6 CLICKABLE ANCHORS */
              <div className="pagenum-single-preview-wrap">
                <div className="pagenum-single-sheet">
                  {pageImageUrl && (
                    <img
                      src={pageImageUrl}
                      alt="ตัวอย่างเอกสาร"
                      className="pagenum-sheet-bg-img"
                    />
                  )}

                  {/* 6 Clickable Hotspot Anchors */}
                  {POSITIONS.map((pos) => {
                    const isSelected = position === pos.id;
                    return (
                      <button
                        key={pos.id}
                        type="button"
                        className={`sheet-anchor-hotspot ${pos.id} ${
                          isSelected ? 'active' : ''
                        }`}
                        onClick={() => setPosition(pos.id)}
                        title={`คลิกเพื่อเลือกตำแหน่ง ${pos.label}`}
                      >
                        {isSelected ? (
                          <span
                            className="sheet-active-number-pill"
                            style={{ color }}
                          >
                            {skipFirst ? getSampleText(1) : getSampleText(0)}
                          </span>
                        ) : (
                          <span className="sheet-anchor-dot" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="pagenum-preview-tips">
                  <span>💡 <strong>คำแนะนำ:</strong> คลิกบนจุดใดก็ได้บนหน้ากระดาษเพื่อย้ายตำแหน่งเลขหน้าทันที</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
