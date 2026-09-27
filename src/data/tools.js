export const TOOLS = [
  { category: 'pages', categoryLabel: 'จัดการไฟล์และหน้า', id: 'compress', name: 'ลดขนาด PDF', desc: 'เบาลง ส่งต่อง่ายขึ้น', iconName: 'Minimize2', badge: 'เร็ว' },
  { category: 'pages', categoryLabel: 'จัดการไฟล์และหน้า', id: 'split', name: 'แยกไฟล์ PDF', desc: 'เลือกเฉพาะหน้าที่ต้องการ', iconName: 'Scissors', badge: '' },
  { category: 'pages', categoryLabel: 'จัดการไฟล์และหน้า', id: 'merge', name: 'รวมไฟล์ PDF', desc: 'หลายเอกสารเป็นไฟล์เดียว', iconName: 'Layers', badge: 'ยอดนิยม' },
  { category: 'pages', categoryLabel: 'จัดการไฟล์และหน้า', id: 'organize', name: 'จัดเรียงหน้า', desc: 'ย้ายและลบหน้าให้เข้าที่', iconName: 'LayoutGrid', badge: '' },
  { category: 'pages', categoryLabel: 'จัดการไฟล์และหน้า', id: 'rotate', name: 'หมุนหน้า', desc: 'ปรับเอกสารให้อ่านถูกทิศ', iconName: 'RotateCw', badge: '' },
  { category: 'pages', categoryLabel: 'จัดการไฟล์และหน้า', id: 'crop', name: 'ครอปหน้า', desc: 'จัดขอบและพื้นที่แสดงผล', iconName: 'Crop', badge: '' },
  { category: 'edit', categoryLabel: 'แก้ไขเอกสาร', id: 'text', name: 'เพิ่มข้อความ', desc: 'เติมคำลงบนเอกสารโดยตรง', iconName: 'Type', badge: 'อัปเกรดใหม่' },
  { category: 'edit', categoryLabel: 'แก้ไขเอกสาร', id: 'note', name: 'จดโน้ต & ไฮไลต์', desc: 'เขียนทับ ปากกาเน้นข้อความ โน้ต', iconName: 'Highlighter', badge: 'มาใหม่' },
  { category: 'edit', categoryLabel: 'แก้ไขเอกสาร', id: 'watermark', name: 'ใส่ลายน้ำ', desc: 'เพิ่มชื่อหรือสถานะเอกสาร', iconName: 'Stamp', badge: '' },
  { category: 'edit', categoryLabel: 'แก้ไขเอกสาร', id: 'pagenum', name: 'ใส่เลขหน้า', desc: 'เรียงลำดับให้อ้างอิงง่าย', iconName: 'Hash', badge: '' },
  { category: 'edit', categoryLabel: 'แก้ไขเอกสาร', id: 'signature', name: 'เพิ่มรูปลายเซ็น', desc: 'วางลายเซ็นบนหน้ากระดาษ', iconName: 'PenTool', badge: '' },
  { category: 'convert', categoryLabel: 'แปลงและดึงข้อมูล', id: 'image', name: 'PDF เป็นรูป', desc: 'บันทึกแต่ละหน้าเป็นภาพ', iconName: 'FileImage', badge: '' },
  { category: 'convert', categoryLabel: 'แปลงและดึงข้อมูล', id: 'image-pdf', name: 'รูปเป็น PDF', desc: 'รวมภาพให้เป็นเอกสาร', iconName: 'Images', badge: '' },
  { category: 'convert', categoryLabel: 'แปลงและดึงข้อมูล', id: 'extract-text', name: 'ดึงข้อความ', desc: 'นำเนื้อหาไปใช้ต่อ', iconName: 'FileText', badge: '' },
  { category: 'convert', categoryLabel: 'แปลงและดึงข้อมูล', id: 'extract-table', name: 'ดึงตาราง', desc: 'นำข้อมูลไปใช้ในสเปรดชีต', iconName: 'Table', badge: '' },
  { category: 'secure', categoryLabel: 'ความปลอดภัย', id: 'protect', name: 'ตั้งรหัสผ่าน', desc: 'เพิ่มรหัสสำหรับเปิดเอกสาร', iconName: 'Lock', badge: '' },
  { category: 'secure', categoryLabel: 'ความปลอดภัย', id: 'unlock', name: 'ถอดรหัสผ่าน', desc: 'เปิดไฟล์ที่มีรหัสอยู่แล้ว', iconName: 'Unlock', badge: '' },
  { category: 'secure', categoryLabel: 'ความปลอดภัย', id: 'redact', name: 'ลบข้อมูลลับ', desc: 'นำข้อมูลที่เลือกออกถาวร', iconName: 'Eraser', badge: '' },
  { category: 'external', categoryLabel: 'บริการภายนอก', id: 'ocr', name: 'อ่านข้อความ · OCR', desc: 'ส่งเอกสารไปประมวลผลผ่าน Typhoon OCR API', iconName: 'ScanText', badge: 'API ภายนอก' },
];

export const CATEGORIES = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'pages', label: 'จัดการไฟล์และหน้า' },
  { id: 'edit', label: 'แก้ไขเอกสาร' },
  { id: 'convert', label: 'แปลงและดึงข้อมูล' },
  { id: 'secure', label: 'ความปลอดภัย' },
  { id: 'external', label: 'บริการภายนอก' },
];

export const TOOL_MAP = Object.fromEntries(TOOLS.map(t => [t.id, t]));
