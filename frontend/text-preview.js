(() => {
  if (!location.pathname.endsWith('/text')) return;
  const picker = document.querySelector('#files');
  const pad = document.querySelector('#text-position-pad');
  const image = document.querySelector('#text-page-image');
  const itemsEl = document.querySelector('#text-items');
  const overlay = document.querySelector('#text-overlay');
  const addButton = document.querySelector('#text-add');
  const processNext = document.querySelector('#text-process-next');
  const run = document.querySelector('#run');
  const resultPreview = document.querySelector('#preview');
  const stage = document.createElement('div'); stage.className = 'text-editor-stage';
  stage.append(document.querySelector('#text-field'), pad, processNext);
  document.querySelector('.upload-settings').append(stage);
  let processing = false;
  run.hidden = true; resultPreview.hidden = true;
  processNext.hidden = false;
  processNext.addEventListener('click', () => {
    if (!items.some(item => item.text.trim())) { document.querySelector('#message').textContent = 'เพิ่มข้อความอย่างน้อยหนึ่งรายการก่อนประมวลผล'; return; }
    processing = true; stage.hidden = true; processNext.hidden = true; run.hidden = false;
    run.textContent = 'ประมวลผลและแสดง PDF'; resultPreview.hidden = true;
    document.querySelector('.merge-step').textContent = '03 / ประมวลผล PDF';
    document.querySelector('#message').textContent = 'กดปุ่มด้านล่างเพื่อฝังข้อความทั้งหมดลงใน PDF';
    run.scrollIntoView({behavior:'smooth',block:'center'});
  });
  const backToEditor = document.createElement('button'); backToEditor.type = 'button'; backToEditor.className = 'back-to-text-editor'; backToEditor.textContent = '← กลับไปแก้ข้อความ';
  backToEditor.addEventListener('click', () => { processing = false; resultPreview.hidden = true; stage.hidden = false; run.hidden = true; processNext.hidden = false; document.querySelector('.merge-step').textContent = '02 / วางข้อความบนภาพเอกสาร'; });
  document.querySelector('.preview-head').prepend(backToEditor);
  window.pdfTextEditor = {getItems: () => items.filter(item=>item.text.trim()).map(({text,x,y,size,font,color})=>({text,x,y:1-y,size,font,color})),get processing(){return processing;}};
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
    text.addEventListener('focus', () => { activeId = id; draw(); });
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
      span.style.left = `${item.x*100}%`; span.style.top = `${item.y*100}%`; const scale = image.naturalWidth ? (image.clientWidth / image.naturalWidth) * 1.5 : 1; span.style.fontSize = `${item.size*scale}px`; span.style.color = item.color; span.style.fontFamily = fonts.find(pair=>pair[0]===item.font)?.[1] || 'Loma'; span.dataset.id = item.id;
      span.addEventListener('pointerdown', event => { activeId = item.id; event.preventDefault(); }); overlay.append(span);
    }
  }
  function position(clientX, clientY) {
    const rect = image.getBoundingClientRect(); if (!image.naturalWidth || !activeId) return;
    const item = items.find(value => value.id === activeId); if (!item) return;
    item.x = Math.max(0,Math.min(1,(clientX-rect.left)/rect.width)); item.y = Math.max(0,Math.min(1,(clientY-rect.top)/rect.height)); draw();
  }
  let dragging = false;
  pad.addEventListener('pointerdown', event => { const target = event.target.closest('.text-overlay-item'); if (target) activeId = target.dataset.id; if (target || document.querySelector('#text-canvas').contains(event.target)) { dragging = true; pad.setPointerCapture(event.pointerId); position(event.clientX,event.clientY); } });
  pad.addEventListener('pointermove', event => { if (dragging) position(event.clientX,event.clientY); });
  pad.addEventListener('pointerup', () => { dragging = false; });
  addButton.addEventListener('click', addItem); addItem();
  picker.addEventListener('change', async () => {
    if (!picker.files[0]) return;
    processNext.disabled = true; image.hidden = true;
    const body = new FormData(); body.append('file',picker.files[0]);
    try {
      const response = await fetch('/api/render-preview',{method:'POST',body}); if (!response.ok) throw new Error('สร้างภาพตัวอย่างไม่ได้');
      if (imageUrl) URL.revokeObjectURL(imageUrl); imageUrl = URL.createObjectURL(await response.blob()); image.onload = () => { image.hidden = false; processNext.disabled = false; document.querySelector('#text-position-pad > span:first-child').hidden = true; draw(); }; image.onerror = () => { image.hidden = true; document.querySelector('#text-position-pad > span:first-child').textContent = 'อ่านภาพตัวอย่างไม่ได้ กรุณาลองบันทึก PDF ใหม่'; }; image.src = imageUrl;
    } catch(error) { document.querySelector('#message').textContent = error.message; }
  });
  window.addEventListener('pagehide',()=>{if(imageUrl)URL.revokeObjectURL(imageUrl);});
})();
