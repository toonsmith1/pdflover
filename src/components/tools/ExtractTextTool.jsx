import React, { useState } from 'react';
import { FileText, Download } from 'lucide-react';
import DropZone from '../common/DropZone';

export default function ExtractTextTool() {
  const [file, setFile] = useState(null); const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  async function extract(event) { event.preventDefault(); if (!file || busy) return; setBusy(true); setMessage('กำลังอ่านข้อความภาษาไทย…'); const body = new FormData(); body.append('file', file); try { const response = await fetch('/api/extract-text', {method:'POST',body}); if (!response.ok) throw new Error(await response.text()); setText(await response.text()); setMessage('ตรวจสอบหรือแก้ไขข้อความก่อนดาวน์โหลดได้'); } catch(error) { setMessage(`ดึงข้อความไม่สำเร็จ: ${error.message}`); } finally { setBusy(false); } }
  function download() { const url = URL.createObjectURL(new Blob([text], {type:'text/plain;charset=utf-8'})); const link = document.createElement('a'); link.href=url; link.download='extracted-text.txt'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
  return <div className="panel extract-text-panel"><form onSubmit={extract} className="tool-controls"><DropZone onFilesSelected={(files)=>{setFile(files[0]||null);setText('');}} label={file ? file.name : 'ลาก PDF มาวาง หรือเลือกไฟล์'} /><button className="primary" type="submit" disabled={!file||busy}><FileText size={17}/> {busy?'กำลังดึงข้อความ…':'ดึงข้อความจาก PDF'}</button>{text && <section className="extract-text-preview"><div className="extract-text-head"><strong>ตัวอย่างข้อความที่ดึงได้</strong><button type="button" className="button small secondary" onClick={download}><Download size={14}/> ดาวน์โหลด TXT</button></div><textarea value={text} onChange={(event)=>setText(event.target.value)} aria-label="ข้อความที่ดึงได้" /></section>}{message&&<p className="message">{message}</p>}</form></div>;
}
