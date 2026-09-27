import React, { useState } from 'react';
import { Download, Image as ImageIcon } from 'lucide-react';
import DropZone from '../common/DropZone';
import DownloadScreen from '../common/DownloadScreen';

export default function ImageTool() {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState('');
  const [busy, setBusy] = useState(false);
  const [resultUrl, setResultUrl] = useState('');
  const [message, setMessage] = useState('');
  async function convert(event) {
    event.preventDefault(); if (!file || busy) return;
    setBusy(true); setMessage('กำลังแปลงแต่ละหน้าเป็นภาพ…');
    const body = new FormData(); body.append('file', file); if (pages.trim()) body.append('pages', pages);
    try { const response = await fetch('/api/pdf-to-images', { method: 'POST', body }); if (!response.ok) throw new Error(await response.text()); setResultUrl(URL.createObjectURL(await response.blob())); setMessage(''); }
    catch (error) { setMessage(`แปลงไฟล์ไม่สำเร็จ: ${error.message}`); }
    finally { setBusy(false); }
  }
  if (resultUrl) return <DownloadScreen downloadUrl={resultUrl} filename="pdf-images.zip" title="แปลง PDF เป็นรูปเรียบร้อยแล้ว" subtitle="แต่ละหน้าอยู่ในไฟล์ ZIP แยกเป็น PNG" onReset={() => { URL.revokeObjectURL(resultUrl); setResultUrl(''); }} />;
  return <div className="panel image-tool-panel"><form onSubmit={convert} className="tool-controls"><DropZone onFilesSelected={(files) => setFile(files[0] || null)} label={file ? file.name : 'ลาก PDF มาวาง หรือเลือกไฟล์'} /><label>หน้าที่ต้องการ (เว้นว่างเพื่อแปลงทุกหน้า)<input value={pages} onChange={(event) => setPages(event.target.value)} placeholder="เช่น 1-3, 5" /></label><button className="primary" type="submit" disabled={!file || busy}><ImageIcon size={17} /> {busy ? 'กำลังแปลง…' : 'แปลงเป็นรูปภาพ'}</button>{message && <p className="message">{message}</p>}</form></div>;
}
