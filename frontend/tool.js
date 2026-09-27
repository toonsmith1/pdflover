const tools={compress:['จัดการไฟล์และหน้า','ลดขนาด PDF','เบาลง ส่งต่อง่ายขึ้น'],split:['จัดการไฟล์และหน้า','แยกไฟล์ PDF','เลือกเฉพาะหน้าที่ต้องการ'],merge:['จัดการไฟล์และหน้า','รวมไฟล์ PDF','หลายเอกสารเป็นไฟล์เดียว'],organize:['จัดการไฟล์และหน้า','จัดเรียงหน้า','ย้ายและลบหน้าให้เข้าที่'],rotate:['จัดการไฟล์และหน้า','หมุนหน้า','ปรับเอกสารให้อ่านถูกทิศ'],crop:['จัดการไฟล์และหน้า','ครอปหน้า','จัดขอบและพื้นที่แสดงผล'],text:['แก้ไขเอกสาร','เพิ่มข้อความ','เติมคำลงบนเอกสาร'],watermark:['แก้ไขเอกสาร','ใส่ลายน้ำ','เพิ่มชื่อหรือสถานะเอกสาร'],pagenum:['แก้ไขเอกสาร','ใส่เลขหน้า','เรียงลำดับให้อ้างอิงง่าย'],signature:['แก้ไขเอกสาร','เพิ่มรูปลายเซ็น','วางลายเซ็นบนหน้ากระดาษ'],ocr:['แปลงและดึงข้อมูล','อ่านข้อความ · OCR','ทำไฟล์สแกนให้ค้นหาได้'],image:['แปลงและดึงข้อมูล','PDF เป็นรูป','บันทึกแต่ละหน้าเป็นภาพ'], 'image-pdf':['แปลงและดึงข้อมูล','รูปเป็น PDF','รวมภาพให้เป็นเอกสาร'],'extract-text':['แปลงและดึงข้อมูล','ดึงข้อความ','นำเนื้อหาไปใช้ต่อ'],'extract-table':['แปลงและดึงข้อมูล','ดึงตาราง','นำข้อมูลไปใช้ในสเปรดชีต'],protect:['ความปลอดภัย','ตั้งรหัสผ่าน','เพิ่มรหัสสำหรับเปิดเอกสาร'],unlock:['ความปลอดภัย','ถอดรหัสผ่าน','เปิดไฟล์ที่มีรหัสอยู่แล้ว'],redact:['ความปลอดภัย','ลบข้อมูลลับ','นำข้อมูลที่เลือกออกถาวร']};
const name=location.pathname.split('/').filter(Boolean)[1],tool=tools[name]||tools.compress;const $=s=>document.querySelector(s);$('#category').textContent=tool[0];$('#title').textContent=tool[1];$('#description').textContent=tool[2];
document.title = tool[1] + ' — pdflover';
if (name === 'split') $('#pages-field').hidden = false;
else $('#pages-field').remove();
if (name === 'rotate') $('#degrees-field').hidden = false;
else $('#degrees-field').remove();
if (name === 'crop') $('#crop-field').hidden = false;
else $('#crop-field').remove();
if (name === 'text') {
  $('#text-field').hidden = false;
  $('#text-position-pad').hidden = false;
} else { $('#text-field').remove(); $('#text-position-pad').remove(); }
$('#files').multiple = name === 'merge' || name === 'image-pdf';
const expandButton = $('#preview-expand');
function setExpanded(expanded) {
  $('#preview').classList.toggle('is-expanded', expanded);
  document.body.classList.toggle('preview-expanded', expanded);
  expandButton.setAttribute('aria-expanded', String(expanded));
  expandButton.textContent = expanded ? 'ย่อกลับ · Esc' : 'ขยายเต็มจอ';
}
expandButton.addEventListener('click', () => setExpanded(!$('#preview').classList.contains('is-expanded')));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { setExpanded(false); expandButton.focus(); }
});
$('#files').addEventListener('change', () => {
  setExpanded(false);
  // Runs after the file-change handler has created the local object URL.
  queueMicrotask(() => {
    if (previewUrl) $('#preview-open').href = previewUrl;
    else $('#preview-open').removeAttribute('href');
  });
});
if (name === 'text') $('#preview').hidden = true;
let previewUrl='';$('#files').onchange=()=>{const files=[...$('#files').files];$('#file-label').textContent=files.map(f=>f.name).join(', ')||'ยังไม่ได้เลือกไฟล์';$('#run').textContent=files.length?'เริ่มประมวลผล':'เลือกไฟล์เพื่อเริ่ม';if(previewUrl)URL.revokeObjectURL(previewUrl);if(files.length){previewUrl=URL.createObjectURL(files[0]);$('#pdf-preview').src=previewUrl;$('#preview-open').href=previewUrl;$('#preview-meta').textContent=files.length>1?`${files.length} ไฟล์ · แสดงไฟล์แรก`:'ไฟล์แรก';$('#preview').hidden=false}else{$('#preview').hidden=true;$('#pdf-preview').removeAttribute('src')}};
$('#operation-form').onsubmit=async e=>{e.preventDefault();if(name==='text'&&!window.pdfTextEditor?.processing){$('#message').textContent='จัดข้อความให้เรียบร้อย แล้วกด “ประมวลผลข้อความและดู PDF” ก่อน';return;}const files=[...$('#files').files];if(!files.length)return;let endpoint,body=new FormData();files.forEach(f=>body.append(name==='merge'?'files':'file',f));if(name==='split'){endpoint='/api/split';body.append('pages',$('#pages').value)}else if(name==='rotate'){endpoint='/api/rotate';body.append('degrees',$('#degrees').value)}else if(name==='compress')endpoint='/api/compress';else if(name==='crop'){endpoint='/api/crop';['left','bottom','right','top'].forEach(side=>body.append(side,$('#crop-'+side).value));}else if(name==='text'){endpoint='/api/text';body.append('items',JSON.stringify(window.pdfTextEditor.getItems()));}else{$('#message').textContent='เครื่องมือนี้กำลังเตรียมเชื่อมต่อ';return}$('#run').disabled=true;$('#run').textContent='กำลังประมวลผล…';try{const r=await fetch(endpoint,{method:'POST',body});if(!r.ok)throw new Error(await r.text());const url=URL.createObjectURL(await r.blob());$('#pdf-preview').src=url;$('#preview-open').href=url;$('#preview-open').download=name+'.pdf';$('#preview-meta').textContent='ผลลัพธ์พร้อมตรวจสอบ';$('#preview').hidden=false;let download=$('#result-download');if(!download){download=document.createElement('a');download.id='result-download';download.className='primary';download.textContent='ดาวน์โหลด PDF';document.querySelector('.preview-head').append(download)}download.href=url;download.download=name+'.pdf';$('#message').textContent='ประมวลผลเสร็จแล้ว แสดงตัวอย่างก่อนดาวน์โหลด'}catch(err){$('#message').textContent='เกิดข้อผิดพลาด: '+err.message}finally{$('#run').disabled=false;$('#run').textContent='ประมวลผลอีกครั้ง'}};
