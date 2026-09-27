const tools = [
  ['pages','ลดขนาด PDF','เบาลง ส่งต่อง่ายขึ้น','compress','−'],['pages','แยกไฟล์ PDF','เลือกเฉพาะหน้าที่ต้องการ','split','✂'],['pages','รวมไฟล์ PDF','หลายเอกสารเป็นไฟล์เดียว','merge','＋'],['pages','จัดเรียงหน้า','ย้ายและลบหน้าให้เข้าที่','organize','▦'],['pages','หมุนหน้า','ปรับเอกสารให้อ่านถูกทิศ','rotate','↻'],['pages','ครอปหน้า','จัดขอบและพื้นที่แสดงผล','crop','□'],['edit','เพิ่มข้อความ','เติมคำลงบนเอกสาร','text','T'],['edit','ใส่ลายน้ำ','เพิ่มชื่อหรือสถานะเอกสาร','watermark','◇'],['edit','ใส่เลขหน้า','เรียงลำดับให้อ้างอิงง่าย','pagenum','№'],['edit','เพิ่มรูปลายเซ็น','วางลายเซ็นบนหน้ากระดาษ','signature','✎'],['convert','อ่านข้อความ · OCR','ทำไฟล์สแกนให้ค้นหาได้','ocr','⌁'],['convert','PDF เป็นรูป','บันทึกแต่ละหน้าเป็นภาพ','image','▧'],['convert','รูปเป็น PDF','รวมภาพให้เป็นเอกสาร','image-pdf','▤'],['convert','ดึงข้อความ','นำเนื้อหาไปใช้ต่อ','extract-text','≡'],['convert','ดึงตาราง','นำข้อมูลไปใช้ในสเปรดชีต','extract-table','▤'],['secure','ตั้งรหัสผ่าน','เพิ่มรหัสสำหรับเปิดเอกสาร','protect','▣'],['secure','ถอดรหัสผ่าน','เปิดไฟล์ที่มีรหัสอยู่แล้ว','unlock','□'],['secure','ลบข้อมูลลับ','นำข้อมูลที่เลือกออกถาวร','redact','⌫']
];

const toolsEl = document.querySelector('#tools');
function render(filter = 'all') {
  toolsEl.replaceChildren();
  tools.filter(tool => filter === 'all' || tool[0] === filter).forEach(tool => {
    const link = document.createElement('a');
    link.className = 'tool';
    link.href = '/tool/' + tool[3];
    link.innerHTML = `<span class="icon">${tool[4]}</span><strong>${tool[1]}</strong><span>${tool[2]}</span><small>${tool[3].toUpperCase()}</small>`;
    toolsEl.append(link);
  });
}
document.querySelectorAll('[data-filter]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(item => item.classList.toggle('active', item === button));
    render(button.dataset.filter);
  });
});
fetch('/api/health').then(response => {
  document.querySelector('#status').textContent = response.ok ? 'local · ready' : 'offline';
}).catch(() => { document.querySelector('#status').textContent = 'offline'; });
render();
