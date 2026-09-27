(() => {
  if (!location.pathname.endsWith('/organize')) return;
  const form = document.querySelector('#operation-form');
  const picker = document.querySelector('#files');
  const run = document.querySelector('#run');
  const message = document.querySelector('#message');
  const previewFrame = document.querySelector('#pdf-preview');
  const previewBox = document.querySelector('#preview');
  const previewOpen = document.querySelector('#preview-open');
  const previewMeta = document.querySelector('#preview-meta');
  const panel = document.createElement('div'); panel.className = 'page-order-grid'; panel.hidden = true;
  panel.innerHTML = '<strong>ลากหน้าเพื่อจัดลำดับ</strong><div class="page-cards"></div>';
  form.querySelector('.tool-controls').append(panel);
  const cards = panel.querySelector('.page-cards'); let order = [], dragged = null;
  function paint() {
    [...cards.children].forEach((card, index) => { card.dataset.page = order[index]; card.querySelector('b').textContent = `หน้า ${order[index]}`; });
    run.disabled = !order.length; run.textContent = order.length ? 'สร้างตัวอย่างลำดับใหม่' : 'เลือกไฟล์เพื่อเริ่ม';
  }
  function render(count) {
    order = Array.from({length: count}, (_, i) => i + 1);
    cards.replaceChildren(...order.map(page => {
      const card = document.createElement('div'); card.className = 'page-card'; card.draggable = true; card.dataset.page = page;
      card.innerHTML = `<span class="page-number">${page}</span><b>หน้า ${page}</b>`;
      card.addEventListener('dragstart', () => { dragged = card; card.classList.add('dragging'); });
      card.addEventListener('dragend', () => { dragged = null; card.classList.remove('dragging'); });
      card.addEventListener('dragover', event => event.preventDefault());
      card.addEventListener('drop', event => { event.preventDefault(); if (!dragged || dragged === card) return; const all = [...cards.children]; cards.insertBefore(dragged, all.indexOf(dragged) < all.indexOf(card) ? card.nextSibling : card); order = [...cards.children].map(item => Number(item.dataset.page)); paint(); });
      return card;
    }));
    paint(); panel.hidden = false;
  }
  picker.addEventListener('change', async () => {
    const file = picker.files[0]; if (!file) return;
    try { const body = new FormData(); body.append('file', file); const response = await fetch('/api/pdf-info', {method: 'POST', body}); if (!response.ok) throw new Error('อ่านจำนวนหน้าไม่ได้'); render((await response.json()).pages); }
    catch (error) { message.textContent = error.message; }
  });
  form.addEventListener('submit', async event => {
    if (!order.length) return; event.preventDefault(); run.disabled = true; run.textContent = 'กำลังสร้างตัวอย่าง…';
    const body = new FormData(); body.append('file', picker.files[0]); body.append('order', order.join(','));
    try {
      const response = await fetch('/api/organize', {method: 'POST', body});
      if (!response.ok) throw new Error(await response.text());
      const url = URL.createObjectURL(await response.blob());
      previewFrame.src = url; previewOpen.href = url; previewOpen.download = 'organized.pdf';
      previewMeta.textContent = `${order.length} หน้า · ตัวอย่างลำดับใหม่`;
      previewBox.hidden = false;
      let download = document.querySelector('#organize-download');
      if (!download) { download = document.createElement('a'); download.id = 'organize-download'; download.className = 'primary'; download.textContent = 'ดาวน์โหลด PDF'; document.querySelector('.preview-head').append(download); }
      download.href = url; download.download = 'organized.pdf';
      message.textContent = 'แสดงตัวอย่างลำดับใหม่แล้ว ตรวจสอบก่อนดาวน์โหลดได้';
    }
    catch (error) { message.textContent = `เกิดข้อผิดพลาด: ${error.message}`; }
    finally { run.disabled = false; run.textContent = 'สร้างตัวอย่างลำดับใหม่'; }
  });
})();
