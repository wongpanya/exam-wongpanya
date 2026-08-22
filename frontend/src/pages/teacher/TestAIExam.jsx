import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../config/api';
import {
    FlaskConical,
    Sparkles,
    Plus,
    Trash2,
    Copy,
    Download,
    Upload,
    Play,
    CheckCircle2,
    AlertCircle,
    Clock,
    Zap,
    Scale,
    Trophy,
    ArrowRight,
    RotateCcw,
    Layers,
    FileSpreadsheet,
    Eye,
    ChevronRight,
    HelpCircle,
    Check,
    X,
    ExternalLink
} from 'lucide-react';
import RichTextEditor from '../../components/RichTextEditor';
import AIGradingConfig from '../../components/AIGradingConfig';

const PRESET_EXAMS = [
    {
        title: 'ทดสอบ AI: วิทยาศาสตร์ (การสังเคราะห์ด้วยแสง)',
        description: 'โจทย์อัตนัยอธิบายกระบวนการสังเคราะห์ด้วยแสง พร้อม Rubric 2 เกณฑ์',
        questions: [
            {
                questionId: 'preset-q1',
                type: 'text',
                prompt: '<p>จงอธิบายกระบวนการสังเคราะห์ด้วยแสงของพืชโดยสังเขป พร้อมระบุสารตั้งต้นและผลผลิตที่ได้</p>',
                points: 5,
                gradingMode: 'ai',
                aiGrading: {
                    groundTruths: [
                        'พืชใช้พลังงานแสงอาทิตย์ร่วมกับน้ำและก๊าซคาร์บอนไดออกไซด์ผ่านคลอโรฟิลล์เพื่อเปลี่ยนเป็นน้ำตาลกลูโคสและก๊าซออกซิเจน',
                        'การสังเคราะห์ด้วยแสงเป็นกระบวนการสร้างอาหารของพืช โดยใช้แสง คลอโรฟิลล์ น้ำ และ CO2 ได้ผลผลิตเป็นน้ำตาลและ O2'
                    ],
                    rubricCriteria: [
                        { rubricId: 'r1', title: 'สารตั้งต้นและพลังงาน', description: 'ระบุพลังงานแสง คลอโรฟิลล์ น้ำ และคาร์บอนไดออกไซด์', maxScore: 3 },
                        { rubricId: 'r2', title: 'ผลผลิตของกระบวนการ', description: 'ระบุน้ำตาลกลูโคสและก๊าซออกซิเจน', maxScore: 2 }
                    ],
                    keyConcepts: ['พลังงานแสง', 'คลอโรฟิลล์', 'น้ำ', 'คาร์บอนไดออกไซด์', 'น้ำตาลกลูโคส', 'ออกซิเจน'],
                    language: 'th',
                    providerPreference: 'system',
                    modelPreference: ''
                },
                sampleAnswers: {
                    excellent: 'พืชใช้คลอโรฟิลล์ดูดกลืนพลังงานแสงอาทิตย์ และนำน้ำ (H2O) จากดินกับก๊าซคาร์บอนไดออกไซด์ (CO2) จากอากาศมาทำปฏิกิริยาเคมี ได้ผลผลิตเป็นน้ำตาลกลูโคสสำหรับเป็นพลังงานของพืช และปล่อยก๊าซออกซิเจน (O2) ออกสู่อากาศ',
                    average: 'พืชใช้แสงแดดกับน้ำมารวมกันแล้วสร้างเป็นน้ำตาลเพื่อเป็นอาหาร และได้ออกซิเจนออกมา',
                    poor: 'พืชดูดน้ำจากรากแล้วโตขึ้นในเวลากลางวันเพราะมีแดดส่อง'
                }
            }
        ]
    },
    {
        title: 'ทดสอบ AI: วิทยาการคอมพิวเตอร์ (Deep Learning vs ML)',
        description: 'โจทย์อัตนัยเปรียบเทียบ Deep Learning และ Machine Learning พร้อม Rubric 4 เกณฑ์',
        questions: [
            {
                questionId: 'preset-q2',
                type: 'text',
                prompt: '<p>จงอธิบายความสัมพันธ์และความแตกต่างระหว่าง <strong>Machine Learning (ML)</strong> และ <strong>Deep Learning (DL)</strong></p>',
                points: 10,
                gradingMode: 'ai',
                aiGrading: {
                    groundTruths: [
                        'Machine Learning เป็นสาขาหนึ่งของ AI ที่เรียนรู้จากข้อมูล ส่วน Deep Learning เป็นซับเซตของ ML ที่ใช้โครงข่ายประสาทเทียมหลายชั้น (Deep Neural Networks) โดย DL สามารถทำ Feature Learning ได้เองอัตโนมัติ ขณะที่ ML ทั่วไปต้องทำ Feature Engineering',
                        'Deep Learning เป็นส่วนหนึ่งของ Machine Learning ซึ่งเน้นการใช้ Neural Network ขนาดใหญ่ เหมาะกับข้อมูล unstructured ขนาดใหญ่ เช่น ภาพและเสียง'
                    ],
                    rubricCriteria: [
                        { rubricId: 'r1', title: 'ความสัมพันธ์เชิงโครงสร้าง', description: 'อธิบายว่า DL เป็นซับเซตของ ML และ ML เป็นส่วนหนึ่งของ AI', maxScore: 3 },
                        { rubricId: 'r2', title: 'สถาปัตยกรรมโมเดล', description: 'กล่าวถึงการใช้โครงข่ายประสาทเทียมหลายชั้น (Deep Neural Networks)', maxScore: 3 },
                        { rubricId: 'r3', title: 'Feature Engineering vs Feature Learning', description: 'เปรียบเทียบการสกัด Feature อัตโนมัติใน DL กับการทำ Manual ใน ML', maxScore: 2 },
                        { rubricId: 'r4', title: 'การประยุกต์ใช้งานและทรัพยากร', description: 'ยกตัวอย่างการใช้งาน เช่น Computer Vision หรือข้อมูลขนาดใหญ่', maxScore: 2 }
                    ],
                    keyConcepts: ['Machine Learning', 'Deep Learning', 'Neural Network', 'Feature Engineering', 'Feature Learning', 'Computer Vision'],
                    language: 'th',
                    providerPreference: 'system',
                    modelPreference: ''
                },
                sampleAnswers: {
                    excellent: 'Deep Learning (DL) เป็นสาขาย่อยหนึ่งของ Machine Learning (ML) และ ML ก็เป็นส่วนหนึ่งของ AI โดยจุดเด่นของ DL คือใช้โครงข่ายประสาทเทียมหลายชั้น (Deep Neural Networks) และสามารถทำการเรียนรู้ Feature จากข้อมูลดิบได้เองอัตโนมัติ (Feature Learning) ต่างจาก ML ทั่วไปที่ต้องอาศัยผู้เชี่ยวชาญทำ Feature Engineering โดย DL มักต้องการข้อมูลขนาดใหญ่และการประมวลผลสูง เหมาะกับงาน Computer Vision และ NLP',
                    average: 'Deep Learning เป็นส่วนหนึ่งของ Machine Learning โดย Deep Learning จะฉลาดกว่าและใช้โครงข่ายสมองเทียมในการคิดและวิเคราะห์ข้อมูลจำนวนมาก',
                    poor: 'Machine Learning คือคอมพิวเตอร์ ส่วน Deep Learning คือหุ่นยนต์ที่ฉลาดมากๆ'
                }
            }
        ]
    }
];

