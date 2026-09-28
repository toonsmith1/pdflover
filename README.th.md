# PDF Lover

[English](README.md) | **ภาษาไทย** | [日本語](README.ja.md)

---

PDF Lover เป็นชุดเครื่องมือจัดการไฟล์ PDF แบบ Local-First ที่ทำงานบนเครื่องของคุณโดยตรง พร้อมอินเทอร์เฟซเว็บที่สวยงาม เรียบง่ายสไตล์มินิมอล ด้วย React และประมวลผลผ่าน FastAPI (Python) โดยเอกสารของคุณจะไม่ถูกส่งไปยังเซิร์ฟเวอร์ภายนอก เพื่อความเป็นส่วนตัวและความปลอดภัยสูงสุด (ยกเว้นฟีเจอร์ OCR ที่เชื่อมต่อผ่าน Typhoon OCR API)

## ฟีเจอร์ที่พร้อมใช้งาน

### 1. จัดการหน้าและโครงสร้างไฟล์ (Organize & Layout)
- **รวมไฟล์ (Merge):** รวมเอกสาร PDF หลายไฟล์เข้าด้วยกัน พร้อมพรีวิวและจัดเรียงลำดับ
- **แยกหน้า (Split):** เลือกแยกเฉพาะหน้าที่ต้องการ (เช่น `1-3, 5, 8`)
- **จัดเรียงหน้า (Organize):** ลากสลับตำแหน่ง ลบ หรือหมุนหน้าเอกสารทีละหน้า
- **หมุนหน้า (Rotate):** หมุนทั้งเอกสารหรือเฉพาะหน้าที่ต้องการ 90°, 180°, 270°
- **ครอบตัด (Crop):** ปรับขอบกระดาษและตัดส่วนที่ไม่ต้องการออก

### 2. แก้ไขเนื้อหาและลายเซ็น (Content & Annotation)
- **ใส่ข้อความ (Add Text):** วางกล่องข้อความ รองรับภาษาไทยสมบูรณ์ สระและวรรณยุกต์ถูกต้อง
- **จดโน้ต (Notes):** เพิ่มข้อความคอมเมนต์และคำอธิบายลงบนเอกสาร
- **ใส่ลายน้ำ (Watermark):** เพิ่มลายน้ำข้อความหรือรูปภาพ ปรับความโปร่งใสและองศาได้
- **รันเลขหน้า (Page Numbers):** กำหนดตำแหน่งและรูปแบบเลขหน้า (เช่น ล่างกลาง, ขวาล่าง)
- **ลงลายเซ็น (Digital Signature):** วาดลายเซ็นหรืออัปโหลดรูปลายเซ็นแปะลงในเอกสาร

### 3. แปลงไฟล์และดึงข้อมูล (Conversion & Extraction)
- **PDF เป็นรูปภาพ (PDF to Images):** บันทึกหน้า PDF เป็นรูปภาพ PNG (ดาวน์โหลดเป็น ZIP)
- **รูปภาพเป็น PDF (Images to PDF):** รวมรูปภาพ PNG/JPG/WebP เป็นไฟล์ PDF เล่มเดียว
- **ดึงข้อความ (Extract Text):** สกัดข้อความภาษาไทย/อังกฤษออกมาเป็นไฟล์ `.txt`
- **ดึงตาราง (Extract Table):** ตรวจจับและดึงโครงสร้างตารางข้อมูลในหน้าเอกสาร

### 4. ความปลอดภัยและความเป็นส่วนตัว (Security & Privacy)
- **ล็อกรหัสผ่าน (Protect):** ตั้งรหัสผ่านเข้ารหัสไฟล์ PDF
- **ปลดล็อกรหัสผ่าน (Unlock):** ถอดรหัสผ่านเพื่อนำเอกสารไปใช้งานต่อ
- **เซ็นเซอร์/ถมดำ (Redact):** ลากคลุมทับข้อมูลส่วนบุคคลหรือข้อมูลสำคัญแบบถาวร

### 5. บีบอัดไฟล์ (Compression)
- **ย่อขนาดไฟล์ (Compress):** ลดขนาดไฟล์ PDF (รองรับการลดความละเอียดรูปภาพเมื่อติดตั้ง Ghostscript)

---

