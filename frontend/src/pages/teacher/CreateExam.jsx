import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../config/api';
import { Plus, Trash2, GripVertical, Save, X, CheckCircle, Copy, Download, Upload } from 'lucide-react';
import RichTextEditor from '../../components/RichTextEditor';

// --- CSV Template & Parser ---
const CSV_TEMPLATE_HEADER = 'QuestionType,Prompt,Option1,Option2,Option3,Option4,CorrectAnswer,Points';
const CSV_TEMPLATE_EXAMPLE = 'ปรนัย,เมืองหลวงของไทยคือ?,เชียงใหม่,กรุงเทพ,ภูเก็ต,ขอนแก่น,2,1';

function downloadCSVTemplate() {
    const bom = '\uFEFF'; // UTF-8 BOM for Excel compat
    const content = bom + CSV_TEMPLATE_HEADER + '\n' + CSV_TEMPLATE_EXAMPLE + '\n';
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exam_template.csv';
    a.click();
    URL.revokeObjectURL(url);
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    result.push(current.trim());
    return result;
}

function parseCSVToQuestions(csvText) {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) throw new Error('ไฟล์ CSV ต้องมีอย่างน้อย 1 แถวข้อมูล (ไม่รวม header)');

    // Skip header row
    const dataLines = lines.slice(1);
    const questions = [];

    for (let i = 0; i < dataLines.length; i++) {
        const cols = parseCSVLine(dataLines[i]);
        if (cols.length < 3) continue; // skip invalid rows

        const [rawType, prompt, opt1, opt2, opt3, opt4, rawCorrect, rawPoints] = cols;
        const type = rawType?.trim();
        const isText = type === 'อัตนัย' || type?.toLowerCase() === 'text';

        if (isText) {
            questions.push({
                type: 'text',
                prompt: prompt || '',
                choices: [],
                correctAnswer: rawCorrect || '',
                points: Number(rawPoints) || 1,
            });
        } else {
            // Multiple-choice (ปรนัย / radio)
            const options = [opt1, opt2, opt3, opt4].filter(o => o && o.trim());
            const choices = options.map((label, idx) => ({
                value: String.fromCharCode(97 + idx), // a, b, c, d
                label: label.trim(),
            }));
            // CorrectAnswer: accept number (1-based) or letter (a,b,c,d)
            let correctAnswer = '';
            const ca = rawCorrect?.trim();
            if (ca) {
                const num = parseInt(ca, 10);
                if (!isNaN(num) && num >= 1 && num <= choices.length) {
                    correctAnswer = String.fromCharCode(97 + num - 1);
                } else if (/^[a-d]$/i.test(ca)) {
                    correctAnswer = ca.toLowerCase();
                }
            }
            questions.push({
                type: 'radio',
                prompt: prompt || '',
                choices,
                correctAnswer,
                points: Number(rawPoints) || 1,
            });
        }
    }

    if (questions.length === 0) throw new Error('ไม่พบข้อมูลข้อสอบที่ถูกต้องในไฟล์ CSV');
    return questions;
}

