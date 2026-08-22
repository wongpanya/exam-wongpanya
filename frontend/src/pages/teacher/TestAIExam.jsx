import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../config/api';
import {
    FlaskConical,
    Sparkles,
    Plus,
    Trash2,
    Copy,
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
    ChevronDown,
    Search,
    RefreshCw,
    Check,
    X,
    ExternalLink,
    Filter,
    Users,
    History,
    Save,
    Pencil,
    FileText,
    ListChecks,
    Radio,
    BookOpen
} from 'lucide-react';
import RichTextEditor from '../../components/RichTextEditor';
import AIGradingConfig from '../../components/AIGradingConfig';

const PRESET_EXAMS = [
    {
        title: 'ทดสอบ AI: วิทยาศาสตร์ (การสังเคราะห์ด้วยแสง)',
        description: 'โจทย์อัตนัยอธิบายกระบวนการสังเคราะห์ด้วยแสง พร้อม Rubric 2 เกณฑ์',
        durationMin: 30,
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
                }
            }
        ]
    },
    {
        title: 'ทดสอบ AI: วิทยาการคอมพิวเตอร์ (Deep Learning vs ML)',
        description: 'โจทย์อัตนัยเปรียบเทียบ Deep Learning และ Machine Learning พร้อม Rubric 4 เกณฑ์',
        durationMin: 45,
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
                }
            }
        ]
    }
];

