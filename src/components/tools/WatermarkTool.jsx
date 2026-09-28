import React, { useState, useEffect, useRef } from 'react';
import {
  Stamp,
  Type,
  Image as ImageIcon,
  Sliders,
  RotateCw,
  Layers,
  ArrowLeft,
  ArrowRight,
  FileText,
  Check,
  Sparkles,
  Upload,
} from 'lucide-react';
import DropZone from '../common/DropZone';
import DownloadScreen from '../common/DownloadScreen';

const PRESET_TEXTS = [
  'สำเนาถูกต้อง',
  'ตัวอย่าง / SAMPLE',
  'ลับเฉพาะ / CONFIDENTIAL',
  'ร่าง / DRAFT',
  'ห้ามทำซ้ำ / DO NOT COPY',
  'ใช้สำหรับสมัครงานเท่านั้น',
];

const FONTS = [
  { value: 'loma', label: 'Loma (เรียบง่าย)' },
  { value: 'krub', label: 'TH Krub (ทางการ)' },
  { value: 'umpush', label: 'Umpush (โมเดิร์น)' },
];

const COLORS = [
  { value: '#888888', label: 'เทากลาง' },
  { value: '#444444', label: 'เทาเข้ม' },
  { value: '#79352f', label: 'แดงคลาสสิก' },
  { value: '#1e3a8a', label: 'น้ำเงิน' },
  { value: '#15803d', label: 'เขียวเข้ม' },
  { value: '#b45309', label: 'บรอนซ์ส้ม' },
];

const POSITIONS = [
  { id: 'center', label: 'กึ่งกลางหน้า' },
  { id: 'tiled', label: 'ปูซ้ำเต็มแผ่น (Tiled)' },
  { id: 'top', label: 'ด้านบน' },
  { id: 'bottom', label: 'ด้านล่าง' },
];