const CreateExam = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Check for imported questions from AI Generator
    const importedQuestions = location.state?.importedQuestions;

    const csvFileRef = useRef(null);
    const [title, setTitle] = useState('');
    const [durationMin, setDurationMin] = useState(30);
    const [category, setCategory] = useState('ทั่วไป');
    const [existingCategories, setExistingCategories] = useState([]);
    const [questions, setQuestions] = useState(
        importedQuestions && importedQuestions.length > 0
            ? importedQuestions
            : [
                {
                    type: 'radio',
                    prompt: '',
                    choices: [
                        { value: 'a', label: '' },
                        { value: 'b', label: '' },
                    ],
                    correctAnswer: '',
                    points: 1,
                },
            ]
    );

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                const config = {
                    headers: {
                        Authorization: `Bearer ${user.token}`,
                    },
                };
                const { data } = await api.get('/exams/categories', config);
                const uniqueCats = Array.from(new Set([...data, 'ทั่วไป']));
                setExistingCategories(uniqueCats);
            } catch (err) {
                console.error('Failed to fetch categories:', err);
                setExistingCategories(['ทั่วไป']);
            }
        };
        fetchCategories();
    }, []);

    const handleCSVUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError('');
        setSuccess('');
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const parsed = parseCSVToQuestions(evt.target.result);
                setQuestions(parsed);
                setSuccess(`นำเข้า ${parsed.length} ข้อสำเร็จจากไฟล์ CSV`);
            } catch (err) {
                setError(err.message);
            }
        };
        reader.readAsText(file, 'UTF-8');
        e.target.value = ''; // reset so same file can be re-uploaded
    };

    const addQuestion = () => {
        setQuestions([
            ...questions,
            {
                type: 'radio',
                prompt: '',
                choices: [
                    { value: 'a', label: '' },
                    { value: 'b', label: '' },
                ],
                correctAnswer: '',
                points: 1,
            },
        ]);
    };

    const removeQuestion = (qIndex) => {
        if (questions.length <= 1) return;
        setQuestions(questions.filter((_, i) => i !== qIndex));
    };

    const duplicateQuestion = (qIndex) => {
        const original = questions[qIndex];
        const copy = {
            ...original,
            choices: original.choices.map(c => ({ ...c })),
        };
        const updated = [...questions];
        updated.splice(qIndex + 1, 0, copy);
        setQuestions(updated);
    };

    const updateQuestion = (qIndex, field, value) => {
        const updated = [...questions];
        updated[qIndex] = { ...updated[qIndex], [field]: value };
        setQuestions(updated);
    };

    const selectCorrectAnswer = (qIndex, value) => {
        const updated = [...questions];
        updated[qIndex] = { ...updated[qIndex], correctAnswer: value };
        setQuestions(updated);
    };

    const addChoice = (qIndex) => {
        const updated = [...questions];
        const nextValue = String.fromCharCode(97 + updated[qIndex].choices.length);
        updated[qIndex].choices = [
            ...updated[qIndex].choices,
            { value: nextValue, label: '' },
        ];
        setQuestions(updated);
    };

    const removeChoice = (qIndex, cIndex) => {
        const updated = [...questions];
        if (updated[qIndex].choices.length <= 2) return;
        updated[qIndex].choices = updated[qIndex].choices.filter((_, i) => i !== cIndex);
        updated[qIndex].choices = updated[qIndex].choices.map((c, i) => ({
            ...c,
            value: String.fromCharCode(97 + i),
        }));
        const validValues = updated[qIndex].choices.map(c => c.value);
        if (!validValues.includes(updated[qIndex].correctAnswer)) {
            updated[qIndex].correctAnswer = '';
        }
        setQuestions(updated);
    };

    const updateChoiceLabel = (qIndex, cIndex, label) => {
        const updated = [...questions];
        updated[qIndex].choices = updated[qIndex].choices.map((c, i) =>
            i === cIndex ? { ...c, label } : c
        );
        setQuestions(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!title.trim()) {
            setError('กรุณาใส่ชื่อข้อสอบ');
            return;
        }

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.prompt.trim()) {
                setError(`กรุณาใส่คำถามข้อที่ ${i + 1}`);
                return;
            }
            for (let j = 0; j < q.choices.length; j++) {
                if (!q.choices[j].label.trim()) {
                    setError(`กรุณาใส่ตัวเลือกข้อ ${i + 1} ตัวเลือกที่ ${j + 1}`);
                    return;
                }
            }
            if (!q.correctAnswer) {
                setError(`กรุณาเลือกคำตอบที่ถูกต้องของข้อ ${i + 1}`);
                return;
            }
        }

        setLoading(true);

        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            };

            await api.post('/exams', { title, durationMin, questions, category }, config);
            setSuccess('สร้างข้อสอบสำเร็จ!');
            setTimeout(() => navigate('/teacher/exams'), 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการสร้างข้อสอบ');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">สร้างข้อสอบใหม่</h1>
                <p className="text-gray-500 mt-1">กรอกรายละเอียดข้อสอบและเพิ่มคำถาม</p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600 text-sm">{error}</p>
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-600 text-sm">{success}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Exam Info */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">ข้อมูลข้อสอบ</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อข้อสอบ</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="เช่น Midterm Quiz - Network Basics"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">เวลาสอบ (นาที)</label>
                            <input
                                type="number"
                                min="1"
                                value={durationMin}
                                onChange={(e) => setDurationMin(Number(e.target.value))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่ข้อสอบ</label>
                            <input
                                type="text"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                placeholder="เช่น 225xxx"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                            />
                            {/* Suggested Categories */}
                            <div className="flex flex-wrap gap-1.5 items-center mt-1.5">
                                <span className="text-[10px] text-gray-400 font-medium">หมวดหมู่แนะนำ:</span>
                                {existingCategories.slice(0, 5).map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setCategory(cat)}
                                        className={`px-2 py-0.5 text-[10px] rounded-full border transition ${
                                            category === cat
                                                ? 'bg-indigo-50 text-indigo-600 border-indigo-200 font-semibold'
                                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* CSV Import Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">นำเข้าข้อสอบจาก CSV</h2>
                            <p className="text-sm text-gray-500 mt-0.5">ดาวน์โหลดเทมเพลต → กรอกข้อสอบ → อัปโหลด</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={downloadCSVTemplate}
                                className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition flex items-center gap-1.5"
                            >
                                <Download size={16} /> ดาวน์โหลดเทมเพลต
                            </button>
                            <input
                                type="file"
                                ref={csvFileRef}
                                accept=".csv"
                                onChange={handleCSVUpload}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => csvFileRef.current?.click()}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition flex items-center gap-1.5"
                            >
                                <Upload size={16} /> อัปโหลด CSV
                            </button>
                        </div>
                    </div>
                </div>

                {/* Questions */}
                <div className="space-y-4">
                    {questions.map((q, qIndex) => (
                        <div key={qIndex} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2 text-gray-400">
                                    <GripVertical size={18} />
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        ข้อที่ {qIndex + 1}
                                    </h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                        <label className="text-xs text-gray-500">คะแนน:</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={q.points}
                                            onChange={(e) => updateQuestion(qIndex, 'points', Number(e.target.value))}
                                            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => duplicateQuestion(qIndex)}
                                        className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                        title="คัดลอกข้อนี้"
                                    >
                                        <Copy size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeQuestion(qIndex)}
                                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                        title="ลบคำถาม"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Prompt */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">คำถาม</label>
                                <RichTextEditor
                                    content={q.prompt}
                                    onChange={(html) => updateQuestion(qIndex, 'prompt', html)}
                                    placeholder="พิมพ์คำถามที่นี่..."
                                />
                            </div>

                            {/* Choices - clickable cards */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    ตัวเลือก <span className="text-gray-400 font-normal">(คลิกเพื่อเลือกคำตอบที่ถูกต้อง)</span>
                                </label>
                                {q.choices.map((choice, cIndex) => (
                                    <div
                                        key={cIndex}
                                        className={`flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer transition-all ${q.correctAnswer === choice.value
                                            ? 'border-green-500 bg-green-50'
                                            : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                                            }`}
                                        onClick={() => selectCorrectAnswer(qIndex, choice.value)}
                                    >
                                        {/* Correct answer indicator */}
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${q.correctAnswer === choice.value
                                            ? 'bg-green-500 text-white'
                                            : 'bg-gray-200 text-gray-500'
                                            }`}>
                                            {q.correctAnswer === choice.value ? (
                                                <CheckCircle size={16} />
                                            ) : (
                                                <span className="text-xs font-bold">{choice.value.toUpperCase()}</span>
                                            )}
                                        </div>

                                        <input
                                            type="text"
                                            value={choice.label}
                                            onChange={(e) => updateChoiceLabel(qIndex, cIndex, e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            placeholder={`ตัวเลือก ${choice.value.toUpperCase()}`}
                                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm bg-white"
                                        />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeChoice(qIndex, cIndex);
                                            }}
                                            className="p-1 text-gray-400 hover:text-red-500 transition flex-shrink-0"
                                            title="ลบตัวเลือก"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => addChoice(qIndex)}
                                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 mt-1"
                                >
                                    <Plus size={14} /> เพิ่มตัวเลือก
                                </button>
                            </div>

                            {q.correctAnswer && (
                                <p className="text-xs text-green-600 font-medium">
                                    ✓ คำตอบที่ถูกต้อง: ตัวเลือก {q.correctAnswer.toUpperCase()}
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                {/* Add Question Button */}
                <button
                    type="button"
                    onClick={addQuestion}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition flex items-center justify-center gap-2 font-medium"
                >
                    <Plus size={20} /> เพิ่มคำถาม
                </button>

                {/* Submit */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 sm:flex-none px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save size={18} />
                        {loading ? 'กำลังบันทึก...' : 'บันทึกข้อสอบ'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/teacher/exams')}
                        className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                    >
                        ยกเลิก
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateExam;