const FALLBACK_STANDARD_MODELS = [
    { provider: 'gemini', model: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', tag: 'Fast & Cheap' },
    { provider: 'gemini', model: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', tag: 'High Reasoning' },
    { provider: 'gemini', model: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', tag: 'Balanced' },
    { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', tag: 'Top Quality' },
    { provider: 'openrouter', model: 'openai/gpt-4o', label: 'GPT-4o', tag: 'Flagship' },
    { provider: 'openrouter', model: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', tag: 'Efficient' },
    { provider: 'openrouter', model: 'deepseek/deepseek-chat', label: 'DeepSeek Chat', tag: 'Cost Effective' },
    { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B', tag: 'Open Weights' },
];

const MODEL_PRESETS = [
    {
        name: '🌟 โมเดลยอดนิยม',
        models: [
            { provider: 'gemini', model: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
            { provider: 'gemini', model: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
            { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
        ]
    },
    {
        name: '⚡ เน้นเร็วและประหยัด',
        models: [
            { provider: 'gemini', model: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
            { provider: 'openrouter', model: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
            { provider: 'openrouter', model: 'deepseek/deepseek-chat', label: 'DeepSeek Chat' },
        ]
    },
    {
        name: '🧠 เน้นความแม่นยำสูง',
        models: [
            { provider: 'gemini', model: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
            { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
            { provider: 'openrouter', model: 'openai/gpt-4o', label: 'GPT-4o' },
        ]
    }
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

    // Main Tabs: 'list' (Exams List), 'editor' (Create/Edit Exam), 'sessions' (All Sessions History)
    const [activeTab, setActiveTab] = useState('list');

    // Exams List & Loading State
    const [savedExams, setSavedExams] = useState([]);
    const [loadingExams, setLoadingExams] = useState(false);
    const [editingExamId, setEditingExamId] = useState(null);

    // Exam Builder Form State
    const [examTitle, setExamTitle] = useState('ชุดข้อสอบจำลองทดสอบ AI');
    const [examDescription, setExamDescription] = useState('');
    const [examDuration, setExamDuration] = useState(30);
    const [questions, setQuestions] = useState(PRESET_EXAMS[0].questions);
    const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
    const [saving, setSaving] = useState(false);

    // Provider & Models Catalog
    const [providerSettings, setProviderSettings] = useState({ primary: 'gemini', fallbacks: [], providers: [] });
    const [selectedModels, setSelectedModels] = useState([
        { provider: 'gemini', model: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
        { provider: 'gemini', model: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    ]);
    const [searchQuery, setSearchQuery] = useState('');
    const [providerFilter, setProviderFilter] = useState('all');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const dropdownRef = useRef(null);

    // Start Session Modal State
    const [sessionModalExam, setSessionModalExam] = useState(null);
    const [sessionDuration, setSessionDuration] = useState(30);
    const [launchingSession, setLaunchingSession] = useState(false);

    // All Sessions History State
    const [allSessions, setAllSessions] = useState([]);
    const [loadingSessions, setLoadingSessions] = useState(false);

    const [error, setError] = useState('');

    // Fetch Exams List
    const fetchExams = async () => {
        setLoadingExams(true);
        try {
            const { data } = await api.get('/grading/test-exams');
            setSavedExams(data);
        } catch (err) {
            console.error('Failed to load test exams:', err);
        } finally {
            setLoadingExams(false);
        }
    };

    // Fetch All Sessions History
    const fetchAllSessions = async () => {
        setLoadingSessions(true);
        try {
            const { data } = await api.get('/grading/test-sessions');
            setAllSessions(data);
        } catch (err) {
            console.error('Failed to load sessions:', err);
        } finally {
            setLoadingSessions(false);
        }
    };

    // Fetch Provider Settings
    const fetchSettings = async () => {
        try {
            const { data } = await api.get('/grading/provider-settings');
            setProviderSettings(data);
        } catch (err) {
            console.error('Failed to load provider settings:', err);
        }
    };

    useEffect(() => {
        fetchExams();
        fetchSettings();
    }, []);

    useEffect(() => {
        if (activeTab === 'sessions') {
            fetchAllSessions();
        }
    }, [activeTab]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Combine all models from API + Standard Fallbacks
    const allAvailableModels = useMemo(() => {
        const map = new Map();

        if (providerSettings?.providers && Array.isArray(providerSettings.providers)) {
            for (const p of providerSettings.providers) {
                const providerName = p.provider;
                if (Array.isArray(p.models)) {
                    for (const m of p.models) {
                        const key = `${providerName}::${m.modelId}`;
                        map.set(key, {
                            provider: providerName,
                            model: m.modelId,
                            label: m.displayName || m.modelId,
                            contextLength: m.contextLength || null,
                            fromApi: true,
                        });
                    }
                }
            }
        }

        for (const item of FALLBACK_STANDARD_MODELS) {
            const key = `${item.provider}::${item.model}`;
            if (!map.has(key)) {
                map.set(key, {
                    provider: item.provider,
                    model: item.model,
                    label: item.label,
                    tag: item.tag,
                    fromApi: false,
                });
            }
        }

        return Array.from(map.values());
    }, [providerSettings]);

    // Filter models
    const filteredModels = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return allAvailableModels.filter((item) => {
            if (providerFilter !== 'all' && item.provider !== providerFilter) {
                return false;
            }
            if (!query) return true;
            return (
                item.model.toLowerCase().includes(query) ||
                item.label.toLowerCase().includes(query) ||
                item.provider.toLowerCase().includes(query) ||
                (item.tag && item.tag.toLowerCase().includes(query))
            );
        });
    }, [allAvailableModels, searchQuery, providerFilter]);

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
            if (selectedModels.length >= 8) {
                alert('เลือกได้สูงสุด 8 โมเดลพร้อมกัน');
                return;
            }
            setSelectedModels([...selectedModels, {
                provider: target.provider,
                model: target.model,
                label: target.label || target.model
            }]);
        }
    };

    const handleCreateNewExam = () => {
        setEditingExamId(null);
        setExamTitle('ชุดข้อสอบจำลองทดสอบ AI');
        setExamDescription('');
        setExamDuration(30);
        setQuestions([createDefaultQuestion()]);
        setSelectedQuestionIndex(0);
        setActiveTab('editor');
    };

    const handleEditExam = (exam) => {
        setEditingExamId(exam._id);
        setExamTitle(exam.title);
        setExamDescription(exam.description || '');
        setExamDuration(exam.durationMin || 30);
        setQuestions(exam.questions || [createDefaultQuestion()]);
        setSelectedQuestionIndex(0);
        if (exam.defaultModels && exam.defaultModels.length > 0) {
            setSelectedModels(exam.defaultModels);
        }
        setActiveTab('editor');
    };

    const handleDeleteExam = async (examId, e) => {
        e?.stopPropagation();
        if (!window.confirm('คุณต้องการลบชุดข้อสอบนี้หรือไม่?')) return;
        try {
            await api.delete(`/grading/test-exams/${examId}`);
            fetchExams();
        } catch (err) {
            alert(err.response?.data?.message || 'เกิดข้อผิดพลาดในการลบชุดข้อสอบ');
        }
    };

    const handleSaveExam = async (startAfterSave = false) => {
        if (!examTitle.trim()) {
            alert('กรุณาระบุชื่อชุดข้อสอบ');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const payload = {
                title: examTitle.trim(),
                description: examDescription.trim(),
                durationMin: Number(examDuration) || 30,
                questions,
                defaultModels: selectedModels,
            };

            let savedExamData;
            if (editingExamId) {
                const { data } = await api.put(`/grading/test-exams/${editingExamId}`, payload);
                savedExamData = data;
            } else {
                const { data } = await api.post('/grading/test-exams', payload);
                savedExamData = data;
            }

            await fetchExams();

            if (startAfterSave) {
                handleOpenStartSessionModal(savedExamData);
            } else {
                alert('บันทึกชุดข้อสอบเรียบร้อยแล้ว!');
                setActiveTab('list');
            }
        } catch (err) {
            console.error('Save exam failed:', err);
            setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อสอบ');
        } finally {
            setSaving(false);
        }
    };

    const handleOpenStartSessionModal = (exam) => {
        setSessionModalExam(exam);
        setSessionDuration(exam.durationMin || 30);
        if (exam.defaultModels && exam.defaultModels.length > 0) {
            setSelectedModels(exam.defaultModels);
        }
    };

    const handleLaunchSession = async () => {
        if (!sessionModalExam) return;
        if (selectedModels.length === 0) {
            alert('กรุณาเลือกโมเดล AI อย่างน้อย 1 ตัว');
            return;
        }

        setLaunchingSession(true);
        setError('');

        try {
            const { data } = await api.post('/grading/test-sessions', {
                testExamId: sessionModalExam._id,
                title: sessionModalExam.title,
                description: sessionModalExam.description,
                durationMin: Number(sessionDuration) || 30,
                questions: sessionModalExam.questions,
                modelsToCompare: selectedModels,
            });

            navigate(`/teacher/test-ai-exam/sessions/${data.session._id}`);
        } catch (err) {
            console.error('Launch session failed:', err);
            setError(err.response?.data?.message || 'ไม่สามารถเปิดห้องสอบได้');
        } finally {
            setLaunchingSession(false);
        }
    };

    const currentQuestion = questions[selectedQuestionIndex] || questions[0];

    const updateQuestionField = (field, value) => {
        const updated = [...questions];
        updated[selectedQuestionIndex] = { ...updated[selectedQuestionIndex], [field]: value };
        setQuestions(updated);
    };

    const handleAddQuestion = () => {
        const newQ = createDefaultQuestion();
        setQuestions([...questions, newQ]);
        setSelectedQuestionIndex(questions.length);
    };

    const handleRemoveQuestion = (index) => {
        if (questions.length <= 1) {
            alert('ต้องมีคำถามอย่างน้อย 1 ข้อในชุดข้อสอบ');
            return;
        }
        const updated = questions.filter((_, idx) => idx !== index);
        setQuestions(updated);
        setSelectedQuestionIndex(Math.max(0, index - 1));
    };

    const handleSelectPreset = (preset) => {
        setExamTitle(preset.title);
        setExamDescription(preset.description);
        setExamDuration(preset.durationMin || 30);
        setQuestions(preset.questions);
        setSelectedQuestionIndex(0);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-16">
            {/* Top Banner Header */}
            <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide uppercase text-indigo-100">
                            <FlaskConical size={14} className="text-yellow-300" />
                            ระบบสอบจำลอง & เปรียบเทียบโมเดล AI
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                            ห้องทดลองข้อสอบ & เปรียบเทียบโมเดล AI
                        </h1>
                        <p className="text-indigo-100 text-sm max-w-2xl">
                            สร้างชุดข้อสอบ บันทึกลงระบบ เปิดห้องสอบจำลอง (Live Session) ให้นักเรียนเข้าสอบจริง และเปรียบเทียบผลการตรวจของ AI แต่ละโมเดล
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={handleCreateNewExam}
                            className="px-4 py-2.5 text-xs font-bold bg-white text-indigo-900 hover:bg-indigo-50 rounded-xl transition shadow flex items-center gap-2"
                        >
                            <Plus size={16} /> สร้างชุดข้อสอบใหม่
                        </button>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="mt-6 pt-4 border-t border-white/15 flex items-center gap-3 text-xs font-medium">
                    <button
                        type="button"
                        onClick={() => setActiveTab('list')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${activeTab === 'list' ? 'bg-white text-indigo-900 font-bold shadow-sm' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                    >
                        <BookOpen size={15} />
                        รายการชุดข้อสอบ ({savedExams.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('editor')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${activeTab === 'editor' ? 'bg-white text-indigo-900 font-bold shadow-sm' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                    >
                        <Pencil size={15} />
                        {editingExamId ? 'แก้ไขข้อสอบ' : 'สร้างข้อสอบ'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('sessions')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${activeTab === 'sessions' ? 'bg-white text-indigo-900 font-bold shadow-sm' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                    >
                        <History size={15} />
                        ประวัติ Session การสอบ
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-700 text-sm">
                    <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-500" />
                    <p>{error}</p>
                </div>
            )}

            {/* TAB 1: Exams List */}
            {activeTab === 'list' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <Layers size={18} className="text-indigo-600" />
                            ชุดข้อสอบจำลองที่บันทึกไว้ในระบบ ({savedExams.length})
                        </h2>
                    </div>

                    {loadingExams ? (
                        <div className="p-12 text-center text-xs text-gray-500 bg-white rounded-2xl border border-gray-100">
                            กำลังโหลดรายการข้อสอบ...
                        </div>
                    ) : savedExams.length === 0 ? (
                        <div className="p-12 text-center bg-white rounded-2xl border border-gray-100 space-y-3">
                            <BookOpen size={36} className="mx-auto text-gray-300" />
                            <h3 className="font-bold text-gray-800 text-sm">ยังไม่มีชุดข้อสอบจำลองในระบบ</h3>
                            <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                เริ่มต้นสร้างชุดข้อสอบจำลอง หรือเลือกใช้ชุดข้อสอบตัวอย่างสำเร็จรูปเพื่อเปิดห้องสอบเปรียบเทียบ AI ได้ทันที
                            </p>
                            <button
                                type="button"
                                onClick={handleCreateNewExam}
                                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition shadow"
                            >
                                + สร้างชุดข้อสอบใหม่
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {savedExams.map((exam) => (
                                <div
                                    key={exam._id}
                                    className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 hover:border-indigo-300 transition flex flex-col justify-between space-y-4 group"
                                >
                                    <div className="space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="font-bold text-base text-gray-900 group-hover:text-indigo-600 transition line-clamp-1">
                                                {exam.title}
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={(e) => handleDeleteExam(exam._id, e)}
                                                className="p-1 text-gray-400 hover:text-red-500 rounded transition"
                                                title="ลบชุดข้อสอบ"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>

                                        <p className="text-xs text-gray-500 line-clamp-2">
                                            {exam.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 pt-1">
                                            <span className="flex items-center gap-1">
                                                <ListChecks size={13} className="text-indigo-600" />
                                                {exam.questions?.length || 0} ข้อ
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock size={13} className="text-indigo-600" />
                                                {exam.durationMin || 30} นาที
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <History size={13} className="text-indigo-600" />
                                                สอบแล้ว {exam.sessionCount || 0} ครั้ง
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleEditExam(exam)}
                                            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition flex items-center gap-1"
                                        >
                                            <Pencil size={13} /> แก้ไข
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleOpenStartSessionModal(exam)}
                                            className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow flex items-center gap-1.5"
                                        >
                                            <Play size={13} /> เริ่มสอบ (Start)
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: Exam Builder & Editor */}
            {activeTab === 'editor' && (
                <div className="space-y-6">
                    {/* Presets Bar */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles size={18} className="text-indigo-600" />
                                <h2 className="text-sm font-semibold text-gray-900">เลือกชุดข้อสอบตัวอย่างสำเร็จรูป (Presets)</h2>
                            </div>
                            <span className="text-xs text-gray-500">คลิกเพื่อโหลดและแก้ไขได้ทันที</span>
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
                                        โหลดชุดข้อสอบนี้ <ArrowRight size={12} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Exam Metadata Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 space-y-4">
                        <h3 className="font-bold text-gray-900 text-base flex items-center gap-2 border-b border-gray-100 pb-3">
                            <FileText size={18} className="text-indigo-600" />
                            ข้อมูลชุดข้อสอบ
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="sm:col-span-2 space-y-1">
                                <label className="block text-xs font-semibold text-gray-700">ชื่อชุดข้อสอบ *</label>
                                <input
                                    type="text"
                                    value={examTitle}
                                    onChange={(e) => setExamTitle(e.target.value)}
                                    placeholder="ระบุชื่อชุดข้อสอบ เช่น ข้อสอบกลางภาค AI & Data..."
                                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-gray-700">เวลาทำข้อสอบ (นาที)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={examDuration}
                                    onChange={(e) => setExamDuration(Number(e.target.value))}
                                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-gray-700">คำอธิบายข้อสอบ</label>
                            <input
                                type="text"
                                value={examDescription}
                                onChange={(e) => setExamDescription(e.target.value)}
                                placeholder="คำอธิบายสั้นๆ เกี่ยวกับเนื้อหาหรือเกณฑ์การสอบ..."
                                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Question Navigator */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {questions.map((q, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedQuestionIndex(idx)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-2 ${selectedQuestionIndex === idx ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                            >
                                ข้อที่ {idx + 1}
                                <span className={`text-[10px] px-1.5 py-0.2 rounded ${selectedQuestionIndex === idx ? 'bg-indigo-800 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                    {q.points} คะแนน
                                </span>
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={handleAddQuestion}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-indigo-50 text-indigo-700 transition shrink-0 flex items-center gap-1"
                        >
                            <Plus size={14} /> เพิ่มข้อคำถาม
                        </button>
                    </div>

                    {/* Active Question Editor Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-3">
                                <h3 className="font-bold text-gray-900 text-base">
                                    ข้อที่ {selectedQuestionIndex + 1}
                                </h3>
                                <select
                                    value={currentQuestion.type}
                                    onChange={(e) => {
                                        const nextType = e.target.value;
                                        updateQuestionField('type', nextType);
                                        updateQuestionField('gradingMode', nextType === 'text' ? 'ai' : 'exact');
                                    }}
                                    className="px-3 py-1 text-xs font-semibold border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="text">อัตนัย (ตรวจด้วย AI)</option>
                                    <option value="radio">ปรนัย (ตัวเลือกเดียว)</option>
                                    <option value="checkbox">ปรนัยหลายคำตอบ (Checkbox)</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                    <label className="text-xs text-gray-500">คะแนนเต็ม:</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={currentQuestion.points}
                                        onChange={(e) => updateQuestionField('points', Number(e.target.value))}
                                        className="w-16 px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-center"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveQuestion(selectedQuestionIndex)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition"
                                    title="ลบคำถามข้อนี้"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">โจทย์คำถาม</label>
                            <RichTextEditor
                                content={currentQuestion.prompt}
                                onChange={(html) => updateQuestionField('prompt', html)}
                                placeholder="พิมพ์โจทย์คำถาม..."
                            />
                        </div>

                        {/* If text AI question: show Rubrics & Ground Truths */}
                        {currentQuestion.type === 'text' && (
                            <AIGradingConfig
                                value={currentQuestion.aiGrading}
                                points={currentQuestion.points}
                                providerSettings={providerSettings}
                                onChange={(next) => updateQuestionField('aiGrading', next)}
                            />
                        )}

                        {/* If Objective Radio/Checkbox: show choices manager */}
                        {currentQuestion.type !== 'text' && (
                            <div className="space-y-3 pt-2">
                                <label className="block text-xs font-semibold text-gray-700">ตัวเลือกคำตอบ:</label>
                                <div className="space-y-2">
                                    {currentQuestion.choices?.map((c, cIdx) => (
                                        <div key={cIdx} className="flex items-center gap-2">
                                            <span className="w-6 text-center text-xs font-bold text-gray-500 uppercase">{c.value}.</span>
                                            <input
                                                type="text"
                                                value={c.label}
                                                onChange={(e) => {
                                                    const updatedChoices = [...currentQuestion.choices];
                                                    updatedChoices[cIdx].label = e.target.value;
                                                    updateQuestionField('choices', updatedChoices);
                                                }}
                                                placeholder={`ตัวเลือก ${c.value.toUpperCase()}`}
                                                className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-2">
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">คำตอบที่ถูกต้อง (Correct Answer):</label>
                                    <input
                                        type="text"
                                        value={currentQuestion.correctAnswer}
                                        onChange={(e) => updateQuestionField('correctAnswer', e.target.value)}
                                        placeholder={currentQuestion.type === 'checkbox' ? 'เช่น a,c' : 'เช่น a'}
                                        className="w-48 px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Save & Start Session Bar */}
                    <div className="flex items-center justify-between pt-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab('list')}
                            className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition"
                        >
                            ยกเลิก
                        </button>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => handleSaveExam(false)}
                                disabled={saving}
                                className="px-5 py-2.5 text-xs font-bold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl transition shadow-sm flex items-center gap-1.5"
                            >
                                <Save size={14} /> บันทึกข้อสอบ
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSaveExam(true)}
                                disabled={saving}
                                className="px-6 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition shadow flex items-center gap-1.5"
                            >
                                <Play size={14} /> บันทึก & เริ่มสอบทันที (Launch Session)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: All Sessions History */}
            {activeTab === 'sessions' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <History size={18} className="text-indigo-600" />
                            ประวัติห้องสอบจำลองทั้งหมดที่เคยเปิด ({allSessions.length})
                        </h2>
                    </div>

                    {loadingSessions ? (
                        <div className="p-12 text-center text-xs text-gray-500 bg-white rounded-2xl border border-gray-100">
                            กำลังโหลดประวัติห้องสอบ...
                        </div>
                    ) : allSessions.length === 0 ? (
                        <div className="p-12 text-center bg-white rounded-2xl border border-gray-100 space-y-3">
                            <History size={36} className="mx-auto text-gray-300" />
                            <h3 className="font-bold text-gray-800 text-sm">ยังไม่มีประวัติการเปิดห้องสอบ</h3>
                            <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                เมื่อครูเปิดห้องสอบจำลอง ให้นักเรียนเข้าทำข้อสอบ ระบบจะบันทึกสถิติและผลลัพธ์แยกตามแต่ละ Session ที่นี่
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                                    <tr>
                                        <th className="p-3.5">ชื่อห้องสอบจำลอง</th>
                                        <th className="p-3.5">รหัส PIN</th>
                                        <th className="p-3.5">โมเดลที่เปรียบเทียบ</th>
                                        <th className="p-3.5">นักเรียนส่งแล้ว</th>
                                        <th className="p-3.5">สถานะ</th>
                                        <th className="p-3.5">วันที่เปิดสอบ</th>
                                        <th className="p-3.5 text-right">การจัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {allSessions.map((s, sIdx) => (
                                        <tr key={sIdx} className="hover:bg-gray-50/70 transition">
                                            <td className="p-3.5 font-bold text-gray-900">
                                                {s.title}
                                            </td>
                                            <td className="p-3.5 font-mono font-bold text-indigo-700">
                                                {s.shortCode}
                                            </td>
                                            <td className="p-3.5">
                                                <div className="flex flex-wrap gap-1 max-w-xs">
                                                    {s.modelsToCompare?.map((m, mIdx) => (
                                                        <span key={mIdx} className="text-[10px] font-semibold px-1.5 py-0.2 bg-gray-100 text-gray-700 rounded">
                                                            {m.label}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="p-3.5 font-semibold text-gray-700">
                                                {s.submittedCount || 0} คน
                                            </td>
                                            <td className="p-3.5">
                                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${s.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'}`}>
                                                    {s.status === 'active' ? '🟢 เปิดอยู่' : 'ปิดแล้ว'}
                                                </span>
                                            </td>
                                            <td className="p-3.5 text-gray-500">
                                                {new Date(s.createdAt).toLocaleDateString('th-TH')}
                                            </td>
                                            <td className="p-3.5 text-right">
                                                <Link
                                                    to={`/teacher/test-ai-exam/sessions/${s._id}`}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition"
                                                >
                                                    ดูผลลัพธ์ & Arena <ArrowRight size={13} />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Launch Session Modal (Configure Models & Duration) */}
            {sessionModalExam && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] flex flex-col animate-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div>
                                <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                                    <Play size={18} className="text-indigo-600" />
                                    กำหนด Session สอบ & เลือกโมเดล AI
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">{sessionModalExam.title}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSessionModalExam(null)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                            {/* Duration */}
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-gray-700">กำหนดเวลาการสอบ (นาที):</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={sessionDuration}
                                    onChange={(e) => setSessionDuration(Number(e.target.value))}
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
                                />
                            </div>

                            {/* Select Models */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                                        <Sparkles size={14} className="text-indigo-600" />
                                        เลือกโมเดล AI ที่จะใช้ประเมินเปรียบเทียบ ({selectedModels.length} ตัว):
                                    </label>
                                </div>

                                {/* Selected Models Chips */}
                                <div className="flex flex-wrap gap-1.5 p-2.5 bg-gray-50 border border-gray-200 rounded-xl min-h-[44px]">
                                    {selectedModels.map((m, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-indigo-200 rounded-lg text-xs font-medium text-gray-800 shadow-sm"
                                        >
                                            <span className={`text-[9px] font-bold px-1 py-0.2 rounded uppercase ${m.provider === 'gemini' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                {m.provider}
                                            </span>
                                            {m.label}
                                            <button
                                                type="button"
                                                onClick={() => toggleModelSelection(m)}
                                                className="text-gray-400 hover:text-red-500 ml-1"
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>

                                {/* Models Dropdown */}
                                <div className="relative" ref={dropdownRef}>
                                    <div
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 hover:border-indigo-400 rounded-xl flex items-center justify-between cursor-pointer text-xs text-gray-700 shadow-sm"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Search size={14} className="text-gray-400" />
                                            <span>ค้นหาและเลือกโมเดลเพิ่มเติม...</span>
                                        </div>
                                        <ChevronDown size={15} className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                    </div>

                                    {isDropdownOpen && (
                                        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-2.5 space-y-2 animate-in fade-in">
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="ค้นหาชื่อโมเดล..."
                                                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                                autoFocus
                                            />

                                            <div className="max-h-48 overflow-y-auto space-y-1 divide-y divide-gray-50">
                                                {filteredModels.map((m, mIdx) => {
                                                    const isSelected = selectedModels.some(
                                                        sm => sm.provider === m.provider && sm.model === m.model
                                                    );
                                                    return (
                                                        <div
                                                            key={mIdx}
                                                            onClick={() => toggleModelSelection(m)}
                                                            className={`p-2 rounded-lg cursor-pointer transition flex items-center justify-between text-xs ${isSelected ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50'}`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-3.5 h-3.5 rounded flex items-center justify-center ${isSelected ? 'bg-indigo-600 text-white' : 'border border-gray-300'}`}>
                                                                    {isSelected && <Check size={10} />}
                                                                </div>
                                                                <span className="font-semibold text-gray-800">{m.label}</span>
                                                            </div>
                                                            <span className="text-[10px] text-gray-400 uppercase font-mono">{m.provider}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setSessionModalExam(null)}
                                className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition"
                            >
                                ยกเลิก
                            </button>

                            <button
                                type="button"
                                onClick={handleLaunchSession}
                                disabled={launchingSession}
                                className="px-6 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition shadow flex items-center gap-1.5"
                            >
                                {launchingSession ? 'กำลังเปิดห้องสอบ...' : <><Play size={14} /> เปิดห้องสอบและเริ่มนับเวลา</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestAIExam;
