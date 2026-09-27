(() => {
  if (!location.pathname.endsWith('/text')) return;
  const picker = document.querySelector('#files');
  const pad = document.querySelector('#text-position-pad');
  const image = document.querySelector('#text-page-image');
  const itemsEl = document.querySelector('#text-items');
  const overlay = document.querySelector('#text-overlay');
  const addButton = document.querySelector('#text-add');
  const items = [];
  let imageUrl = '', activeId = null;
  const fonts = [['loma','Loma'],['krub','TH Krub'],['umpush','Umpush']];
  function addItem() {
    const id = crypto.randomUUID();
    const item = {id, text: '', x: .16, y: .78, size: 16, font: 'loma', color: '#222222'};
    items.push(item);
    const card = document.createElement('fieldset'); card.className = 'text-item'; card.dataset.id = id;
    card.innerHTML = '<legend>ข้อความ</legend><textarea rows="2" placeholder="พิมพ์ข้อความ"></textarea><label>ขนาด <input class="item-size" type="number" min="1" max="300" value="16"></label><label>ฟอนต์ <select class="item-font"></select></label><label>สี <input class="item-color" type="color" value="#222222"></label><button type="button" class="item-remove">ลบข้อความ</button>';
    const text = card.querySelector('textarea'), size = card.querySelector('.item-size'), font = card.querySelector('.item-font'), color = card.querySelector('.item-color');
    fonts.forEach(([value,label]) => font.add(new Option(label,value)));
    text.addEventListener('input', () => { item.text = text.value; draw(); });
    size.addEventListener('input', () => { item.size = Math.max(1, Number(size.value) || 16); draw(); });
    font.addEventListener('change', () => { item.font = font.value; draw(); });
    color.addEventListener('input', () => { item.color = color.value; draw(); });
    card.querySelector('.item-remove').addEventListener('click', () => { const index = items.findIndex(value => value.id === id); if (index >= 0) items.splice(index,1); card.remove(); draw(); });
    card.addEventListener('focusin', () => { activeId = id; draw(); });
    itemsEl.append(card); activeId = id; draw();
  }
  function draw() {
    overlay.replaceChildren();
    for (const item of items) {
      const span = document.createElement('span'); span.className = 'text-overlay-item'; span.textContent = item.text || 'ข้อความ';
      span.style.left = `${item.x*100}%`; span.style.top = `${item.y*100}%`; span.style.fontSize = `${item.size}px`; span.style.color = item.color; span.style.fontFamily = fonts.find(pair=>pair[0]===item.font)?.[1] || 'Loma'; span.dataset.id = item.id;
      span.addEventListener('pointerdown', event => { activeId = item.id; pad.setPointerCapture(event.pointerId); event.preventDefault(); }); overlay.append(span);
    }
  }
  function position(clientX, clientY) {
    const rect = image.getBoundingClientRect(); if (!image.naturalWidth || !activeId) return;
    const item = items.find(value => value.id === activeId); if (!item) return;
    item.x = Math.max(0,Math.min(1,(clientX-rect.left)/rect.width)); item.y = Math.max(0,Math.min(1,(clientY-rect.top)/rect.height)); draw();
  }
  let dragging = false;
  pad.addEventListener('pointerdown', event => { if (event.target.closest('.text-overlay-item')) dragging = true; else if (image.contains(event.target)) { dragging = true; position(event.clientX,event.clientY); } });
  pad.addEventListener('pointermove', event => { if (dragging) position(event.clientX,event.clientY); });
  pad.addEventListener('pointerup', () => { dragging = false; });
  addButton.addEventListener('click', addItem); addItem();
  picker.addEventListener('change', async () => {
    if (!picker.files[0]) return;
    const body = new FormData(); body.append('file',picker.files[0]);
    try {
      const response = await fetch('/api/render-preview',{method:'POST',body}); if (!response.ok) throw new Error('สร้างภาพตัวอย่างไม่ได้');
      if (imageUrl) URL.revokeObjectURL(imageUrl); imageUrl = URL.createObjectURL(await response.blob()); image.src = imageUrl;
    } catch(error) { document.querySelector('#message').textContent = error.message; }
  });
  window.pdfTextEditor = {getItems: () => items.filter(item=>item.text.trim()).map(({text,x,y,size,font,color})=>({text,x,y:1-y,size,font,color}))};
  window.addEventListener('pagehide',()=>{if(imageUrl)URL.revokeObjectURL(imageUrl);});
})();
