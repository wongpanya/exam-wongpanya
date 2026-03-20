# คู่มือการติดตั้งและ Deploy ระบบสอบออนไลน์ (Anti-Cheat Exam System)

เอกสารนี้ครอบคลุมขั้นตอนการติดตั้ง Environment สำหรับนักพัฒนา (Local) และการนำระบบขึ้นเซิร์ฟเวอร์จริง (Production)

## ภาพรวมสถาปัตยกรรม (Architecture)
- **Frontend:** React + Vite (แนะนำ Deploy ทิ้งไว้บน **Vercel**)
- **Backend:** Node.js + Express + Socket.io (แนะนำ Deploy ที่ **DigitalOcean App Platform** หรือ VPS ปกติ)
- **Database:** MongoDB Atlas (ฟรี M0 เพียงพอเพราะมีเทคโนโลยี In-Memory Cache ช่วยลดภาระฐานข้อมูล)

> **⚠️ หมายเหตุสำคัญ:** Backend ของโปรเจ็กต์นี้ **ไม่สามารถ Deploy บน Vercel ได้** เนื่องจากระบบได้วางสถาปัตยกรรม **WebSockets (Socket.io)** และ **In-Memory Cache (RAM)** ไว้เพื่อรองรับผู้ใช้ 200 คน 
> (Vercel เป็นสถาปัตยกรรมแบบ Serverless ซึ่งดับลงทุกครั้งที่โหลดเสร็จ ทำให้ Cache หาย และไม่รองรับ WebSocket Persistent Connection)

---

## 1. การเตรียมความพร้อม (Prerequisites)
1. **Node.js** (v18 หรือใหม่กว่า)
2. บัญชี **MongoDB Atlas** (สร้างคลัสเตอร์ฟรี)
3. บัญชี **Vercel** (สำหรับฝั่งหน้าบ้าน)
4. บัญชี **DigitalOcean** (สำหรับฝั่งหลังบ้าน)
5. บัญชี **GitHub** (สำหรับการเชื่อมต่อ CI/CD)

---

## 2. รันระบบในเครื่องตัวเอง (Local Development)

### 2.1 Clone โปรเจกต์
```bash
git clone <your-repo-url>
cd exam-wongpanya
```

### 2.2 ติดตั้งระบบฝั่ง Backend
```bash
cd backend
npm install
```
สร้างไฟล์ `.env` ในโฟลเดอร์ `backend`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/exam_db?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here
QR_SECRET=your_qr_secret_key_here
FRONTEND_URL=http://localhost:5173
```
รันเซอร์วิส (จะเปิดการทำงานบน Port: 5000):
```bash
npm run dev
```

### 2.3 ติดตั้งระบบฝั่ง Frontend
*(เปิด Terminal ใหม่ และกลับไปที่ Root ของโฟลเดอร์ Project)*
```bash
cd frontend
npm install
```
สร้างไฟล์ `.env` ในโฟลเดอร์ `frontend`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```
รันเซอร์วิส (จะเปิดการทำงานบน Port: 5173):
```bash
npm run dev
```

---

## 3. การนำระบบขึ้น Server จริง (Production Deployment)

### 3.1 การ Deploy Backend บน DigitalOcean (DO) App Platform
1. นำโค้ดโปรเจกต์ของคุณทั้งโฟลเดอร์ Push ขึ้น GitHub ให้อัปเดตล่าสุด
2. สมัครและเข้าสู่ระบบที่ **DigitalOcean**
3. ไปที่เมนู **Apps** ด้านซ้ายมือ แล้วกด **Create App**
4. ในกล่อง Source ให้เลือกบัญชี **GitHub** ของคุณ และเลือก Repository ตนเอง `exam-wongpanya`
5. ในหน้าตั้งค่าโปรเจกต์:
   - **Source Directory:** พิมพ์แก้เป็น `/backend` (DO จะดึงแค่โฟลเดอร์นี้ไปรัน)
   - กดยืนยันให้ DO จัดประเภทรันเป็น Node.js
