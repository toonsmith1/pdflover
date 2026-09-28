import React, { useState } from 'react';
import DropZone from '../common/DropZone';
import DownloadScreen from '../common/DownloadScreen';

export default function DeletePagesTool() {
  const [file, setFile] = useState(null);
  const [thumbs, setThumbs] = useState([]);
  const [selected, setSelected] = useState([]);
  const [step, setStep] = useState('select');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [resultUrl, setResultUrl] = useState('');

  async function choose(files) {
    const picked = files[0];
    if (!picked) return;
    setFile(picked); setSelected([]); setResultUrl(''); setMessage('กำลังสร้างตัวอย่างหน้าเอกสาร…');
    const body = new FormData(); body.append('file', picked);
    try {
      const response = await fetch('/api/pdf-thumbnails', { method: 'POST', body });
      if (!response.ok) throw new Error(await response.text());
      setThumbs((await response.json()).thumbnails || []); setMessage('');
    } catch (error) { setMessage(`สร้างตัวอย่างไม่สำเร็จ: ${error.message}`); }
  }

  function togglePage(page) {
    setSelected((current) => current.includes(page) ? current.filter((value) => value !== page) : [...current, page]);
  }

  async function process(event) {
    event.preventDefault();
    if (!file || !selected.length || busy) return;
    setBusy(true); setMessage('');
    const body = new FormData(); body.append('file', file); body.append('pages', selected.sort((a, b) => a - b).join(','));
    try {
      const response = await fetch('/api/delete-pages', { method: 'POST', body });
      if (!response.ok) throw new Error(await response.text());
      setResultUrl(URL.createObjectURL(await response.blob())); setStep('download');
    } catch (error) { setMessage(`ลบหน้าไม่สำเร็จ: ${error.message}`); } finally { setBusy(false); }
  }

  if (step === 'download' && resultUrl) return <DownloadScreen downloadUrl={resultUrl} filename={`pages-deleted_${file?.name || 'document.pdf'}`} title="ลบหน้า PDF สำเร็จแล้ว!" subtitle={`ลบทั้งหมด ${selected.length} หน้า และตรวจสอบไฟล์ผลลัพธ์ได้ก่อนดาวน์โหลด`} onBack={() => setStep('configure')} backLabel="← กลับไปแก้ไข" onReset={() => { setStep('select'); setFile(null); setThumbs([]); setSelected([]); setResultUrl(''); }} resetLabel="ลบหน้าไฟล์ใหม่" />;

  return <div className="panel"><p className="merge-step">{step === 'select' ? '01 / เลือกเอกสาร' : '02 / ตรวจสอบหน้าที่จะลบ'}</p>{step === 'select' ? <div className="tool-controls"><DropZone onFilesSelected={choose} label={file ? file.name : 'ลาก PDF มาวาง หรือเลือกไฟล์'} /><button type="button" className="primary merge-next" disabled={!thumbs.length} onClick={() => setStep('configure')}>เลือกหน้าที่จะลบ →</button>{message && <p className="message">{message}</p>}</div> : <form onSubmit={process} className="tool-controls"><button type="button" className="back" onClick={() => setStep('select')}>← กลับไปเปลี่ยนไฟล์</button><div className="image-page-preview"><div className="image-preview-header"><strong>ตัวอย่างผลลัพธ์หลังลบหน้า</strong><span>เหลือ {thumbs.length - selected.length} จาก {thumbs.length} หน้า</span></div><p className="hint">หน้าที่เลือกจะหายจากตัวอย่างด้านล่างทันที ตรวจสอบแล้วจึงกดลบหน้า</p><div className="image-thumb-grid">{thumbs.map((src, index) => { const page = index + 1; if (selected.includes(page)) return null; return <button type="button" key={page} className="image-thumb selected" onClick={() => togglePage(page)}><img src={src} alt={`หน้า ${page}`} /><span>หน้า {page}</span></button>; })}</div></div>{selected.length > 0 && <div className="delete-pages-restore"><strong>หน้าที่เลือกให้ลบ</strong><div>{selected.sort((a, b) => a - b).map((page) => <article className="delete-pages-restore-card" key={page}><img src={thumbs[page - 1]} alt={`ตัวอย่างหน้า ${page}`} /><span>หน้า {page}</span><button type="button" className="button small secondary" onClick={() => togglePage(page)}>เรียกคืนหน้านี้</button></article>)}</div></div>}<button className="primary" type="submit" disabled={!selected.length || selected.length >= thumbs.length || busy}>{busy ? 'กำลังลบหน้า…' : 'ยืนยันและสร้าง PDF'}</button>{selected.length >= thumbs.length && <p className="message">ต้องเหลืออย่างน้อย 1 หน้าในเอกสาร</p>}{message && <p className="message">{message}</p>}</form>}</div>;
}
