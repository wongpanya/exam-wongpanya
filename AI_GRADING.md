# ระบบตรวจข้อสอบอัตนัยด้วย AI

ระบบนี้ต่อยอดจาก Express + Mongoose + React เดิม โดยข้อสอบเก่าจะยังใช้การตรวจแบบ `exact` ตามเดิม และมีเพียงคำถาม `text` ที่กำหนด `gradingMode: "ai"` พร้อม Ground Truth และ Rubric เท่านั้นที่เข้าสู่ AI Router

## ภาพรวมการทำงาน

1. นักศึกษาส่งข้อสอบ ระบบบันทึกคำตอบก่อนและตอบกลับทันที
2. ข้อปรนัย/ข้อแบบเดิมถูกตรวจด้วย exact match
3. ข้ออัตนัย AI ถูกสร้างเป็นงาน `pending` โดยใช้ `attemptId + questionId` เป็นตัวระบุคำตอบ
4. Worker เลือก Primary Provider, ตรวจ configuration health, retry เมื่อเป็น transient error และเปลี่ยนไป Fallback Provider เมื่อจำเป็น
5. Server ตรวจ JSON, Rubric ID, คะแนนรายเกณฑ์, ผลรวม, confidence และ evidence ทุกครั้ง
6. Rules Engine อาจส่งผลให้อาจารย์ตรวจซ้ำ แต่จะไม่แก้คะแนน AI แบบเงียบ ๆ
7. อาจารย์ยืนยันหรือปรับคะแนนได้ โดย `aiScore` จะไม่ถูกเขียนทับ และทุกการกระทำมีประวัติ

ข้อมูล audit ถูกแยกเป็น collection ต่อไปนี้:

- `gradingruns`: provider attempt ทุกครั้ง รวม retry/fallback/error/token/latency
- `gradingresults`: ผลที่เลือกใช้ล่าสุด พร้อม `aiScore`, `teacherScore`, `finalScore`
- `gradingreviewlogs`: ประวัติการยืนยัน ปรับคะแนน และ regrade

## Environment variables

คัดลอก `backend/.env.example` แล้วกำหนดค่าที่ backend เท่านั้น ห้ามใช้ prefix `VITE_` กับ API key

```env
AI_PRIMARY_PROVIDER=gemini
AI_FALLBACK_PROVIDERS=openrouter
AI_CREDENTIALS_ENCRYPTION_KEY=replace-with-a-strong-secret-at-least-32-characters
AI_TIMEOUT_MS=30000
AI_MAX_RETRIES=2
AI_RETRY_BASE_DELAY_MS=250

AI_REVIEW_CONFIDENCE_THRESHOLD=0.70
AI_SCORE_DISAGREEMENT_THRESHOLD=2
AI_HIGH_SCORE_WITHOUT_EVIDENCE_RATIO=0.70
AI_MAX_ANSWER_CHARS=12000
AI_MAX_REGRADES_PER_ANSWER=5

# ปิดเป็นค่าเริ่มต้น เพราะ raw response อาจมีข้อความคำตอบนักศึกษา
AI_STORE_RAW_RESPONSES=false

OPENROUTER_SITE_URL=
OPENROUTER_APP_NAME=Exam AI Grading
```

`AI_CREDENTIALS_ENCRYPTION_KEY` ใช้เข้ารหัส API key ของอาจารย์ด้วย AES-256-GCM ก่อนเก็บในฐานข้อมูล ค่านี้ต้องมีอย่างน้อย 32 ตัวอักษรและต้องคงเดิมตลอดอายุข้อมูล หากเปลี่ยนค่า key เดิมจะถอดรหัสไม่ได้

## ตั้งค่า Provider สำหรับอาจารย์

1. เข้าระบบด้วยบัญชีอาจารย์ แล้วเปิดเมนู **ตั้งค่า AI Provider** (`/teacher/ai-settings`)
2. วาง Gemini หรือ OpenRouter API key แล้วกด **ตรวจสอบและบันทึก**
3. Server จะตรวจ key และโหลดรายชื่อ model ที่บัญชีนั้นใช้งานได้
4. เลือก model เริ่มต้นจาก dropdown หรือเลือก model รายข้อในหน้าสร้าง/แก้ข้อสอบ
5. เลือก **Provider หลักสำหรับการตรวจ AI** เพื่อกำหนดลำดับการเรียกของบัญชีอาจารย์นั้น

API key แยกตามบัญชีอาจารย์ ไม่ถูกส่งกลับไปยัง browser และใช้ตรวจเฉพาะข้อสอบของเจ้าของ key นั้น อาจารย์กรอกเฉพาะ key โดยไม่ต้องพิมพ์ชื่อ model เอง
หาก Provider หลักตรวจไม่สำเร็จ ระบบจะลอง Provider อื่นที่อาจารย์ตั้งค่าไว้เป็น fallback โดยอัตโนมัติ

ไม่มีชื่อโมเดลถูก hardcode ใน source code หาก key หรือ model ของ Provider ไม่ครบ Provider นั้นจะถูกข้าม และระบบจะลอง Provider ถัดไป