6. ในแถบ **Environment Variables (ตัวแปรสภาพแวดล้อม)** ให้กด Bulk Edit เพิ่มค่าดังนี้:
   ```env
   NODE_ENV=production
   MONGO_URI=(ใส่ Connection String ของ MongoDB Atlas)
   JWT_SECRET=(ใส่รหัสผ่านสุ่มยากๆ)
   QR_SECRET=(ใส่รหัสผ่านสุ่มยากๆ ไว้หมุนเวลา QR)
   FRONTEND_URL=(ข้ามออปชั่นนี้ไปก่อน หรือใส่ URL มั่วๆ ไปก่อน เราจะกลับมาอัปเดตทีหลัง)
   ```
7. ในหน้า **Build & Run** ตรวจสอบว่า `HTTP Request Routes` Map ไปที่ `/` ของแอป (เซิร์ฟเวอร์เรามีการตั้ง process.env.PORT ไว้แล้ว)
8. **กำหนดขนาดเครื่อง (Size):**
   - ให้เปลี่ยนเป็น Basic -> **Eco-micro (0.25 vCPU / 512MB RAM)** ราคา $5/เดือน
   - *(เครื่องไซซ์นี้เพียงพอสำหรับทำข้อสอบพร้อมกัน 150-200 คน (1,000+ Req/min) เนื่องจากทำระบบ Cache ช่วยลดภาระสำเร็จแล้ว)*
9. กด **Deploy** จากนั้นรอระบบรันเสร็จ คุณจะได้ URL ของหลังบ้าน (เช่น `https://sea-turtle-app-xxxx.ondigitalocean.app`)

### 3.2 การ Deploy Frontend บน Vercel
1. เข้าเว็บไซต์ **Vercel**
2. กด **Add New Project** และเลือก Repository GitHub เดียวกัน
3. ระบุ **Root Directory** ขานี้เป็น `frontend`
4. ตั้งค่า **Framework Preset** เป็น **Vite**
5. เปิดเมนู Environment Variables และใส่ค่า:
   - `VITE_API_URL`: เอาเดโม URL ได้จาก DO ข้อที่ 9 + เติม `/api` เข้าไป (เช่น `https://sea-turtle-app-xxxx.ondigitalocean.app/api`)
   - `VITE_SOCKET_URL`: ใส่ URL ขา DO แบบมีแค่โดเมนอย่างเดียว (เช่น `https://sea-turtle-app-xxxx.ondigitalocean.app`)
6. กด **Deploy** 
7. **(สำคัญมาก)** สำเนา URL ของ Frontend ที่เสร็จแล้ว (เช่น `https://exam-student-xxx.vercel.app`)
   - **กลับไปที่ DigitalOcean Apps > Settings > App-Level Environment Variables**
   - ตั้ง/แก้ไขตัวแปร `FRONTEND_URL` โยนโดเมนตะกี้ลงไป (อย่าใส่เครื่องหมาย `/` ปิดท้าย)
   - เซฟการตั้งค่าเพื่อให้เกิดการ Re-deploy ใหม่ 1 ครั้ง ระบบ CORS จึงจะยอมให้ Vercel ยิงข้อสอบเข้า DO ได้ครับ

---

## 4. ข้อควรระวังและการดูแลรักษา
- **MongoDB Free Tier Limits:** รองรับได้ 100 Operations/วินาที ปัจจุบันมีโค้ดจัดการใช้ `updateOne` สลับ `node-cache` รมดำข้อมููลบนเซิร์ฟเวอร์ โควต้ารองรับ 200 คนได้อย่างสบาย ไม่ถูกถีบเด้ง Database Lock
- **WebSockets Live Connections:** อาจารย์ที่หน้าจอ **Monitor** จะเห็นนักเรียนส่งข้อสอบแบบสดๆ และฝั่งนักเรียนจะเปลี่ยนสถานะเป็น "ระงับการสอบ" ทันทีแบบวินาทีต่อวินาที
- **การใช้ In-Memory Cache Invalidate:** หากเข้าไปปรับแก้ไขการตั้งค่าชุดข้อสอบตอนมัน Active อยู่ ค่าจะถูก Delay ราว 2-5 นาทีด้วย Cache แนะนำให้รอ หรือ Restart App ใน DO 1 ครั้ง เพื่อทิ้งขยะ Cache ทั้งหมด
