(() => {
  if (!location.pathname.endsWith('/tool/merge')) return;
  const input = document.querySelector('#files');
  const preview = document.querySelector('#preview');
  const frame = document.querySelector('#pdf-preview');
  if (!input || !preview || !frame) return;
  input.multiple = true;
  const urls = [];
  input.addEventListener('change', () => {
    urls.splice(0).forEach(URL.revokeObjectURL);
    const files = [...input.files];
    if (!files.length) return;
    frame.hidden = true;
    preview.querySelectorAll('.file-preview').forEach(node => node.remove());
    files.forEach((file, index) => {
      const url = URL.createObjectURL(file);
      urls.push(url);
      const item = document.createElement('div');
      item.className = 'file-preview';
      item.innerHTML = `<div class="preview-file-name">${index + 1}. ${file.name}</div><iframe title="ตัวอย่าง ${file.name}"></iframe>`;
      item.querySelector('iframe').src = url;
      preview.append(item);
    });
    preview.hidden = false;
    const meta = preview.querySelector('#preview-meta');
    if (meta) meta.textContent = `${files.length} ไฟล์ · แสดงตัวอย่างครบทุกไฟล์`;
  });
})();