Gemini adapter เรียก `generateContent` แบบ JSON structured response ส่วน OpenRouter adapter ใช้ Chat Completions พร้อม `response_format: json_schema`; ทั้งสองใช้ temperature 0 และตรวจผลซ้ำด้วย validator ฝั่ง server

`OPENROUTER_SITE_URL` และ `OPENROUTER_APP_NAME` เป็น metadata ส่วนกลางที่ไม่บังคับ ไม่ใช่ credential ของอาจารย์

## Migration

Migration เป็น additive และ idempotent ไม่แปลงข้อ `text` เดิมให้เป็น AI อัตโนมัติ

```bash
cd backend
npm run migrate:ai-grading
```

สิ่งที่ migration ทำ:

- backfill `gradingMode: "exact"` ให้คำถามเดิม
- backfill aggregate score fields ให้ attempt เดิมที่ไม่มีคำถาม AI
- สร้าง indexes ของ grading run/result/review
- สร้าง index สำหรับ credential แยกตามอาจารย์และ Provider
- backfill เจ้าของ credential ให้ grading result เดิม

MongoDB Atlas/replica set จะใช้ transaction ตอนเลือกผลและบันทึกการ review ส่วน local standalone MongoDB มี fallback แบบ non-transactional เพื่อให้พัฒนาในเครื่องได้

## API สำหรับอาจารย์

```text
GET    /api/grading/providers
GET    /api/grading/provider-settings
PUT    /api/grading/provider-settings/:provider/key
POST   /api/grading/provider-settings/:provider/refresh-models
PATCH  /api/grading/provider-settings/:provider/model
DELETE /api/grading/provider-settings/:provider/key
POST   /api/grading/grade
GET    /api/grading/:attemptId/questions/:questionId
POST   /api/grading/:attemptId/questions/:questionId/regrade
PATCH  /api/grading/:attemptId/questions/:questionId/review
GET    /api/grading/:attemptId/questions/:questionId/history
```

ทุก endpoint อ่าน role จากผู้ใช้ใน database หลังตรวจ JWT ไม่เชื่อ role จาก client และตรวจ ownership ของข้อสอบอีกชั้น นักศึกษาเรียก endpoint เหล่านี้ไม่ได้

`POST /api/grading/grade` รองรับทั้งการตรวจคำตอบที่บันทึกแล้ว และการทดลองตรวจจากหน้าสร้าง/แก้ไขข้อสอบ การทดลองตรวจยังบันทึก provider runs แต่ไม่มีข้อมูลชื่อ อีเมล หรือรหัสนักศึกษาใน prompt

## ทดสอบ fallback

วิธีอัตโนมัติ (ไม่เรียก API จริง):

```bash
cd backend
npm test
```

ชุดทดสอบครอบคลุม primary unavailable, timeout, retry, invalid JSON และ fallback สำเร็จ

วิธีทดสอบบน environment จริง:

1. ตั้ง OpenRouter key/model จากหน้า **ตั้งค่า AI Provider** ให้ใช้งานได้
2. ตั้ง `AI_PRIMARY_PROVIDER=gemini` และ `AI_FALLBACK_PROVIDERS=openrouter`
3. ลบ Gemini key ของบัญชีทดสอบชั่วคราว
4. ใช้ปุ่ม “ทดลองตรวจ” แล้วตรวจว่า metadata แสดง `provider: openrouter`
5. หากต้องการดู audit history ให้ส่งคำตอบอัตนัยจริงหรือกด regrade จากหน้าตรวจคำตอบ จากนั้นตรวจว่า History มี Gemini status `unavailable` ก่อน OpenRouter status `succeeded`

อย่าทดสอบด้วยการใส่ key จริงลง source code, frontend หรือ log

## Build และ test

```bash
cd backend
npm test

cd ../frontend
npm run build
```

โปรเจกต์นี้เป็น JavaScript/CommonJS + JSX จึงไม่มี TypeScript compiler step

## ข้อจำกัดของเวอร์ชันแรก

- Worker ทำงานใน process ของ backend และใช้ MongoDB lock สำหรับกันงานซ้ำ แต่ยังไม่มี external queue/dashboard
- Health check ก่อนเรียก Provider ตรวจความพร้อมของ key/model; ความพร้อมของ upstream จริงถูกตรวจจากคำขอ grading และเข้าสู่ retry/fallback
- การเปรียบเทียบคะแนนต่างกันมากเกิดเมื่อ regrade มีผลสำเร็จก่อนหน้า ระบบไม่ได้เรียก Provider สองรายพร้อมกันทุกคำตอบเพื่อหลีกเลี่ยงค่าใช้จ่ายซ้ำ
- Grading run เก็บ snapshot ของโจทย์/Rubric/คำตอบเพื่อ audit แต่ระบบเดิมยังอนุญาตให้แก้ชุดข้อสอบหลังเปิด session; ควรหลีกเลี่ยงการแก้คะแนนเต็มหรือโครงสร้างข้อสอบหลังมีผู้เข้าสอบ
- Raw response ปิดการบันทึกเป็นค่าเริ่มต้น หากเปิดใช้ต้องกำหนด retention/access policy เพิ่มตามนโยบายข้อมูลของหน่วยงาน
