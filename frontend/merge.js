(() => {
  if (location.pathname !== '/tool/merge') return;
  // Replace the picker to remove the shared single-file change listeners.
  const previous = document.querySelector('#files');
  const picker = previous.cloneNode();
  previous.replaceWith(picker);
  picker.multiple = true;
  picker.style.display = 'none';
  const form = document.querySelector('#operation-form');
  const preview = document.querySelector('#preview');
  const run = document.querySelector('#run');
  const message = document.querySelector('#message');
  const label = document.querySelector('#file-label');
  document.querySelector('.drop span').textContent = 'ลากไฟล์ PDF มาวางที่นี่';
  document.body.classList.add('merge-flow');
  const drop = document.querySelector('.drop');
  const choose = document.createElement('button');
  choose.type = 'button';
  choose.className = 'merge-choose';
  choose.textContent = '＋ เลือกไฟล์ PDF';
  choose.addEventListener('click', event => { event.preventDefault(); picker.click(); });
  drop.insertBefore(choose, label);
  const hint = document.createElement('p');
  hint.textContent = 'เลือกหลายไฟล์พร้อมกัน หรือเพิ่มทีละรอบได้';
  drop.append(hint);
  preview.replaceChildren();
  preview.className = 'merge-workspace';
  const summary = document.createElement('p');
  summary.setAttribute('aria-live', 'polite');
  const grid = document.createElement('div');
  grid.className = 'merge-file-grid';
  const viewer = document.createElement('div');
  viewer.hidden = true;
  preview.append(summary, grid, viewer);
  let entries = [], dragId = null, viewerUrl = '', busy = false;
  let step = 'upload';
  const next = button('จัดเรียงและดูตัวอย่าง →', () => {
    step = 'arrange';
    render();
  });
  next.className = 'primary merge-next';
  run.before(next);
  const toolbar = document.createElement('div');
  toolbar.className = 'merge-toolbar';
  const back = button('← กลับไปเลือกไฟล์', () => { step = 'upload'; closePreview(); render(); });
  const addMore = button('＋ เพิ่มไฟล์', () => picker.click());
  toolbar.append(back, addMore);
  preview.before(toolbar);
  const stepLabel = document.createElement('p');
  stepLabel.className = 'merge-step';
  form.before(stepLabel);
  const key = file => [file.name, file.size, file.lastModified].join(':');
  function closePreview() {
    viewer.replaceChildren();
    viewer.hidden = true;
    if (viewerUrl) URL.revokeObjectURL(viewerUrl);
    viewerUrl = '';
  }
  function button(text, action) {
    const control = document.createElement('button');
    control.type = 'button';
    control.textContent = text;
    control.disabled = busy;
    control.addEventListener('click', action);
    return control;
  }
  function showPreview(entry) {
    closePreview();
    viewer.hidden = false;
    viewerUrl = URL.createObjectURL(entry.file);
    const title = document.createElement('p');
    title.textContent = entry.file.name;
    const frame = document.createElement('iframe');
    frame.title = 'ตัวอย่าง ' + entry.file.name;
    frame.src = viewerUrl;
    viewer.append(title, button('ปิดตัวอย่าง', closePreview), frame);
  }
  function move(from, to) {
    if (busy || from < 0 || to < 0 || to >= entries.length) return;
    const [entry] = entries.splice(from, 1);
    entries.splice(to, 0, entry);
    render();
  }
  function render() {
    grid.replaceChildren();
    if (!entries.length) step = 'upload';
    const arranging = step === 'arrange';
    preview.hidden = !arranging;
    toolbar.hidden = !arranging;
    drop.hidden = arranging;
    next.hidden = arranging;
    run.hidden = !arranging;
    next.disabled = busy || entries.length < 2;
    back.disabled = addMore.disabled = choose.disabled = busy;
    stepLabel.textContent = arranging ? '02 / จัดเรียงและดูตัวอย่าง' : '01 / เลือกเอกสารที่ต้องการรวม';
    summary.textContent = entries.length + ' ไฟล์ · ลากเรียงลำดับ · กดดูตัวอย่างทีละไฟล์';
    label.textContent = entries.length ? 'เลือกไว้ ' + entries.length + ' ไฟล์ — เพิ่มไฟล์ได้อีก' : 'ยังไม่ได้เลือกไฟล์';
    picker.disabled = busy;
    run.disabled = busy || entries.length < 2;
    run.textContent = busy ? 'กำลังรวมไฟล์…' : 'รวมไฟล์ PDF (' + entries.length + ' ไฟล์)';
    entries.forEach((entry, index) => {
      const card = document.createElement('article');
      card.className = 'merge-file-card';
      card.draggable = !busy;
      const number = document.createElement('strong');
      number.textContent = (index + 1) + '. PDF';
      const title = document.createElement('p');
      title.textContent = entry.file.name;
      const size = document.createElement('small');
      size.textContent = (entry.file.size / 1048576).toFixed(1) + ' MB';
      const controls = document.createElement('div');
      const earlier = button('←', () => move(index, index - 1));
      earlier.setAttribute('aria-label', 'เลื่อนขึ้น ' + entry.file.name);
      earlier.disabled = busy || index === 0;
      const later = button('→', () => move(index, index + 1));
      later.setAttribute('aria-label', 'เลื่อนลง ' + entry.file.name);
      later.disabled = busy || index === entries.length - 1;
      controls.append(earlier, later, button('ดูตัวอย่าง', () => showPreview(entry)), button('นำออก', () => {
        entries = entries.filter(item => item.id !== entry.id);
        closePreview();
        render();
      }));
      card.append(number, title, size, controls);
      card.addEventListener('dragstart', event => {
        dragId = entry.id;
        event.dataTransfer.setData('text/plain', entry.id);
        event.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragover', event => event.preventDefault());
      card.addEventListener('drop', event => {
        event.preventDefault();
        if (dragId) move(entries.findIndex(item => item.id === dragId), index);
        dragId = null;
      });
      card.addEventListener('dragend', () => { dragId = null; });
      grid.append(card);
    });
  }
  function addFiles(incoming) {
    if (busy) return;
    const known = new Set(entries.map(entry => key(entry.file)));
    let added = 0;
    for (const file of incoming) {
      if (!file.name.toLowerCase().endsWith('.pdf') || known.has(key(file))) continue;
      known.add(key(file));
      entries.push({id: crypto.randomUUID(), file});
      added++;
    }
    picker.value = '';
    message.textContent = 'เพิ่ม ' + added + ' ไฟล์ · รวม ' + entries.length + ' ไฟล์';
    render();
  }
  picker.addEventListener('change', () => {
    addFiles([...picker.files]);
  });
  drop.addEventListener('dragover', event => { event.preventDefault(); drop.classList.add('drag-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
  drop.addEventListener('drop', event => {
    event.preventDefault();
    drop.classList.remove('drag-over');
    addFiles([...event.dataTransfer.files]);
  });
  form.onsubmit = async event => {
    event.preventDefault();
    if (busy || entries.length < 2) return;
    const body = new FormData();
    entries.forEach(entry => body.append('files', entry.file));
    busy = true;
    render();
    try {
      const response = await fetch('/api/merge', {method: 'POST', body});
      if (!response.ok) throw new Error(await response.text());
      const url = URL.createObjectURL(await response.blob());
      viewer.replaceChildren(); viewer.hidden = false;
      const title = document.createElement('p'); title.textContent = 'ตัวอย่างไฟล์ที่รวมแล้ว';
      const frame = document.createElement('iframe'); frame.title = 'ตัวอย่างไฟล์ที่รวมแล้ว'; frame.src = url;
      const download = button('ดาวน์โหลด PDF', () => { const link = document.createElement('a'); link.href = url; link.download = 'merged.pdf'; link.click(); });
      viewer.append(title, download, button('ปิดตัวอย่าง', closePreview), frame);
      message.textContent = 'รวม ' + entries.length + ' ไฟล์เรียบร้อย ตรวจสอบตัวอย่างก่อนดาวน์โหลดได้';
    } catch (error) {
      message.textContent = 'รวมไฟล์ไม่สำเร็จ: ' + error.message;
    } finally {
      busy = false;
      render();
    }
  };
  window.addEventListener('pagehide', closePreview);
  render();
})();
