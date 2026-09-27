(() => {
  if (location.pathname === '/tool/merge') return;
  const form = document.querySelector('#operation-form');
  const controls = form.querySelector('.tool-controls');
  const picker = document.querySelector('#files');
  const drop = form.querySelector('.drop');
  const preview = document.querySelector('#preview');
  const run = document.querySelector('#run');
  const message = document.querySelector('#message');
  document.body.classList.add('upload-flow');
  const status = document.createElement('p');
  status.className = 'merge-step';
  form.before(status);
  const settings = document.createElement('div');
  settings.className = 'upload-settings';
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'primary merge-next';
  next.textContent = 'ตั้งค่าและดูตัวอย่าง →';
  const choose = document.createElement('button');
  choose.type = 'button';
  choose.className = 'merge-choose';
  choose.textContent = '＋ เลือกไฟล์';
  choose.addEventListener('click', event => { event.preventDefault(); picker.click(); });
  drop.insertBefore(choose, picker);
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'back';
  back.textContent = '← กลับไปเปลี่ยนไฟล์';
  let editing = false;
  const oldChange = picker.onchange;
  const paint = () => {
    document.body.classList.toggle('upload-editing', editing);
    status.textContent = editing ? '02 / ตั้งค่าและดูตัวอย่าง' : '01 / เลือกเอกสาร';
    drop.hidden = editing;
    next.hidden = editing;
    next.disabled = !picker.files.length;
    settings.hidden = !editing;
    preview.hidden = !editing;
    back.hidden = !editing;
  };
  next.addEventListener('click', () => {
    if (!picker.files.length) return;
    editing = true;
    // Only load the PDF viewer after the user enters the preview step.
    if (oldChange) oldChange.call(picker);
    paint();
  });
  back.addEventListener('click', () => { editing = false; paint(); });
  picker.onchange = () => {
    editing = false;
    document.querySelector('#file-label').textContent =
      [...picker.files].map(file => file.name).join(', ') || 'ยังไม่ได้เลือกไฟล์';
    document.querySelector('#pdf-preview').removeAttribute('src');
    paint();
  };
  drop.addEventListener('dragover', event => event.preventDefault());
  drop.addEventListener('drop', event => {
    event.preventDefault();
    const files = [...event.dataTransfer.files];
    if (files.length !== 1) { message.textContent = 'เมนูนี้เลือกได้ครั้งละ 1 ไฟล์'; return; }
    const transfer = new DataTransfer();
    transfer.items.add(files[0]);
    picker.files = transfer.files;
    picker.dispatchEvent(new Event('change', {bubbles:true}));
  });
  function initialize() {
    // Wait for menu-specific fields, including compression options.
    [...controls.children].forEach(child => {
      if (child !== drop && child !== message) settings.append(child);
    });
    controls.append(next, back, settings);
    paint();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
})();
