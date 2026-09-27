import React, { useState } from 'react';
import DropZone from '../common/DropZone';

export default function GenericTool({ toolId }) {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');

  const handleFile = (files) => {
    if (files.length) {
      setFile(files[0]);
      setMessage('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) return;
    setMessage('เครื่องมือนี้กำลังเตรียมเชื่อมต่อ');
  };

  return (
    <div className="panel">
      <form onSubmit={handleSubmit} className="tool-controls">
        <DropZone
          onFilesSelected={handleFile}
          multiple={toolId === 'image-pdf'}
          label={file ? file.name : 'ยังไม่ได้เลือกไฟล์'}
        />
        <button
          type="submit"
          className="primary"
          disabled={!file}
        >
          {file ? 'เริ่มประมวลผล' : 'เลือกไฟล์เพื่อเริ่ม'}
        </button>
        {message && <p className="message">{message}</p>}
      </form>
    </div>
  );
}
