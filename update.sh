#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [ -d .git ]; then
  echo "กำลังดึงโค้ดเวอร์ชันล่าสุดจาก GitHub..."
  git pull --ff-only
  rm -rf dist
  ./install.sh
  echo "อัปเดตเสร็จแล้ว เริ่มใหม่ด้วย: ./run.sh"
  exit 0
fi

echo "โฟลเดอร์นี้ไม่ใช่ Git checkout"
echo "กรุณาดาวน์โหลด Release ใหม่จาก GitHub แล้วแทนที่โฟลเดอร์เดิม"
echo "เก็บไฟล์ .env และข้อมูลส่วนตัวไว้ก่อนแทนที่"
exit 1
