# คู่มือและเอกสารอธิบายการทำงาน: ระบบตรวจข้อสอบอัตนัยด้วย AI (AI Subjective Exam Grading System)

เอกสารนี้อธิบายสถาปัตยกรรม, โครงสร้างข้อมูล, กระบวนการทำงาน (Workflow), ระบบความปลอดภัย, และการประเมินผลของ **ระบบตรวจข้อสอบอัตนัยด้วย AI** ซึ่งพัฒนาขึ้นเพื่อรองรับการตรวจข้อสอบข้อเขียน (Essay / Open-ended Questions) อย่างแม่นยำ โปร่งใส ปลอดภัย และมีอาจารย์เป็นผู้ควบคุมในขั้นตอนสุดท้าย (Human-in-the-loop)

---

## 📑 สารบัญ (Table of Contents)
1. [ภาพรวมของระบบ (System Overview)](#1-ภาพรวมของระบบ-system-overview)
2. [สถาปัตยกรรมและการไหลของข้อมูล (System Architecture & Data Flow)](#2-สถาปัตยกรรมและการไหลของข้อมูล-system-architecture--data-flow)
3. [กระบวนการตรวจและการคำนวณคะแนนด้วย AI (AI Grading Engine)](#3-กระบวนการตรวจและการคำนวณคะแนนด้วย-ai-ai-grading-engine)
4. [ระบบความปลอดภัยและการจัดการ API Key (Security & Key Management)](#4-ระบบความปลอดภัยและการจัดการ-api-key-security--key-management)
5. [ระบบห้องทดลองโมเดลและเปรียบเทียบ AI (Test AI Exam & Multi-Model Benchmarking)](#5-ระบบห้องทดลองโมเดลและเปรียบเทียบ-ai-test-ai-exam--multi-model-benchmarking)
6. [โครงสร้างฐานข้อมูล (Database Schema & Collections)](#6-โครงสร้างฐานข้อมูล-database-schema--collections)
7. [รายการ API Endpoints (API Reference)](#7-รายการ-api-endpoints-api-reference)
8. [การตั้งค่าและการทดสอบระบบ (Configuration & Testing)](#8-การตั้งค่าและการทดสอบระบบ-configuration--testing)

---

## 1. ภาพรวมของระบบ (System Overview)

ระบบตรวจข้อสอบอัตนัยถูกออกแบบมาเพื่อแก้ไขข้อจำกัดของการตรวจข้อสอบแบบเดิม โดยมีหลักการสำคัญดังนี้:

* **รองรับการทำงานร่วมกับระบบเดิม (Backward Compatibility)**: ข้อสอบปรนัย (Multiple Choice) และข้อสอบเติมคำตอบแบบตายตัวยังคงใช้ระบบตรวจแบบ `exact` match ตามเดิม ส่วนข้อสอบอัตนัยแบบบรรยายจะใช้โหมด `ai`
* **ประมวลผลเบื้องหลังแบบอะซิงโครนัส (Asynchronous Background Grading)**: เมื่อนักศึกษากดส่งข้อสอบ ระบบจะบันทึกคำตอบลงฐานข้อมูลและส่งสถานะตอบกลับทันที (Instant Submission) จากนั้น Background Worker จะดึงคำตอบไปให้ AI ตรวจ โดยนักศึกษาไม่ต้องรอ AI ประมวลผลหน้าจอ
* **Human-in-the-loop (อาจารย์มีอำนาจตัดสินใจสูงสุด)**: AI ทำหน้าที่เป็นผู้ช่วยตรวจ ให้คะแนนเบื้องต้น พร้อมระบุเหตุผลและอ้างอิงหลักฐาน แต่อาจารย์สามารถตรวจสอบ ยืนยัน หรือปรับแก้คะแนน (`teacherScore` / `finalScore`) ได้ตลอดเวลา โดยระบบจะไม่เขียนทับคะแนนเดิมของ AI (`aiScore`)
* **ตรวจสอบความโปร่งใสและตรวจสอบย้อนหลังได้ (Auditability)**: มีการบันทึก Log การเรียกโมเดลทุกรอบ (`gradingruns`) เก็บประวัติการปรับแก้คะแนนของอาจารย์ (`gradingreviewlogs`) และผลลัพธ์ที่สรุปแล้ว (`gradingresults`)

```mermaid
flowchart TD
    A[นักศึกษาส่งคำตอบ] --> B[บันทึกคำตอบลง Database ทันที]
    B --> C{ประเภทข้อสอบ?}
    C -->|ปรนัย / เติมคำ| D[Exact Match Grading]
    C -->|อัตนัย AI| E[สร้างงาน Pending Grading]
    E --> F[Background Worker]
    F --> G[AI Router: Gemini / OpenRouter]
    G --> H[Response Validator & Rules Engine]
    H --> I[บันทึกผล AI Score & Evidence]
    I --> J[อาจารย์ตรวจสอบ & ยืนยัน / ปรับคะแนน]
    J --> K[Final Score พร้อมประกาศผล]
```

---

## 2. สถาปัตยกรรมและการไหลของข้อมูล (System Architecture & Data Flow)

### 2.1 วงจรการทำงานของ Background Worker
1. **Enqueue Job**: เมื่อมีการ Submit ข้อสอบที่มีคำถาม AI ระบบจะบันทึกคำตอบและสร้างสถานะ `gradingStatus: 'grading'`
2. **Worker Lock**: Worker ดึงงานไปประมวลผลทีละคำถาม โดยมีระบบ Lock เพื่อป้องกันไม่ให้ Worker สองตัวตรวจงานเดียวกันซ้ำ
3. **Provider Execution**: AI Router ตรวจสอบความพร้อมของ API Key และ Model ของอาจารย์ผู้สร้างข้อสอบ แล้วส่ง Prompt ไปยัง AI Provider
4. **Validation**: ผลลัพธ์จาก AI จะถูกตรวจสอบโครงสร้าง JSON, ความถูกต้องของ Rubric Criteria, คะแนนรวม, และข้อความหลักฐาน
5. **Rules Engine Evaluation**: ตรวจสอบเงื่อนไขความเสี่ยง เช่น Confidence ต่ำ หรือได้คะแนนสูงแต่ไม่มีหลักฐาน เพื่อตั้ง Flag ให้ `needsReview: true`

### 2.2 ระบบ AI Router และ Fallback อัตโนมัติ
AI Router รองรับ Multi-Provider Architecture เพื่อป้องกันปัญหาระบบล่มเมื่อ Provider ใด Provider หนึ่งมีปัญหา:
* **Primary Provider**: กำหนด Provider หลัก (เช่น Google Gemini หรือ OpenRouter)
* **Automatic Retry**: หากเกิดข้อผิดพลาดชั่วคราว (Transient Error เช่น Network Timeout, Rate Limit 429) ระบบจะ Exponential Backoff Retry ตามจำนวนรอบที่กำหนด
* **Fallback Provider**: หาก Primary Provider ใช้งานไม่ได้ (เช่น Key ผิด, โควตาหมด, Server Down) ระบบจะสลับไปเรียก Fallback Provider อัตโนมัติโดยที่กระบวนการตรวจไม่สะดุด

```mermaid
sequenceDiagram
    participant W as Grading Worker
    participant R as AI Router
    participant P1 as Primary Provider (Gemini)
    participant P2 as Fallback Provider (OpenRouter)
    participant V as Grade Validator

    W->>R: ส่งคำตอบ + Rubric + Model Config
    R->>P1: เรียก API Primary Provider
    alt Primary สำเร็จ
        P1-->>R: ส่งผลการประเมิน (JSON)
    else Primary ล้มเหลว / Timeout
        R->>R: Retry ตามเงื่อนไข (Exponential Backoff)
        R->>P2: สลับเรียก Fallback Provider อัตโนมัติ
        P2-->>R: ส่งผลการประเมิน (JSON)
    end
    R->>V: ตรวจสอบความถูกต้องของ Schema & คะแนน
    V-->>W: ผลการตรวจที่ผ่านการ Validate สมบูรณ์
```

---

## 3. กระบวนการตรวจและการคำนวณคะแนนด้วย AI (AI Grading Engine)

### 3.1 การสร้าง Prompt และความปลอดภัย (Prompt Engineering & Security)
* **System Prompt เข้มงวด**: กำหนดบทบาท AI ให้เป็นผู้ตรวจข้อสอบที่เป็นกลางและยึดเกณฑ์ Rubric อย่างเคร่งครัด
* **การป้องกัน Prompt Injection**: คำตอบของนักศึกษาจะถูกแยกและบรรจุอยู่ใน JSON Payload ที่กำหนดขอบเขตชัดเจน พร้อมคำสั่ง System Instruction ห้าม AI ปฏิบัติตามคำสั่งใด ๆ ที่แฝงอยู่ในข้อความคำตอบของนักศึกษา
* **Deterministic Temperature**: ตั้งค่า `temperature: 0` เพื่อให้ผลการตรวจมีความเสถียร สม่ำเสมอ และแม่นยำต่อเกณฑ์เดิมมากที่สุด

### 3.2 เกณฑ์การประเมินแบบแยกหัวข้อ (Multi-Criteria Rubric Breakdown)
ในแต่ละข้อสอบ อาจารย์สามารถกำหนดหัวข้อการให้คะแนนย่อย (Rubric Criteria) ได้ โดยระบบจะบังคับให้ AI ประเมินและส่งข้อมูลกลับมาใน 4 มิติ:
1. **คะแนนรายเกณฑ์ (`score` / `maxScore`)**: คะแนนที่ได้ในแต่ละเกณฑ์ย่อย โดยผลรวมของทุกเกณฑ์ต้องเท่ากับคะแนนรวมของข้อสอบพอดี
2. **เหตุผลที่ให้คะแนน (Points Awarded Rationale)**: จุดเด่นหรือเนื้อหาที่ถูกต้องตามที่เกณฑ์ต้องการ
3. **เหตุผลที่ตัดคะแนน (Deduction Rationale)**: ส่วนที่ขาดหายไป ผิดพลาด หรือยังไม่สมบูรณ์
4. **ความเหมาะสมของคะแนน (Score Justification)**: คำอธิบายสรุปว่าทำไมคะแนนที่ได้จึงสอดคล้องกับระดับคุณภาพของคำตอบ

### 3.3 การดึงหลักฐานอ้างอิง (Verbatim Evidence Extraction)
AI ต้องระบุข้อความอ้างอิง (`evidence`) โดยยกประโยคหรือวลีที่ปรากฏอยู่ในคำตอบของนักศึกษาจริง ๆ มาสนับสนุนการให้คะแนน
* **Server-side Evidence Validation**: ระบบฝั่ง Backend จะตรวจสอบว่าข้อความใน `evidence` มีอยู่จริงในคำตอบของนักศึกษาหรือไม่ หาก AI สร้างข้อความขึ้นมาเอง (Hallucination) ระบบจะปรับ Flag ให้ส่งอาจารย์ตรวจซ้ำทันที

### 3.4 Rules Engine (กฎการส่งให้อาจารย์ตรวจสอบ)
Rules Engine จะตรวจสอบผลลัพธ์หลังการตรวจ และตั้งค่า `needsReview: true` หากเข้าเงื่อนไขข้อใดข้อหนึ่งต่อไปนี้:
* `confidence < AI_REVIEW_CONFIDENCE_THRESHOLD` (เช่น ความมั่นใจของโมเดลต่ำกว่า 70%)
* ได้คะแนนสูงเกิน 70% ของคะแนนเต็ม แต่ไม่มีการอ้างอิงหลักฐาน (`evidence`)
* มีการตรวจซ้ำ (Regrade) แล้วคะแนนใหม่ต่างจากคะแนนเดิมเกินเกณฑ์ (`AI_SCORE_DISAGREEMENT_THRESHOLD`)
* มีข้อผิดพลาดในระดับ Provider หรือการตรวจถูกระงับ

---

## 4. ระบบความปลอดภัยและการจัดการ API Key (Security & Key Management)

### 4.1 รูปแบบ Bring-Your-Own-Key (BYOK)
* อาจารย์แต่ละท่านสามารถระบุ API Key ของตนเองได้ (รองรับ **Google Gemini API** และ **OpenRouter API**)
* API Key จะถูกใช้เฉพาะในการตรวจข้อสอบที่อาจารย์ท่านนั้นเป็นเจ้าของ
* แยกสิทธิ์และข้อมูลชัดเจนระหว่างอาจารย์แต่ละท่าน (Multi-Tenant Isolation)

### 4.2 การเข้ารหัสระดับฐานข้อมูล (AES-256-GCM Encryption)
* API Key ทุกอันจะถูกเข้ารหัสด้วยอัลกอริทึม **AES-256-GCM** ก่อนบันทึกลง MongoDB Collection `teacheraicredentials`
* ใช้ Secret Key (`AI_CREDENTIALS_ENCRYPTION_KEY`) จาก Server Environment
* API Key จะไม่ถูกส่งกลับไปยังฝั่ง Frontend (Browser) เด็ดขาด โดยหน้าเว็บจะเห็นเฉพาะสถานะความพร้อมและรายการ Model Catalog ที่ดึงมาได้เท่านั้น

---

## 5. ระบบห้องทดลองโมเดลและเปรียบเทียบ AI (Test AI Exam & Multi-Model Benchmarking)

เพื่อให้อาจารย์สามารถเปรียบเทียบประสิทธิภาพ ความเร็ว และความแม่นยำของ AI แต่ละค่ายก่อนนำไปใช้ในการสอบจริง ระบบได้จัดเตรียม **ห้องทดลองข้อสอบ AI (`/teacher/test-ai-exam`)** ซึ่งมีฟังก์ชันครบวงจร:

```mermaid
graph LR
    A[สร้าง/บันทึกชุดข้อสอบทดสอบ] --> B[เปิด Live Session กำหนดเวลา & เลือกโมเดล AI]
    B --> C[นักเรียนสแกน QR Code / PIN เข้าสอบ]
    C --> D[นักเรียนส่งคำตอบ & AI หลายโมเดลตรวจพร้อมกัน]
    D --> E[หน้ารายงานผลลัพธ์ & วิเคราะห์เปรียบเทียบ]
    E --> F[เจาะลึกวิธีคิดรายโมเดล & Export Excel]
```

### 5.1 ฟังก์ชันสำคัญในห้องทดลอง
1. **Exam Builder & Presets**: สร้างข้อสอบจำลอง หรือโหลดข้อสอบตัวอย่างแบบ 1-Click (เช่น ชีววิทยา, วิทยาการคอมพิวเตอร์)
2. **Multi-Model Benchmark Selection**: เลือกโมเดลที่ต้องการนำมาเปรียบเทียบได้หลายตัวพร้อมกันจาก Dropdown ที่ดึงสดจาก API (เช่น `Gemini 1.5 Flash`, `Gemini 1.5 Pro`, `DeepSeek V3`, `Claude 3.5 Sonnet`, `GPT-4o`)
3. **Live Session & Auto-Close**:
   * มีรหัส PIN 6 หลัก, ลิงก์ตรง, และ QR Code ให้นักเรียนสแกนเข้าสอบ
   * ตั้งเวลานับถอยหลังปิดห้องสอบอัตโนมัติ (`autoStopAt`)
4. **Dedicated Session Results Page (`/teacher/test-ai-exam/sessions/:sessionId`)**:
   * **Model KPI Cards**: เปรียบเทียบคะแนนเฉลี่ย, ความเร็วในการตอบสนอง (Latency ms), ความแม่นยำของหลักฐาน (Evidence Quote %), พร้อมระบบติดเหรียญรางวัล (เร็วที่สุด, คะแนนสูงสุด, คุณภาพดีเด่น)
   * **Dual-View Student List**: ตารางแสดงผลลัพธ์รายบุคคลที่รองรับ Responsive ทั้งจอคอมพิวเตอร์และจอมือถือ
   * **Deep-Dive Reasoning Modal**: หน้าต่างตรวจเจาะลึก แสดงคำตอบนักเรียน, แท็บสลับดูรายโมเดล, รายละเอียดการให้/ตัดคะแนนตามเกณฑ์ Rubric จริง, และข้อความหลักฐานที่ตรวจพบ
   * **Excel Export**: ส่งออกผลการเปรียบเทียบทุกโมเดลออกมาเป็นไฟล์ `.xlsx` ได้ทันที

---

## 6. โครงสร้างฐานข้อมูล (Database Schema & Collections)

```mermaid
erDiagram
    TEACHER_CREDENTIALS ||--o{ TEST_EXAMS : owns
    TEST_EXAMS ||--o{ TEST_EXAM_SESSIONS : launches
    TEST_EXAM_SESSIONS ||--o{ TEST_EXAM_ATTEMPTS : contains
    EXAM_ATTEMPTS ||--o{ GRADING_RESULTS : has
    EXAM_ATTEMPTS ||--o{ GRADING_RUNS : logs
    GRADING_RESULTS ||--o{ GRADING_REVIEW_LOGS : audits
```

### 6.1 Collections หลักสำหรับระบบตรวจ AI

| Collection Name | หน้าที่และการเก็บข้อมูล |
| :--- | :--- |
| `teacheraicredentials` | เก็บ API Key ที่เข้ารหัส (AES-256-GCM), Provider, และ Default Model ของอาจารย์แต่ละคน |
| `testexams` | ชุดข้อสอบสำหรับห้องทดลอง AI พร้อม Rubric Criteria, คำตอบตัวอย่าง, และโมเดลตั้งต้น |
| `testexamsessions` | Session ห้องสอบจำลอง เก็บสถานะเปิด/ปิด, PIN 6 หลัก, เวลาหมดอายุ (`autoStopAt`), และโมเดลที่เปรียบเทียบ |
| `testexamattempts` | การส่งคำตอบของนักเรียนในห้องทดลอง พร้อมผลการประเมินแยกตามรายโมเดล (`modelEvaluations`) |
| `gradingruns` | บันทึกประวัติการเรียก AI ทุกครั้ง (Attempt, Latency, Token Usage, Cost, Raw JSON, Status) |
| `gradingresults` | ผลการตรวจล่าสุดของข้อสอบจริง (`aiScore`, `teacherScore`, `finalScore`, `feedback`, `criteria`) |
| `gradingreviewlogs` | บันทึก Audit Log ทุกครั้งที่อาจารย์ยืนยัน ปรับคะแนน หรือสั่ง Regrade ข้อสอบ |

---

## 7. รายการ API Endpoints (API Reference)

### 7.1 การจัดการ Provider & Credentials (`/api/grading/...`)
* `GET /api/grading/providers` - ดูรายชื่อ Provider ที่ระบบรองรับ
* `GET /api/grading/provider-settings` - ดูการตั้งค่า Key และ Model ปัจจุบันของอาจารย์
* `PUT /api/grading/provider-settings/:provider/key` - บันทึกและตรวจสอบ API Key ใหม่
* `POST /api/grading/provider-settings/:provider/refresh-models` - ดึงรายชื่อ Model Catalog ล่าสุดจาก API
* `PATCH /api/grading/provider-settings/:provider/model` - เปลี่ยน Model เริ่มต้นของ Provider
* `DELETE /api/grading/provider-settings/:provider/key` - ลบ API Key

### 7.2 การตรวจข้อสอบจริง (`/api/grading/...`)
* `POST /api/grading/grade` - สั่งตรวจคำตอบข้อสอบอัตนัย (รองรับทั้งคำตอบจริงและทดลองตรวจ)
* `GET /api/grading/:attemptId/questions/:questionId` - ดูผลการตรวจ AI และเกณฑ์ Rubric ของคำตอบนั้น
* `POST /api/grading/:attemptId/questions/:questionId/regrade` - สั่ง AI ตรวจคำตอบใหม่อีกครั้ง
* `PATCH /api/grading/:attemptId/questions/:questionId/review` - อาจารย์บันทึกยืนยัน หรือปรับแก้คะแนน
* `GET /api/grading/:attemptId/questions/:questionId/history` - ดูประวัติการเรียก AI และประวัติการปรับคะแนนทั้งหมด

### 7.3 ระบบห้องทดลองข้อสอบจำลอง (`/api/grading/...`)
* `GET /api/grading/test-exams` - ดูรายการชุดข้อสอบทดลองทั้งหมดของอาจารย์
* `POST /api/grading/test-exams` - สร้างชุดข้อสอบทดลองใหม่
* `GET /api/grading/test-exams/:testExamId` - ดึงรายละเอียดชุดข้อสอบทดลอง
* `PUT /api/grading/test-exams/:testExamId` - แก้ไขชุดข้อสอบทดลอง
* `DELETE /api/grading/test-exams/:testExamId` - ลบชุดข้อสอบทดลอง
* `POST /api/grading/test-exams/:testExamId/sessions` - เปิด Session ห้องสอบสดจากชุดข้อสอบ
* `GET /api/grading/test-sessions` - ดูประวัติ Session การสอบทั้งหมดของอาจารย์
* `GET /api/grading/test-sessions/:sessionId/results` - ดูผลลัพธ์เปรียบเทียบ AI และผลสอบนักเรียนทั้งหมดใน Session
* `PATCH /api/grading/test-sessions/:sessionId/end` - ปิดหรือเปิดห้องสอบจำลอง
* `DELETE /api/grading/test-sessions/:sessionId` - ลบ Session และข้อมูลการส่งคำตอบทั้งหมด

### 7.4 ฝั่งนักเรียนเข้าสอบจำลอง (`/api/grading/...`)
* `GET /api/grading/test-sessions/:sessionId/public` - ดึงข้อมูลโจทย์และสถานะห้องสอบเพื่อเริ่มทำข้อสอบ
* `POST /api/grading/test-sessions/:sessionId/submit` - ส่งคำตอบข้อสอบจำลอง (ตอบกลับทันทีพร้อม `attemptId`)
* `GET /api/grading/test-sessions/:sessionId/attempts/:attemptId` - นักเรียน Poll ตรวจสอบสถานะการตรวจจนกว่าจะเสร็จ

---

## 8. การตั้งค่าและการทดสอบระบบ (Configuration & Testing)

### 8.1 การตั้งค่า Environment Variables (`backend/.env`)
```env
# Provider Configuration
AI_PRIMARY_PROVIDER=gemini
AI_FALLBACK_PROVIDERS=openrouter

# Security & Encryption (ต้องมีความยาวอย่างน้อย 32 ตัวอักษร)
AI_CREDENTIALS_ENCRYPTION_KEY=your-strong-secret-encryption-key-32-chars-min

# Timeout & Retries
AI_TIMEOUT_MS=30000
AI_MAX_RETRIES=2
AI_RETRY_BASE_DELAY_MS=250

# Rules Engine Thresholds
AI_REVIEW_CONFIDENCE_THRESHOLD=0.70
AI_SCORE_DISAGREEMENT_THRESHOLD=2
AI_HIGH_SCORE_WITHOUT_EVIDENCE_RATIO=0.70
AI_MAX_ANSWER_CHARS=12000
AI_MAX_REGRADES_PER_ANSWER=5
AI_STORE_RAW_RESPONSES=false
```

### 8.2 การรัน Automated Unit Tests
ระบบมี Automated Test Suite ครอบคลุมทั้ง Router, Fallback, Validation, Prompt Builder, และ Rule Engine:
```bash
cd backend
npm test
```

### 8.3 การทดสอบระบบฝั่ง Frontend Build
```bash
cd frontend
npm run build
```