export default function WatermarkTool() {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('select'); // 'select' | 'configure' | 'download'
  const [watermarkType, setWatermarkType] = useState('text'); // 'text' | 'image'
  const [text, setText] = useState('ตัวอย่าง / SAMPLE');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [angle, setAngle] = useState(45);
  const [fontName, setFontName] = useState('loma');
  const [fontSize, setFontSize] = useState(44);
  const [color, setColor] = useState('#888888');
  const [opacity, setOpacity] = useState(25); // 5 to 100
  const [position, setPosition] = useState('center');
  const [layer, setLayer] = useState('over');
  const [skipFirst, setSkipFirst] = useState(false);
  const [pageMode, setPageMode] = useState('all');

  const [totalPages, setTotalPages] = useState(1);
  const [pageImageUrl, setPageImageUrl] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [resultUrl, setResultUrl] = useState('');

  const urlsRef = useRef(new Set());

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      urlsRef.current.forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {
          // ignore
        }
      });
      urlsRef.current.clear();
    };
  }, []);

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
      const infoRes = await fetch('/api/pdf-info', { method: 'POST', body: infoBody });
      if (infoRes.ok) {
        const infoData = await infoRes.json();
        setTotalPages(infoData.pages || 1);
      }

      const previewRes = await fetch('/api/render-preview', { method: 'POST', body: previewBody });
      if (previewRes.ok) {
        const blob = await previewRes.blob();
        if (pageImageUrl) URL.revokeObjectURL(pageImageUrl);
        const url = URL.createObjectURL(blob);
        urlsRef.current.add(url);
        setPageImageUrl(url);
      }
      setStep('configure');
    } catch {
      setStep('configure');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleWatermarkImage = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setImageFile(f);
      const url = URL.createObjectURL(f);
      urlsRef.current.add(url);
      setImagePreviewUrl(url);
    }
  };

  const handleProcess = async (e) => {
    if (e) e.preventDefault();
    if (!file || processing) return;

    if (watermarkType === 'text' && !text.trim()) {
      setMessage('กรุณากรอกข้อความลายน้ำ');
      return;
    }
    if (watermarkType === 'image' && !imageFile) {
      setMessage('กรุณาเลือกไฟล์รูปภาพลายน้ำ');
      return;
    }

    setProcessing(true);
    setMessage('');

    const body = new FormData();
    body.append('file', file);
    if (watermarkType === 'text') {
      body.append('text', text.trim());
    } else if (imageFile) {
      body.append('image', imageFile);
    }
    body.append('angle', String(angle));
    body.append('font_name', fontName);
    body.append('font_size', String(fontSize));
    body.append('color', color);
    body.append('opacity', String(opacity / 100.0));
    body.append('position', position);
    body.append('layer', layer);
    body.append('skip_first', skipFirst);
    body.append('page_mode', pageMode);

    try {
      const res = await fetch('/api/watermark', { method: 'POST', body });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'ไม่สามารถใส่ลายน้ำได้');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      urlsRef.current.add(url);
      setResultUrl(url);
      setStep('download');
      setMessage('ใส่ลายน้ำลงใน PDF เรียบร้อยแล้ว');
    } catch (err) {
      setMessage(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="panel watermark-panel">
      <p className="merge-step">
        {step === 'select'
          ? '01 / เลือกเอกสาร PDF'
          : step === 'configure'
          ? '02 / ตั้งค่าข้อความ รูปภาพ และปรับแต่งลายน้ำ'
          : '03 / ดาวน์โหลดเอกสาร'}
      </p>

      {/* STAGE 3: DOWNLOAD SCREEN */}
      {step === 'download' && resultUrl ? (
        <DownloadScreen
          downloadUrl={resultUrl}
          filename={`watermarked_${file?.name || 'document.pdf'}`}
          title="ใส่ลายน้ำใน PDF สำเร็จแล้ว!"
          subtitle={`เอกสารจำนวน ${totalPages} หน้า ได้รับการประทับลายน้ำเรียบร้อย`}
          onBack={() => setStep('configure')}
          backLabel="← กลับไปปรับแต่งลายน้ำ"
          onReset={() => {
            setStep('select');
            setFile(null);
            setImageFile(null);
            setResultUrl('');
            setMessage('');
          }}
          resetLabel="ใส่ลายน้ำไฟล์ใหม่"
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
            <p className="watermark-loading-note">กำลังโหลดข้อมูลและสร้างภาพตัวอย่างเอกสาร…</p>
          )}
        </div>
      ) : (
        /* STAGE 2: WORKSPACE (SETTINGS + LIVE PREVIEW) */
        <div className="watermark-workspace">
          {/* LEFT: CONTROLS PANE */}
          <div className="watermark-settings-pane">
            <div className="watermark-pane-header">
              <button
                type="button"
                className="button small secondary"
                onClick={() => setStep('select')}
              >
                <ArrowLeft size={14} /> เปลี่ยนไฟล์
              </button>
              <span className="watermark-file-pill" title={file?.name}>
                <FileText size={14} />
                <span className="watermark-file-name">{file?.name}</span>
                <span className="watermark-file-pages">({totalPages} หน้า)</span>
              </span>
            </div>

            {/* 1. WATERMARK CONTENT (TEXT VS IMAGE) */}
            <div className="watermark-card">
              <div className="watermark-type-toggle">
                <button
                  type="button"
                  className={`watermark-type-tab ${watermarkType === 'text' ? 'active' : ''}`}
                  onClick={() => setWatermarkType('text')}
                >
                  <Type size={15} />
                  <span>ลายน้ำข้อความ</span>
                </button>
                <button
                  type="button"
                  className={`watermark-type-tab ${watermarkType === 'image' ? 'active' : ''}`}
                  onClick={() => setWatermarkType('image')}
                >
                  <ImageIcon size={15} />
                  <span>ลายน้ำรูปภาพ / โลโก้</span>
                </button>
              </div>

              {watermarkType === 'text' ? (
                <div className="watermark-field-group">
                  <label>
                    <span className="field-label">ข้อความลายน้ำ</span>
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="เช่น สำเนาถูกต้อง, DRAFT, CONFIDENTIAL"
                      maxLength={120}
                    />
                  </label>

                  {/* Preset Quick Chips */}
                  <div className="watermark-presets-wrap">
                    <span className="presets-title">ข้อความสำเร็จรูป:</span>
                    <div className="watermark-presets-list">
                      {PRESET_TEXTS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          className={`preset-chip ${text === preset ? 'active' : ''}`}
                          onClick={() => setText(preset)}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="watermark-inline-fields">
                    <label className="field-subgroup">
                      <span>ฟอนต์ไทย</span>
                      <select
                        value={fontName}
                        onChange={(e) => setFontName(e.target.value)}
                      >
                        {FONTS.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field-subgroup">
                      <span>ขนาดตัวอักษร</span>
                      <select
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                      >
                        <option value={28}>28 pt (เล็ก)</option>
                        <option value={36}>36 pt</option>
                        <option value={44}>44 pt (มาตรฐาน)</option>
                        <option value={56}>56 pt</option>
                        <option value={68}>68 pt (ใหญ่พิเศษ)</option>
                      </select>
                    </label>

                    <label className="field-subgroup">
                      <span>สี</span>
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
              ) : (
                <div className="watermark-field-group">
                  <label className="field-label">อัปโหลดรูปภาพหรือโลโก้ (PNG / JPG)</label>
                  <label className="watermark-img-upload-box">
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleWatermarkImage}
                      style={{ display: 'none' }}
                    />
                    <Upload size={24} color="#79352f" />
                    <span>{imageFile ? imageFile.name : 'คลิกเพื่อเลือกไฟล์รูปภาพ'}</span>
                    <small>รองรับไฟล์ PNG โปร่งใสเพื่อความสวยงาม</small>
                  </label>
                </div>
              )}
            </div>

            {/* 2. POSITION & ANGLE */}
            <div className="watermark-card">
              <div className="watermark-card-title">
                <RotateCw size={16} />
                <span>ตำแหน่งและมุมเอียง</span>
              </div>

              <div className="watermark-field-group">
                <span className="field-label">การจัดวางตำแหน่ง</span>
                <div className="watermark-pill-selector">
                  {POSITIONS.map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      className={`pill-btn ${position === pos.id ? 'active' : ''}`}
                      onClick={() => setPosition(pos.id)}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="watermark-field-group">
                <div className="slider-header">
                  <span className="field-label">มุมเอียง: {angle}°</span>
                  <div className="quick-angles">
                    {[0, 45, 90, -45].map((deg) => (
                      <button
                        key={deg}
                        type="button"
                        className={`angle-quick-btn ${angle === deg ? 'active' : ''}`}
                        onClick={() => setAngle(deg)}
                      >
                        {deg === 0 ? 'แนวนอน (0°)' : deg === 45 ? 'เฉียง 45°' : `${deg}°`}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  value={angle}
                  onChange={(e) => setAngle(Number(e.target.value))}
                  className="watermark-slider"
                />
              </div>
            </div>

            {/* 3. OPACITY & LAYER */}
            <div className="watermark-card">
              <div className="watermark-card-title">
                <Sliders size={16} />
                <span>ความโปร่งใสและระดับชั้นเลเยอร์</span>
              </div>

              <div className="watermark-field-group">
                <div className="slider-header">
                  <span className="field-label">ความเข้ม / โปร่งใส: {opacity}%</span>
                  <small className="opacity-hint">
                    {opacity <= 35 ? 'แนะนำ (เอกสารด้านหลังยังอ่านชัด)' : 'เด่นชัดมาก'}
                  </small>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="watermark-slider"
                />
              </div>

              <div className="watermark-field-group">
                <span className="field-label">ลำดับชั้นเลเยอร์ (Layer)</span>
                <div className="watermark-pill-selector">
                  <button
                    type="button"
                    className={`pill-btn ${layer === 'over' ? 'active' : ''}`}
                    onClick={() => setLayer('over')}
                  >
                    ประทับทับข้อความเดิม (Over)
                  </button>
                  <button
                    type="button"
                    className={`pill-btn ${layer === 'under' ? 'active' : ''}`}
                    onClick={() => setLayer('under')}
                  >
                    อยู่ใต้ข้อความเดิม (Under)
                  </button>
                </div>
              </div>
            </div>

            {/* 4. PAGES SELECTION */}
            <div className="watermark-card">
              <div className="watermark-card-title">
                <Layers size={16} />
                <span>หน้าที่ต้องการประทับลายน้ำ</span>
              </div>

              <div className="watermark-pill-selector">
                <button
                  type="button"
                  className={`pill-btn ${pageMode === 'all' ? 'active' : ''}`}
                  onClick={() => setPageMode('all')}
                >
                  ทุกหน้า ({totalPages} หน้า)
                </button>
                <button
                  type="button"
                  className={`pill-btn ${pageMode === 'odd' ? 'active' : ''}`}
                  onClick={() => setPageMode('odd')}
                >
                  เฉพาะหน้าคี่ (1, 3, 5...)
                </button>
                <button
                  type="button"
                  className={`pill-btn ${pageMode === 'even' ? 'active' : ''}`}
                  onClick={() => setPageMode('even')}
                >
                  เฉพาะหน้าคู่ (2, 4, 6...)
                </button>
              </div>

              <label className="watermark-checkbox-label">
                <input
                  type="checkbox"
                  checked={skipFirst}
                  onChange={(e) => setSkipFirst(e.target.checked)}
                />
                <span>
                  <strong>ข้ามหน้าแรก (ไม่ใส่ลายน้ำที่หน้าปก)</strong>
                  <small>เว้นหน้า 1 ให้สะอาดตา และเริ่มใส่ลายน้ำตั้งแต่หน้าที่ 2 เป็นต้นไป</small>
                </span>
              </label>
            </div>

            {message && <p className="message">{message}</p>}

            {/* SUBMIT BUTTON */}
            <button
              type="button"
              className="primary watermark-run-btn"
              disabled={processing}
              onClick={handleProcess}
            >
              {processing ? (
                'กำลังใส่ลายน้ำ…'
              ) : (
                <>
                  <span>ใส่ลายน้ำและสร้าง PDF</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>

          {/* RIGHT: LIVE INTERACTIVE PREVIEW */}
          <div className="watermark-preview-pane">
            <div className="watermark-preview-header">
              <strong>ตัวอย่างหน้ากระดาษจริงแบบเรียลไทม์</strong>
              <span className="watermark-preview-tag">
                {position === 'tiled' ? 'ปูซ้ำเต็มแผ่น' : 'กึ่งกลาง'} • {angle}° • โปร่งใส {opacity}%
              </span>
            </div>

            <div className="watermark-preview-viewport">
              <div className="watermark-mockup-sheet">
                {/* Real page image if available */}
                {pageImageUrl ? (
                  <img
                    src={pageImageUrl}
                    alt="ตัวอย่างเอกสาร"
                    className="watermark-sheet-bg-img"
                  />
                ) : (
                  <div className="watermark-dummy-content">
                    <div className="dummy-h1" />
                    <div className="dummy-p" />
                    <div className="dummy-p" />
                    <div className="dummy-p short" />
                    <div className="dummy-p" />
                  </div>
                )}

                {/* WATERMARK OVERLAY SIMULATION */}
                <div
                  className={`watermark-live-overlay ${position}`}
                  style={{
                    opacity: opacity / 100.0,
                  }}
                >
                  {position === 'tiled' ? (
                    <div className="watermark-tiled-grid">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className="tiled-cell">
                          <div
                            className="watermark-content-rotator"
                            style={{
                              transform: `rotate(-${angle}deg)`,
                              color,
                              fontSize: `${fontSize * 0.45}px`,
                            }}
                          >
                            {watermarkType === 'image' && imagePreviewUrl ? (
                              <img
                                src={imagePreviewUrl}
                                alt="โลโก้"
                                className="watermark-preview-logo-img"
                              />
                            ) : (
                              <span>{text || 'ตัวอย่าง'}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      className={`watermark-single-box pos-${position}`}
                      style={{
                        transform: `rotate(-${angle}deg)`,
                        color,
                        fontSize: `${fontSize * 0.65}px`,
                      }}
                    >
                      {watermarkType === 'image' && imagePreviewUrl ? (
                        <img
                          src={imagePreviewUrl}
                          alt="โลโก้"
                          className="watermark-preview-logo-img"
                        />
                      ) : (
                        <span>{text || 'ตัวอย่าง'}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p className="watermark-preview-note">
              👁️ ตัวอย่างแสดงผลตามมุมเอียง ความโปร่งใส และฟอนต์ที่เลือกแบบเรียลไทม์
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
