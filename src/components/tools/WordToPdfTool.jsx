import React, { useEffect, useState } from 'react';
import { FileText, UploadCloud } from 'lucide-react';
import DownloadScreen from '../common/DownloadScreen';

export default function WordToPdfTool() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [weasyprint, setWeasyprint] = useState(null);

  useEffect(() => {
    fetch('/api/dependencies/weasyprint')
      .then((response) => response.ok ? response.json() : null)
      .then(setWeasyprint)
      .catch(() => setWeasyprint({ installed: false }));
  }, []);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
  }, [previewUrl, resultUrl]);

  async function choose(event) {
    const selected = event.target.files[0];
    event.target.value = '';
    if (!selected || !/\.(doc|docx)$/i.test(selected.name)) {
      setMessage('กรุณาเลือกไฟล์ .doc หรือ .docx');
      return;
    }
    setFile(selected);
    setMessage('กำลังสร้างตัวอย่างเอกสาร…');
    const body = new FormData();
    body.append('file', selected);
    try {
      const response = await fetch('/api/word-preview', { method: 'POST', body });
      if (!response.ok) throw new Error(await response.text());
      setPreviewUrl(URL.createObjectURL(await response.blob()));
      setMessage('ตรวจสอบตัวอย่างเอกสาร แล้วกดแปลงเป็น PDF');
    } catch (error) {
      setFile(null);
      setMessage(`สร้างตัวอย่างไม่สำเร็จ: ${error.message}`);
    }
  }

  async function convert(event) {
    event.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setMessage('กำลังแปลง Word เป็น PDF…');
    const body = new FormData();
    body.append('file', file);
    try {
      const response = await fetch('/api/word-to-pdf', { method: 'POST', body });
      if (!response.ok) throw new Error(await response.text());
      setResultUrl(URL.createObjectURL(await response.blob()));
      setMessage('');
    } catch (error) {
      setMessage(`แปลงไฟล์ไม่สำเร็จ: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  if (resultUrl) {
    return <DownloadScreen downloadUrl={resultUrl} filename="converted.pdf" title="แปลง Word เป็น PDF เรียบร้อยแล้ว" onReset={() => { URL.revokeObjectURL(resultUrl); setResultUrl(''); }} />;
  }

  return (
    <div className="panel">
      <form onSubmit={convert} className="tool-controls">
        {weasyprint && !weasyprint.installed && (
          <div className="message" role="alert">
            <strong>WeasyPrint ยังไม่พร้อมใช้งาน</strong>
            <span>ต้องติดตั้ง Python package และ library ระบบ Pango/Cairo ก่อนใช้ Word to PDF</span>
            <a className="button secondary" href="https://doc.courtbouillon.org/weasyprint/stable/first_steps.html" target="_blank" rel="noreferrer">เปิดคู่มือติดตั้ง</a>
          </div>
        )}
        <label className="drop" htmlFor="word-file">
          <UploadCloud size={34} className="drop-icon-upload" strokeWidth={1.5} />
          <span>เลือกหรือลากไฟล์ Word</span>
          <em>{file ? file.name : 'รองรับ .doc และ .docx'}</em>
          <input id="word-file" type="file" disabled={weasyprint && !weasyprint.installed} accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={choose} />
        </label>
        {previewUrl && (
          <section className="preview" aria-label="ตัวอย่างเอกสาร Word">
            <div className="preview-head"><strong><FileText size={16} /> ตัวอย่างก่อนแปลง</strong><span>{file?.name}</span></div>
            <iframe title="ตัวอย่างเอกสาร Word" src={previewUrl} />
          </section>
        )}
        <button className="primary" type="submit" disabled={!file || !previewUrl || busy}>
          {busy ? 'กำลังแปลง…' : 'แปลงและดาวน์โหลด PDF'}
        </button>
        {message && <p className="message">{message}</p>}
      </form>
    </div>
  );
}
