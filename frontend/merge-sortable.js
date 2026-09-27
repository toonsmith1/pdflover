(() => {
  if (!location.pathname.endsWith('/tool/merge')) return;
  const input = document.querySelector('#files');
  const preview = document.querySelector('#preview');
  if (!input || !preview) return;
  preview.classList.add('merge-preview');
  const dropHint = document.querySelector('.drop span');
  if (dropHint) dropHint.textContent = 'เลือกไฟล์ PDF เพิ่มได้หลายครั้ง';
  let files = [];
  let syncing = false;
  const syncInput = () => {
    const transfer = new DataTransfer();
    files.forEach(file => transfer.items.add(file));
    syncing = true;
    input.files = transfer.files;
    setTimeout(() => { syncing = false; }, 0);
  };
  const bind = () => {
    const cards = [...preview.querySelectorAll('.file-preview')];
    if (!cards.length) return;
    cards.forEach((card, index) => {
      card.draggable = true;
      card.classList.add('sortable-file');
      card.dataset.index = index;
      card.ondragstart = event => { event.dataTransfer.effectAllowed = 'move'; card.classList.add('dragging'); };
      card.ondragend = () => card.classList.remove('dragging');
      card.ondragover = event => { event.preventDefault(); card.classList.add('drag-over'); };
      card.ondragleave = () => card.classList.remove('drag-over');
      card.ondrop = event => {
        event.preventDefault(); card.classList.remove('drag-over');
        const from = Number(preview.querySelector('.dragging')?.dataset.index);
        const to = Number(card.dataset.index);
        if (!Number.isInteger(from) || from === to) return;
        const [moved] = files.splice(from, 1); files.splice(to, 0, moved);
        syncInput();
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };
    });
  };
  input.addEventListener('change', () => {
    if (!syncing) {
      const incoming = [...input.files];
      const known = new Set(files.map(file => `${file.name}:${file.size}:${file.lastModified}`));
      files = files.concat(incoming.filter(file => !known.has(`${file.name}:${file.size}:${file.lastModified}`)));
      syncInput();
    }
    setTimeout(bind, 0);
  });
})();
