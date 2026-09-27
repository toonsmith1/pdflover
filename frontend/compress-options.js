(() => {
  if (!location.pathname.endsWith('/tool/compress')) return;
  const add = () => {
    if (document.querySelector('#quality') || !document.querySelector('.tool-controls')) return;
    const field = document.createElement('label');
    field.id = 'quality-field';
    field.innerHTML = 'ระดับการลดขนาด <select id="quality"><option value="low">ลดน้อย — รักษาคุณภาพสูง</option><option value="balanced" selected>สมดุล — ขนาดเล็กและอ่านชัด</option><option value="high">ลดมาก — ไฟล์เล็กที่สุด</option></select>';
    document.querySelector('.tool-controls').insertBefore(field, document.querySelector('#run'));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add);
  else add();
  const append = FormData.prototype.append;
  FormData.prototype.append = function (key, value, filename) {
    append.call(this, key, value, filename);
    if (key === 'file' && !this.has('quality')) append.call(this, 'quality', document.querySelector('#quality')?.value || 'balanced');
  };
})();