## ความต้องการของระบบ (Requirements)

- **Python:** เวอร์ชัน 3.11 ขึ้นไป
- **Node.js & npm:** เวอร์ชัน 18 ขึ้นไป (สำหรับ build ส่วน React frontend)
- **Ghostscript (ทางเลือก):** สำหรับการบีบอัดเอกสารแบบสแกน (`sudo apt install ghostscript` บน Linux)
- **Typhoon OCR API Key (ทางเลือก):** ใส่ใน `.env` หากต้องการใช้งาน OCR ถอดข้อความจากภาพสแกน

---

## วิธีเริ่มต้นใช้งาน (Quick Start)

### สำหรับ Windows

1. โคลนคลังโค้ด:
   ```bash
   git clone https://github.com/toonsmith1/pdflover.git
   cd pdflover
   ```

2. เริ่มต้นใช้งานได้ทันที:
   - ดับเบิลคลิกไฟล์ `run.bat` หรือเปิด PowerShell แล้วรัน:
     ```powershell
     .\run.bat
     # หรือ
     .\run.ps1
     ```
   *(สคริปต์จะทำการสร้าง `.venv`, ติดตั้งแพ็กเกจ Python และ npm, ทำการ build frontend และเปิดเซิร์ฟเวอร์ให้อัตโนมัติในครั้งแรก)*

3. เปิดเบราว์เซอร์ไปที่ <http://127.0.0.1:8000>

---

### สำหรับ Linux / macOS

1. ติดตั้งสภาพแวดล้อม (ทำครั้งแรกครั้งเดียว):
   ```bash
   git clone https://github.com/toonsmith1/pdflover.git
   cd pdflover
   chmod +x setup.sh run.sh
   ./setup.sh
   ```

2. เปิดเซิร์ฟเวอร์:
   ```bash
   ./run.sh
   ```

3. เปิดเบราว์เซอร์ไปที่ <http://127.0.0.1:8000>

---

### ติดตั้งและรันแบบ Manual

```bash
# 1. สร้างและเปิดใช้งาน Python Virtual Environment
python -m venv .venv

# บน Linux/macOS:
source .venv/bin/activate
# บน Windows:
.venv\Scripts\activate

# ติดตั้งไลบรารี Python
pip install -r requirements.txt
cp .env.example .env

# 2. ติดตั้งและ Build ส่วนของ Frontend (React + Vite)
npm install
npm run build

# 3. รันเว็บแอปพลิเคชัน
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

หากต้องการพัฒนาระบบ Frontend สามารถเปิด Vite dev server คู่กับ API proxy ได้ด้วยคำสั่ง:
```bash
npm run dev
```

---

## โครงสร้างโปรเจกต์ (Project Structure)

```text
app/
  main.py          FastAPI router & บริการเสิร์ฟหน้าเว็บ React (SPA)
  config.py        การจัดการค่า Environment และการตั้งค่าระบบ
  pdf_service.py   ฟังก์ชันหลักในการประมวลผล PDF (pypdf, pikepdf, reportlab, pypdfium2)
  ads_service.py   ระบบจัดการ Partner Spotlight และแบนเนอร์แนะนำเครื่องมือ
src/
  components/      คอมโพเนนต์ React ทั้งหมด (เครื่องมือต่างๆ, แคตตาล็อก, DropZone, Preview)
  styles.css       ระบบสไตล์มินิมอล ดีไซน์เรียบง่าย สบายตา
dist/              ไฟล์ Production bundle ของ Frontend ที่เสิร์ฟผ่าน FastAPI
tests/             ชุดทดสอบระบบอัตโนมัติ (Automated tests)
```

## สัญญาอนุญาตสิทธิ์ (License)

PDF Lover ใช้ [PDF Lover Source-Available License](LICENSE)

ระบบ Partner Spotlight และระบบแนะนำพันธมิตรเป็นส่วนสำคัญของซอฟต์แวร์ ห้ามลบ
ปิด ซ่อน แทนที่ หรือข้ามการทำงานดังกล่าว รวมถึง `app/ads_service.py`
การแจกจ่าย การให้บริการเชิงพาณิชย์ หรือการโฮสต์เพื่อการค้าต้องได้รับอนุญาตเป็นลายลักษณ์อักษรล่วงหน้า
