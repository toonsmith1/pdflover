import React, { useRef, useState } from 'react';
import { UploadCloud, FileCheck, Plus } from 'lucide-react';

export default function DropZone({
  onFilesSelected,
  multiple = false,
  accept = 'application/pdf',
  buttonText = 'เลือกไฟล์ PDF',
  hintText = 'ลากไฟล์ PDF มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์',
  label = 'ยังไม่ได้เลือกไฟล์',
  selectedFile = null,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf'
    );
    if (files.length) {
      onFilesSelected(multiple ? files : [files[0]]);
    }
  };

  const handleChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length) {
      onFilesSelected(multiple ? files : [files[0]]);
    }
    e.target.value = '';
  };

  return (
    <div
      className={`drop ${isDragOver ? 'drag-over' : ''} ${selectedFile ? 'has-file' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <div className="drop-icon-container">
        {selectedFile ? (
          <FileCheck size={32} className="drop-icon-success" strokeWidth={1.5} />
        ) : (
          <UploadCloud size={34} className="drop-icon-upload" strokeWidth={1.5} />
        )}
      </div>

      <div className="drop-text-group">
        <span className="drop-main-title">{hintText}</span>
        <em className="drop-sub-label">{label}</em>
      </div>

      <button
        type="button"
        className="button merge-choose"
        onClick={(e) => {
          e.stopPropagation();
          inputRef.current?.click();
        }}
      >
        <Plus size={16} /> {buttonText}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
      />
    </div>
  );
}
