(() => {
  if (!location.pathname.endsWith('/text')) return;
  const picker = document.querySelector('#files');
  const pad = document.querySelector('#text-position-pad');
  const image = document.querySelector('#text-page-image');
  const overlay = document.querySelector('#text-overlay');
  const dot = document.querySelector('#text-position-dot');
  let imageUrl = '';
  let pointerHeld = false;
  function placeAt(clientX, clientY) {
    if (!image.naturalWidth) return;
    const imageRect = image.getBoundingClientRect();
    const padRect = pad.getBoundingClientRect();
    const x = Math.max(0, Math.min(imageRect.width, clientX - imageRect.left));
    const y = Math.max(0, Math.min(imageRect.height, clientY - imageRect.top));
    const px = x / imageRect.width, py = y / imageRect.height;
    dot.style.left = `${imageRect.left - padRect.left + x}px`;
    dot.style.top = `${imageRect.top - padRect.top + y}px`;
    overlay.style.left = `${imageRect.left - padRect.left + x}px`;
    overlay.style.top = `${imageRect.top - padRect.top + y}px`;
    document.querySelector('#text-x').value = Math.round(px * image.naturalWidth);
    document.querySelector('#text-y').value = Math.round((1 - py) * image.naturalHeight);
  }
  dot.addEventListener('pointerdown', event => { pointerHeld = true; dot.setPointerCapture(event.pointerId); event.preventDefault(); });
  dot.addEventListener('pointermove', event => { if (pointerHeld) placeAt(event.clientX, event.clientY); });
  dot.addEventListener('pointerup', () => { pointerHeld = false; });
  pad.addEventListener('pointerdown', event => { if (event.target !== dot) placeAt(event.clientX, event.clientY); });
  const updateOverlay = () => {
    overlay.textContent = document.querySelector('#text-value').value || 'ตัวอย่างข้อความ';
    overlay.style.color = document.querySelector('#text-color').value;
    overlay.style.fontSize = `${Math.max(8, Number(document.querySelector('#text-size').value) || 16)}px`;
    overlay.style.fontFamily = document.querySelector('#text-font').selectedOptions[0].text;
  };
  ['text-value','text-color','text-size','text-font'].forEach(id => document.querySelector('#' + id).addEventListener('input', updateOverlay));
  document.querySelector('#text-font').addEventListener('change', updateOverlay);
  updateOverlay();
  picker.addEventListener('change', async () => {
    if (!picker.files[0]) return;
    const body = new FormData(); body.append('file', picker.files[0]);
    try {
      const response = await fetch('/api/render-preview', {method: 'POST', body});
      if (!response.ok) throw new Error('สร้างภาพตัวอย่างไม่ได้');
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      imageUrl = URL.createObjectURL(await response.blob());
      image.src = imageUrl;
      image.onload = () => { placeAt(image.getBoundingClientRect().left + image.getBoundingClientRect().width * .16, image.getBoundingClientRect().top + image.getBoundingClientRect().height * .78); };
      pad.classList.add('has-page-image');
    } catch (error) { document.querySelector('#message').textContent = error.message; }
  });
  window.addEventListener('pagehide', () => { if (imageUrl) URL.revokeObjectURL(imageUrl); });
})();
