(() => {
  if (!location.pathname.endsWith('/text')) return;
  const picker = document.querySelector('#files');
  const pad = document.querySelector('#text-position-pad');
  let imageUrl = '';
  picker.addEventListener('change', async () => {
    if (!picker.files[0]) return;
    const body = new FormData(); body.append('file', picker.files[0]);
    try {
      const response = await fetch('/api/render-preview', {method: 'POST', body});
      if (!response.ok) throw new Error('สร้างภาพตัวอย่างไม่ได้');
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      imageUrl = URL.createObjectURL(await response.blob());
      pad.style.backgroundImage = `url(${imageUrl})`;
      pad.style.backgroundSize = 'contain'; pad.style.backgroundRepeat = 'no-repeat'; pad.style.backgroundPosition = 'center';
      pad.classList.add('has-page-image');
    } catch (error) { document.querySelector('#message').textContent = error.message; }
  });
  window.addEventListener('pagehide', () => { if (imageUrl) URL.revokeObjectURL(imageUrl); });
})();
