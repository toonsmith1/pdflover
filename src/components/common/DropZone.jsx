import React, { useRef, useState } from 'react';
import { UploadCloud, FileCheck, Plus } from 'lucide-react';
import { useI18n } from '../../i18n/LanguageContext';

export default function DropZone({
  onFilesSelected,
  multiple = false,
  accept = 'application/pdf',
  buttonText,
  hintText,
  label,
  selectedFile = null,
}) {
  const { t } = useI18n();
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);

  const resolvedBtnText = buttonText || t('dropZone.defaultButton');
  const resolvedHintText = hintText || t('dropZone.defaultHint');
  const resolvedLabel = label || (selectedFile ? t('dropZone.selected') : t('dropZone.noFile'));

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
        <span className="drop-main-title">{resolvedHintText}</span>
        <em className="drop-sub-label">{resolvedLabel}</em>
      </div>

      <button
        type="button"
        className="button merge-choose"
        onClick={(e) => {
          e.stopPropagation();
          inputRef.current?.click();
        }}
      >
        <Plus size={16} /> {resolvedBtnText}
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