const DEFAULT_MODELS_POOL = [
    { provider: 'gemini', model: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', tag: 'Fast & Cheap', badgeColor: 'bg-blue-100 text-blue-800' },
    { provider: 'gemini', model: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', tag: 'High Reasoning', badgeColor: 'bg-purple-100 text-purple-800' },
    { provider: 'gemini', model: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', tag: 'Balanced', badgeColor: 'bg-cyan-100 text-cyan-800' },
    { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', tag: 'Top Quality', badgeColor: 'bg-orange-100 text-orange-800' },
    { provider: 'openrouter', model: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', tag: 'Efficient', badgeColor: 'bg-emerald-100 text-emerald-800' },
    { provider: 'openrouter', model: 'deepseek/deepseek-chat', label: 'DeepSeek Chat', tag: 'Cost Effective', badgeColor: 'bg-indigo-100 text-indigo-800' },
];

const createDefaultAiGrading = (points = 5) => ({
    groundTruths: [''],
    rubricCriteria: [
        { rubricId: 'r1', title: 'ความถูกต้องของเนื้อหา', description: 'ประเมินความถูกต้องตามหลักวิชาการ', maxScore: points }
    ],
    keyConcepts: [],
    language: 'th',
    providerPreference: 'system',
    modelPreference: ''
});

const createDefaultQuestion = () => ({
    questionId: `q-${Date.now()}`,
    type: 'text',
    prompt: '',
    choices: [
        { value: 'a', label: '' },
        { value: 'b', label: '' },
    ],
    correctAnswer: '',
    points: 5,
    gradingMode: 'ai',
    aiGrading: createDefaultAiGrading(5)
});

const TestAIExam = () => {
    const navigate = useNavigate();

    // Steps: 1: 'builder', 2: 'setup', 3: 'results'
    const [step, setStep] = useState(1);
    const [providerSettings, setProviderSettings] = useState({ primary: 'gemini', fallbacks: [], providers: [] });
    const [questions, setQuestions] = useState(PRESET_EXAMS[0].questions);
    const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
    
    // Model Selection
    const [selectedModels, setSelectedModels] = useState([
        { provider: 'gemini', model: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
        { provider: 'gemini', model: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    ]);
    const [customModel, setCustomModel] = useState({ provider: 'gemini', model: '', label: '' });

    // Student Answer Simulation
    const [studentAnswer, setStudentAnswer] = useState(
        PRESET_EXAMS[0].questions[0].sampleAnswers?.excellent || ''
    );

    // Benchmark Run & State
    const [running, setRunning] = useState(false);
    const [benchmarkData, setBenchmarkData] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await api.get('/grading/provider-settings');
                setProviderSettings(data);
            } catch (err) {
                console.error('Failed to load provider settings:', err);
            }
        };
        fetchSettings();
    }, []);

    const currentQuestion = questions[selectedQuestionIndex] || questions[0];

    const handleSelectPreset = (preset) => {
        setQuestions(preset.questions);
        setSelectedQuestionIndex(0);
        const firstQ = preset.questions[0];
        if (firstQ?.sampleAnswers?.excellent) {
            setStudentAnswer(firstQ.sampleAnswers.excellent);
        }
    };

    const toggleModelSelection = (target) => {
        const exists = selectedModels.some(
            m => m.provider === target.provider && m.model === target.model
        );
        if (exists) {
            if (selectedModels.length <= 1) {
                alert('ต้องเลือกโมเดลอย่างน้อย 1 ตัวในการทดสอบ');
                return;
            }
            setSelectedModels(selectedModels.filter(
                m => !(m.provider === target.provider && m.model === target.model)
            ));
        } else {
            if (selectedModels.length >= 6) {
                alert('เลือกได้สูงสุด 6 โมเดลพร้อมกัน');
                return;
            }
            setSelectedModels([...selectedModels, target]);
        }
    };

    const addCustomModel = () => {
        if (!customModel.model.trim()) return;
        const newModel = {
            provider: customModel.provider,
            model: customModel.model.trim(),
            label: customModel.label.trim() || `${customModel.provider}:${customModel.model.trim()}`
        };
        setSelectedModels([...selectedModels, newModel]);
        setCustomModel({ provider: 'gemini', model: '', label: '' });
    };

    const updateQuestionField = (field, value) => {
        const updated = [...questions];
        updated[selectedQuestionIndex] = { ...updated[selectedQuestionIndex], [field]: value };
        setQuestions(updated);
    };

    const runBenchmark = async () => {
        if (!currentQuestion || currentQuestion.type !== 'text') {
            setError('ระบบ Benchmark รองรับเฉพาะข้อสอบประเภทอัตนัยตรวจด้วย AI');
            return;
        }
        if (!studentAnswer.trim()) {
            setError('กรุณาระบุคำตอบของนักเรียนที่ต้องการทดสอบ');
            return;
        }
        if (selectedModels.length === 0) {
            setError('กรุณาเลือกโมเดลอย่างน้อย 1 ตัว');
            return;
        }

        setRunning(true);
        setError('');
        setBenchmarkData(null);

        try {
            const rawRequest = {
                question: currentQuestion.prompt,
                groundTruths: currentQuestion.aiGrading.groundTruths.filter(t => t.trim()),
                studentAnswer: studentAnswer.trim(),
                rubric: currentQuestion.aiGrading.rubricCriteria.map(item => ({
                    id: item.rubricId,
                    title: item.title,
                    description: item.description,
                    maxScore: Number(item.maxScore)
                })),
                keyConcepts: currentQuestion.aiGrading.keyConcepts.filter(k => k.trim()),
                maxScore: Number(currentQuestion.points),
                language: currentQuestion.aiGrading.language || 'th'
            };

            const { data } = await api.post('/grading/benchmark', {
                request: rawRequest,
                models: selectedModels
            });

            setBenchmarkData(data);
            setStep(3);
        } catch (err) {
            console.error('Benchmark error:', err);
            setError(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการรัน Benchmark');
        } finally {
            setRunning(false);
        }
    };

    const exportToRealExam = () => {
        // Navigate to Create Exam with imported question state
        navigate('/teacher/exams/create', {
            state: {
                importedQuestions: questions
            }
        });
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Top Banner Header */}
            <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide uppercase text-indigo-100">
                            <FlaskConical size={14} className="text-yellow-300" />
                            AI Arena & Model Benchmark Sandbox
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                            ห้องทดลองข้อสอบ & เปรียบเทียบโมเดล AI
                        </h1>
                        <p className="text-indigo-100 text-sm max-w-2xl">
                            ทดลองสร้างโจทย์ข้อสอบ เลือกโมเดล AI หลายตัวเพื่อประเมินคำตอบพร้อมกัน และดูบทวิเคราะห์ว่าโมเดลใดแม่นยำ เร็ว และคุ้มค่าที่สุดก่อนนำไปใช้จริง
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={exportToRealExam}
                            className="px-4 py-2 text-sm font-semibold bg-white text-indigo-900 hover:bg-indigo-50 rounded-xl transition shadow flex items-center gap-2"
                            title="นำข้อสอบชุดนี้ไปเปิดใช้ในระบบจริง"
                        >
                            <ExternalLink size={16} /> นำไปสร้างข้อสอบจริง
                        </button>
                    </div>
                </div>

                {/* Step Indicators */}
                <div className="mt-6 pt-4 border-t border-white/15 flex flex-wrap items-center gap-3 text-xs font-medium">
                    <button
                        type="button"
                        onClick={() => setStep(1)}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${step === 1 ? 'bg-white text-indigo-900 shadow-sm font-bold' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                    >
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
                        1. ออกแบบโจทย์ (Sandbox)
                    </button>
                    <ChevronRight size={14} className="text-indigo-200" />
                    <button
                        type="button"
                        onClick={() => setStep(2)}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${step === 2 ? 'bg-white text-indigo-900 shadow-sm font-bold' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                    >
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
                        2. เลือกโมเดล & คำตอบทดสอบ
                    </button>
                    <ChevronRight size={14} className="text-indigo-200" />
                    <button
                        type="button"
                        onClick={() => benchmarkData && setStep(3)}
                        disabled={!benchmarkData}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${step === 3 ? 'bg-white text-indigo-900 shadow-sm font-bold' : benchmarkData ? 'bg-white/10 hover:bg-white/20 text-white' : 'opacity-50 text-indigo-200 cursor-not-allowed'}`}
                    >
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">3</span>
                        3. ผลลัพธ์ & Smart Recommendation
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-700 text-sm">
                    <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-500" />
                    <p>{error}</p>
                </div>
            )}

            {/* STEP 1: Exam Builder & Presets */}
            {step === 1 && (
                <div className="space-y-6">
                    {/* Presets Bar */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles size={18} className="text-indigo-600" />
                                <h2 className="text-sm font-semibold text-gray-900">เลือกชุดข้อสอบตัวอย่างสำเร็จรูป (Presets)</h2>
                            </div>
                            <span className="text-xs text-gray-500">คลิกเพื่อโหลดและทดสอบได้ทันที</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {PRESET_EXAMS.map((preset, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => handleSelectPreset(preset)}
                                    className="p-3.5 rounded-xl border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50/50 text-left transition flex flex-col justify-between group"
                                >
                                    <div>
                                        <div className="font-semibold text-sm text-gray-900 group-hover:text-indigo-700">{preset.title}</div>
                                        <div className="text-xs text-gray-500 mt-1">{preset.description}</div>
                                    </div>
                                    <div className="mt-2 text-[11px] font-medium text-indigo-600 flex items-center gap-1">
                                        ใช้ชุดข้อสอบนี้ <ArrowRight size={12} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Question Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                                <Layers size={18} className="text-indigo-600" />
                                คำถามข้อสอบอัตนัย (AI Grading)
                            </h3>
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-gray-500">คะแนนเต็ม:</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={currentQuestion.points}
                                    onChange={(e) => updateQuestionField('points', Number(e.target.value))}
                                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">โจทย์คำถาม</label>
                            <RichTextEditor
                                content={currentQuestion.prompt}
                                onChange={(html) => updateQuestionField('prompt', html)}
                                placeholder="พิมพ์โจทย์คำถามอัตนัย..."
                            />
                        </div>

                        {/* AI Grading Config (Rubrics, GroundTruths, KeyConcepts) */}
                        <AIGradingConfig
                            value={currentQuestion.aiGrading}
                            points={currentQuestion.points}
                            providerSettings={providerSettings}
                            onChange={(next) => updateQuestionField('aiGrading', next)}
                        />
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => setStep(2)}
                            className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow flex items-center gap-2"
                        >
                            ถัดไป: เลือกโมเดล & คำตอบทดสอบ <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 2: Model Selection & Test Scenario Setup */}
            {step === 2 && (
                <div className="space-y-6">
                    {/* Models Selection Grid */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <Sparkles size={18} className="text-indigo-600" />
                                    เลือกโมเดล AI ที่ต้องการเปรียบเทียบ (เลือกได้ 1-6 โมเดล)
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">โมเดลที่เลือกจะถูกรันพร้อมกันเพื่อนำผลคะแนน, เหตุผล, และความเร็วมาเปรียบเทียบใน Arena</p>
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full self-start sm:self-auto">
                                เลือกแล้ว {selectedModels.length} โมเดล
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {DEFAULT_MODELS_POOL.map((item, idx) => {
                                const isSelected = selectedModels.some(
                                    m => m.provider === item.provider && m.model === item.model
                                );
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => toggleModelSelection(item)}
                                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex items-start justify-between gap-2 ${isSelected ? 'border-indigo-600 bg-indigo-50/40 shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.badgeColor}`}>
                                                    {item.provider.toUpperCase()}
                                                </span>
                                                <span className="text-[10px] font-medium text-gray-500">{item.tag}</span>
                                            </div>
                                            <div className="font-semibold text-sm text-gray-900">{item.label}</div>
                                            <div className="text-[11px] text-gray-400 font-mono">{item.model}</div>
                                        </div>

                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-1 transition ${isSelected ? 'bg-indigo-600 text-white' : 'border border-gray-300'}`}>
                                            {isSelected && <Check size={12} />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Add Custom Model */}
                        <div className="pt-2">
                            <div className="flex flex-col sm:flex-row items-center gap-2">
                                <select
                                    value={customModel.provider}
                                    onChange={(e) => setCustomModel({ ...customModel, provider: e.target.value })}
                                    className="w-full sm:w-36 px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="gemini">Gemini</option>
                                    <option value="openrouter">OpenRouter</option>
                                </select>
                                <input
                                    type="text"
                                    placeholder="ระบุชื่อ Model ID อื่นๆ เช่น mistralai/mistral-large"
                                    value={customModel.model}
                                    onChange={(e) => setCustomModel({ ...customModel, model: e.target.value })}
                                    className="flex-1 w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <button
                                    type="button"
                                    onClick={addCustomModel}
                                    className="w-full sm:w-auto px-4 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                                >
                                    + เพิ่มโมเดล
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Test Student Answer Input */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <FileSpreadsheet size={18} className="text-indigo-600" />
                                    คำตอบของนักเรียนที่ใช้ทดสอบ (Student Answer Simulation)
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">พิมพ์คำตอบที่ต้องการทดสอบ หรือเลือกตัวอย่างระดับคะแนนจำลอง</p>
                            </div>

                            {/* Preset Answer Chips */}
                            {currentQuestion.sampleAnswers && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setStudentAnswer(currentQuestion.sampleAnswers.excellent || '')}
                                        className="px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 rounded-md border border-green-200 transition"
                                    >
                                        ✓ ตอบดีมาก (100%)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStudentAnswer(currentQuestion.sampleAnswers.average || '')}
                                        className="px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-md border border-amber-200 transition"
                                    >
                                        ~ ตอบปานกลาง (60%)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStudentAnswer(currentQuestion.sampleAnswers.poor || '')}
                                        className="px-2.5 py-1 text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 rounded-md border border-red-200 transition"
                                    >
                                        ✕ ตอบไม่ตรงประเด็น
                                    </button>
                                </div>
                            )}
                        </div>

                        <div>
                            <textarea
                                rows={5}
                                value={studentAnswer}
                                onChange={(e) => setStudentAnswer(e.target.value)}
                                placeholder="พิมพ์ข้อความคำตอบของนักเรียนที่จะส่งให้ AI ตรวจสอบ..."
                                className="w-full p-3.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                            />
                            <div className="text-right text-xs text-gray-400 mt-1">
                                {studentAnswer.length} ตัวอักษร
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition"
                        >
                            ย้อนกลับ
                        </button>
                        <button
                            type="button"
                            onClick={runBenchmark}
                            disabled={running}
                            className={`px-8 py-3 text-sm font-bold text-white rounded-xl shadow-lg transition flex items-center gap-2 ${running ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200'}`}
                        >
                            {running ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    กำลังประมวลผล Arena ({selectedModels.length} โมเดล)...
                                </>
                            ) : (
                                <>
                                    <Play size={18} /> เริ่มทดสอบเปรียบเทียบโมเดล (Run Benchmark)
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: Results & Smart Recommendation Arena */}
            {step === 3 && benchmarkData && (
                <div className="space-y-6">
                    {/* Recommendations Banner */}
                    {benchmarkData.summary?.recommendations && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Best Value Badge */}
                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300/80 rounded-2xl p-5 shadow-sm space-y-2 relative overflow-hidden">
                                <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                                        <Zap size={14} className="text-emerald-600" /> เร็วและประหยัดที่สุด
                                    </span>
                                    <Trophy size={20} className="text-emerald-500" />
                                </div>
                                <div className="text-lg font-bold text-gray-900">
                                    {benchmarkData.summary.recommendations.bestValue.label}
                                </div>
                                <p className="text-xs text-emerald-900/80 leading-relaxed">
                                    {benchmarkData.summary.recommendations.bestValue.reason}
                                </p>
                            </div>

                            {/* Highest Quality Badge */}
                            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-300/80 rounded-2xl p-5 shadow-sm space-y-2 relative overflow-hidden">
                                <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-full">
                                        <Sparkles size={14} className="text-purple-600" /> ละเอียด & แม่นยำที่สุด
                                    </span>
                                    <Trophy size={20} className="text-purple-500" />
                                </div>
                                <div className="text-lg font-bold text-gray-900">
                                    {benchmarkData.summary.recommendations.highestQuality.label}
                                </div>
                                <p className="text-xs text-purple-900/80 leading-relaxed">
                                    {benchmarkData.summary.recommendations.highestQuality.reason}
                                </p>
                            </div>

                            {/* Balanced Recommendation Badge */}
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300/80 rounded-2xl p-5 shadow-sm space-y-2 relative overflow-hidden">
                                <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full">
                                        <Scale size={14} className="text-blue-600" /> สมดุลแนะนำ (Recommended)
                                    </span>
                                    <Trophy size={20} className="text-blue-500" />
                                </div>
                                <div className="text-lg font-bold text-gray-900">
                                    {benchmarkData.summary.recommendations.balanced.label}
                                </div>
                                <p className="text-xs text-blue-900/80 leading-relaxed">
                                    {benchmarkData.summary.recommendations.balanced.reason}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Summary Metrics Bar */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <Layers size={16} className="text-indigo-600" />
                                สรุปสถิติการเปรียบเทียบ (Benchmark Summary)
                            </h3>
                            <div className="text-xs text-gray-500">
                                ผ่าน {benchmarkData.summary?.successfulCount}/{benchmarkData.summary?.totalEvaluated} โมเดล
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                            <div className="p-3 bg-gray-50 rounded-xl">
                                <div className="text-xs text-gray-500">คะแนนเฉลี่ย</div>
                                <div className="text-xl font-extrabold text-indigo-600 mt-1">
                                    {benchmarkData.summary?.averageScore} <span className="text-xs font-normal text-gray-400">/ {currentQuestion.points}</span>
                                </div>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl">
                                <div className="text-xs text-gray-500">ช่วงคะแนน (Min - Max)</div>
                                <div className="text-xl font-extrabold text-gray-900 mt-1">
                                    {benchmarkData.summary?.scoreRange?.min} - {benchmarkData.summary?.scoreRange?.max}
                                </div>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl">
                                <div className="text-xs text-gray-500">ส่วนต่างคะแนน (Spread)</div>
                                <div className="text-xl font-extrabold text-gray-900 mt-1">
                                    ±{benchmarkData.summary?.scoreRange?.spread}
                                </div>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl">
                                <div className="text-xs text-gray-500">ข้อคิดเห็นหลัก</div>
                                <div className="text-xs text-gray-700 mt-1 font-medium leading-relaxed">
                                    {benchmarkData.summary?.insights?.[0] || 'ประมวลผลสำเร็จ'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Side-by-Side Model Comparison Cards */}
                    <div className="space-y-4">
                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <Sparkles size={18} className="text-indigo-600" />
                            ผลการตรวจรายโมเดล (Side-by-Side Arena)
                        </h3>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {benchmarkData.results.map((entry, idx) => {
                                const isSuccess = entry.status === 'succeeded' && entry.result;
                                return (
                                    <div
                                        key={idx}
                                        className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col justify-between"
                                    >
                                        {/* Card Header */}
                                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                                                        {entry.provider.toUpperCase()}
                                                    </span>
                                                    <h4 className="font-bold text-sm text-gray-900">{entry.label}</h4>
                                                </div>
                                                <div className="text-[11px] text-gray-400 font-mono mt-0.5">{entry.model}</div>
                                            </div>

                                            <div className="text-right">
                                                {isSuccess ? (
                                                    <div className="text-xl font-black text-indigo-600">
                                                        {entry.result.totalScore} <span className="text-xs font-normal text-gray-400">/ {currentQuestion.points}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">ล้มเหลว</span>
                                                )}
                                                <div className="text-[11px] text-gray-500 flex items-center gap-1 justify-end mt-0.5">
                                                    <Clock size={12} /> {entry.latencyMs} ms
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Body */}
                                        <div className="p-4 space-y-3 flex-1 text-xs">
                                            {isSuccess ? (
                                                <>
                                                    {/* Rubric Breakdown */}
                                                    <div>
                                                        <div className="font-semibold text-gray-700 mb-2">คะแนนรายเกณฑ์ Rubric:</div>
                                                        <div className="space-y-2">
                                                            {entry.result.rubricScores?.map((rub, rIdx) => (
                                                                <div key={rIdx} className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 space-y-1">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="font-semibold text-gray-800">
                                                                            {currentQuestion.aiGrading.rubricCriteria.find(c => c.rubricId === rub.rubricId)?.title || `เกณฑ์ที่ ${rIdx + 1}`}
                                                                        </span>
                                                                        <span className="font-bold text-indigo-600">
                                                                            {rub.score} คะแนน
                                                                        </span>
                                                                    </div>
                                                                    {rub.feedback && (
                                                                        <p className="text-gray-600 text-[11px] leading-relaxed">{rub.feedback}</p>
                                                                    )}
                                                                    {rub.evidence && (
                                                                        <div className="text-[11px] text-emerald-700 bg-emerald-50/70 p-1.5 rounded border border-emerald-100/60 mt-1">
                                                                            <span className="font-semibold">หลักฐานจากคำตอบ:</span> "{rub.evidence}"
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* General Feedback */}
                                                    {entry.result.feedback && (
                                                        <div className="pt-2 border-t border-gray-100">
                                                            <span className="font-semibold text-gray-700">ข้อเสนอแนะภาพรวม:</span>
                                                            <p className="text-gray-600 mt-0.5 leading-relaxed bg-indigo-50/30 p-2 rounded-lg border border-indigo-100/50">
                                                                {entry.result.feedback}
                                                            </p>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="p-3 bg-red-50 text-red-700 rounded-lg">
                                                    <p className="font-semibold">ข้อผิดพลาด:</p>
                                                    <p className="mt-1 text-[11px]">{entry.error}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Card Footer */}
                                        <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                                            <span>Tokens: In {entry.result?.metadata?.inputTokens || '-'} / Out {entry.result?.metadata?.outputTokens || '-'}</span>
                                            <span className="font-medium text-indigo-600">
                                                Confidence: {entry.result?.confidence !== undefined ? `${(entry.result.confidence * 100).toFixed(0)}%` : '100%'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={() => setStep(2)}
                            className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition flex items-center justify-center gap-2"
                        >
                            <RotateCcw size={16} /> ปรับเปลี่ยนโมเดล & ทดสอบใหม่
                        </button>

                        <button
                            type="button"
                            onClick={exportToRealExam}
                            className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow flex items-center justify-center gap-2"
                        >
                            <ExternalLink size={16} /> นำโจทย์ข้อนี้ไปสร้างข้อสอบจริงในระบบหลัก
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestAIExam;
