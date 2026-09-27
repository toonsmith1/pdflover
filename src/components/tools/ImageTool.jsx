import React, { useState } from 'react';
import { Download, Image as ImageIcon } from 'lucide-react';
import DropZone from '../common/DropZone';
import DownloadScreen from '../common/DownloadScreen';

export default function ImageTool() {
  const [file, setFile] = useState(null);
  const [thumbnails, setThumbnails] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [pages, setPages] = useState('');
  const [busy, setBusy] = useState(false);
  const [resultUrl, setResultUrl] = useState('');
  const [message, setMessage] = useState('');
  async function chooseFile(files) {
    const selected = files[0]; if (!selected) return;
    setFile(selected); setThumbnails([]); setSelectedPages([]); setLoadingPreview(true); setMessage('กำลังสร้างตัวอย่างหน้า PDF…');
    const body = new FormData(); body.append('file', selected);
    try { const response = await fetch('/api/pdf-thumbnails', { method: 'POST', body }); if (!response.ok) throw new Error(await response.text()); const data = await response.json(); setThumbnails(data.thumbnails || []); setSelectedPages((data.thumbnails || []).map((_, index) => index + 1)); setMessage(''); }
    catch (error) { setMessage(`สร้างตัวอย่างไม่สำเร็จ: ${error.message}`); }
    finally { setLoadingPreview(false); }
  }
  async function convert(event) {
    event.preventDefault(); if (!file || busy) return;
    setBusy(true); setMessage('กำลังแปลงแต่ละหน้าเป็นภาพ…');
    const body = new FormData(); body.append('file', file); const pageValue = pages.trim() || selectedPages.join(','); if (pageValue) body.append('pages', pageValue);
    try { const response = await fetch('/api/pdf-to-images', { method: 'POST', body }); if (!response.ok) throw new Error(await response.text()); setResultUrl(URL.createObjectURL(await response.blob())); setMessage(''); }
    catch (error) { setMessage(`แปลงไฟล์ไม่สำเร็จ: ${error.message}`); }
    finally { setBusy(false); }
  }
  if (resultUrl) return <DownloadScreen downloadUrl={resultUrl} filename="pdf-images.zip" title="แปลง PDF เป็นรูปเรียบร้อยแล้ว" subtitle="แต่ละหน้าอยู่ในไฟล์ ZIP แยกเป็น PNG" onReset={() => { URL.revokeObjectURL(resultUrl); setResultUrl(''); }} />;
  return <div className="panel image-tool-panel"><form onSubmit={convert} className="tool-controls"><DropZone onFilesSelected={chooseFile} label={file ? file.name : 'ลาก PDF มาวาง หรือเลือกไฟล์'} />{loadingPreview && <p>กำลังสร้าง preview…</p>}{thumbnails.length > 0 && <div className="image-page-preview"><div className="image-preview-header"><strong>เลือกหน้าที่ต้องการแปลง</strong><button type="button" className="button small secondary" onClick={() => setSelectedPages(selectedPages.length === thumbnails.length ? [] : thumbnails.map((_, index) => index + 1))}>{selectedPages.length === thumbnails.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}</button></div><div className="image-thumb-grid">{thumbnails.map((src, index) => { const page = index + 1; const selected = selectedPages.includes(page); return <button type="button" key={page} className={`image-thumb ${selected ? 'selected' : ''}`} onClick={() => setSelectedPages((prev) => selected ? prev.filter((value) => value !== page) : [...prev, page])}><img src={src} alt={`หน้า ${page}`} /><span>หน้า {page}</span></button>; })}</div></div>}<label>หน้าที่เลือก (แก้ได้ เช่น 1-3, 5)<input value={pages} onChange={(event) => setPages(event.target.value)} placeholder={selectedPages.length ? selectedPages.join(',') : 'เช่น 1-3, 5'} /></label><button className="primary" type="submit" disabled={!file || busy || (!pages.trim() && !selectedPages.length)}><ImageIcon size={17} /> {busy ? 'กำลังแปลง…' : 'แปลงเป็นรูปภาพ'}</button>{message && <p className="message">{message}</p>}</form></div>;
}
