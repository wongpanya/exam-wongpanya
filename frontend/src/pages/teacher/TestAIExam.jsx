import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../config/api';
import { QRCodeSVG } from 'qrcode.react';
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
    ChevronDown,
    Search,
    RefreshCw,
    Check,
    X,
    ExternalLink,
    Filter,
    Users,
    QrCode,
    Share2,
    Radio,
    History,
    CheckCheck,
    BarChart3
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

const TestAIExam = () => {
    const navigate = useNavigate();

    // Active Step: 1: 'builder', 2: 'models', 3: 'arena' (Simulate / Live Session)
    const [step, setStep] = useState(1);
    const [providerSettings, setProviderSettings] = useState({ primary: 'gemini', fallbacks: [], providers: [] });
    const [questions, setQuestions] = useState(PRESET_EXAMS[0].questions);
    const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
    const [examTitle, setExamTitle] = useState('ห้องสอบจำลองทดสอบโมเดล AI');
    
    // Model Selection State
    const [selectedModels, setSelectedModels] = useState([
        { provider: 'gemini', model: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
        { provider: 'gemini', model: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    ]);
    
    // Searchable Dropdown States
    const [searchQuery, setSearchQuery] = useState('');
    const [providerFilter, setProviderFilter] = useState('all');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const dropdownRef = useRef(null);

    // Custom Model Input
    const [customModel, setCustomModel] = useState({ provider: 'gemini', model: '', label: '' });

    // Teacher Instant Simulation
    const [studentAnswer, setStudentAnswer] = useState(
        PRESET_EXAMS[0].questions[0].sampleAnswers?.excellent || ''
    );
    const [running, setRunning] = useState(false);
    const [benchmarkData, setBenchmarkData] = useState(null);
    const [error, setError] = useState('');

    // Live Student Session States
    const [activeSession, setActiveSession] = useState(null);
    const [creatingSession, setCreatingSession] = useState(false);
    const [sessionResults, setSessionResults] = useState(null);
    const [loadingResults, setLoadingResults] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedPin, setCopiedPin] = useState(false);
    
    // Past Sessions Drawer / Modal
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [pastSessions, setPastSessions] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Fetch settings on mount
    const fetchSettings = async () => {
        try {
            const { data } = await api.get('/grading/provider-settings');
            setProviderSettings(data);
        } catch (err) {
            console.error('Failed to load provider settings:', err);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

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

    // Refresh model catalog from API
    const handleRefreshModels = async (e) => {
        e?.stopPropagation();
        setRefreshing(true);
        try {
            const providersToRefresh = providerFilter === 'all'
                ? ['gemini', 'openrouter']
                : [providerFilter];

            for (const p of providersToRefresh) {
                try {
                    await api.post(`/grading/provider-settings/${p}/refresh-models`);
                } catch (err) {
                    console.warn(`Could not refresh models for ${p}:`, err.message);
                }
            }
            await fetchSettings();
        } catch (err) {
            console.error('Refresh models failed:', err);
        } finally {
            setRefreshing(false);
        }
    };

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

    const currentQuestion = questions[selectedQuestionIndex] || questions[0];

    const handleSelectPreset = (preset) => {
        setQuestions(preset.questions);
        setSelectedQuestionIndex(0);
        setExamTitle(preset.title);
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

    const applyModelPreset = (preset) => {
        setSelectedModels(preset.models);
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

    // Run instant simulation
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
        } catch (err) {
            console.error('Benchmark error:', err);
            setError(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการรัน Benchmark');
        } finally {
            setRunning(false);
        }
    };

    // Create Live Student Test Session
    const handleCreateLiveSession = async () => {
        if (selectedModels.length === 0) {
            alert('กรุณาเลือกโมเดล AI อย่างน้อย 1 ตัว');
            return;
        }

        setCreatingSession(true);
        setError('');

        try {
            const { data } = await api.post('/grading/test-sessions', {
                title: examTitle || 'ห้องสอบจำลองทดสอบโมเดล AI',
                questions,
                modelsToCompare: selectedModels,
                durationMin: 30,
            });

            setActiveSession(data.session);
            fetchLiveResults(data.session._id);
        } catch (err) {
            console.error('Create test session failed:', err);
            setError(err.response?.data?.message || 'ไม่สามารถเปิดห้องสอบจำลองได้');
        } finally {
            setCreatingSession(false);
        }
    };

    // Fetch Live Results for active session
    const fetchLiveResults = async (sessionId) => {
        if (!sessionId) return;
        setLoadingResults(true);
        try {
            const { data } = await api.get(`/grading/test-sessions/${sessionId}/results`);
            setSessionResults(data);
        } catch (err) {
            console.error('Fetch session results failed:', err);
        } finally {
            setLoadingResults(false);
        }
    };

    // Poll live results if session is active
    useEffect(() => {
        if (!activeSession?._id) return;
        const interval = setInterval(() => {
            fetchLiveResults(activeSession._id);
        }, 5000);
        return () => clearInterval(interval);
    }, [activeSession]);

    const handleCopyLink = () => {
        if (!activeSession?._id) return;
        const link = `${window.location.origin}/student/test-exam/${activeSession._id}`;
        navigator.clipboard.writeText(link);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const handleCopyPin = () => {
        if (!activeSession?.shortCode) return;
        navigator.clipboard.writeText(activeSession.shortCode);
        setCopiedPin(true);
        setTimeout(() => setCopiedPin(false), 2000);
    };

    const handleOpenHistory = async () => {
        setShowHistoryModal(true);
        setLoadingHistory(true);
        try {
            const { data } = await api.get('/grading/test-sessions');
            setPastSessions(data);
        } catch (err) {
            console.error('Load past sessions failed:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleSelectPastSession = (session) => {
        setActiveSession(session);
        setQuestions(session.questions || []);
        setSelectedModels(session.modelsToCompare || []);
        setShowHistoryModal(false);
        setStep(3);
        fetchLiveResults(session._id);
    };

    const exportToRealExam = () => {
        navigate('/teacher/exams/create', {
            state: {
                importedQuestions: questions
            }
        });
    };

    const liveStudentUrl = activeSession?._id
        ? `${window.location.origin}/student/test-exam/${activeSession._id}`
        : '';

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Top Banner Header */}
            <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide uppercase text-indigo-100">
                            <FlaskConical size={14} className="text-yellow-300" />
                            AI Arena & Student Test Session Sandbox
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                            ห้องทดลองข้อสอบ & เปรียบเทียบโมเดล AI
                        </h1>
                        <p className="text-indigo-100 text-sm max-w-2xl">
                            สร้างข้อสอบจำลอง เลือกโมเดล AI หลายตัว เปิดลิงก์ให้นักเรียนเข้าสอบจริง และจัดเก็บผลเปรียบเทียบความแม่นยำและความเร็วของแต่ละโมเดลลงฐานข้อมูล
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <button
                            type="button"
                            onClick={handleOpenHistory}
                            className="px-3.5 py-2 text-xs font-semibold bg-white/15 hover:bg-white/25 text-white rounded-xl transition flex items-center gap-1.5 backdrop-blur-md"
                        >
                            <History size={15} /> ประวัติห้องสอบจำลอง
                        </button>
                        <button
                            type="button"
                            onClick={exportToRealExam}
                            className="px-4 py-2 text-xs font-semibold bg-white text-indigo-900 hover:bg-indigo-50 rounded-xl transition shadow flex items-center gap-1.5"
                            title="นำข้อสอบชุดนี้ไปเปิดใช้ในระบบจริง"
                        >
                            <ExternalLink size={15} /> นำไปสร้างข้อสอบจริง
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
                        2. เลือกโมเดล AI ({selectedModels.length})
                    </button>
                    <ChevronRight size={14} className="text-indigo-200" />
                    <button
                        type="button"
                        onClick={() => setStep(3)}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${step === 3 ? 'bg-white text-indigo-900 shadow-sm font-bold' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                    >
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">3</span>
                        3. เปิดลิงก์ให้นักเรียนสอบ & ผลเปรียบเทียบ AI Arena
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
                            ถัดไป: เลือกโมเดล AI <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 2: Model Selection */}
            {step === 2 && (
                <div className="space-y-6">
                    {/* Searchable Multi-Model Selector Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6 space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <Sparkles size={18} className="text-indigo-600" />
                                    เลือกโมเดล AI สำหรับประเมินเปรียบเทียบ (Multi-Model Selector)
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    ดึงรายการโมเดลทั้งหมดจาก API (Gemini, OpenRouter) พร้อมระบบค้นหาแบบ Real-time
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleRefreshModels}
                                    disabled={refreshing}
                                    className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition flex items-center gap-1.5"
                                    title="รีเฟรชโมเดลล่าสุดจาก API"
                                >
                                    <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                                    {refreshing ? 'กำลังโหลด...' : 'รีเฟรชจาก API'}
                                </button>
                                <span className="text-xs font-bold px-3 py-1 bg-indigo-600 text-white rounded-full">
                                    เลือก {selectedModels.length} / 8 โมเดล
                                </span>
                            </div>
                        </div>

                        {/* Selected Models Chips Display */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                                <CheckCircle2 size={14} className="text-indigo-600" />
                                โมเดลที่เลือกจะเข้าร่วมการทดสอบใน Arena ({selectedModels.length}):
                            </label>
                            <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl min-h-[50px]">
                                {selectedModels.length === 0 ? (
                                    <span className="text-xs text-gray-400">ยังไม่ได้เลือกโมเดล (กรุณาเลือกอย่างน้อย 1 โมเดลจากเมนูด้านล่าง)</span>
                                ) : (
                                    selectedModels.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-xs font-medium text-gray-800 shadow-sm animate-in fade-in"
                                        >
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${item.provider === 'gemini' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                {item.provider}
                                            </span>
                                            <span className="font-semibold">{item.label}</span>
                                            <button
                                                type="button"
                                                onClick={() => toggleModelSelection(item)}
                                                className="p-0.5 text-gray-400 hover:text-red-500 transition rounded"
                                                title="นำโมเดลนี้ออก"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Quick Presets Buttons */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-xs font-semibold text-gray-500">ชุดเปรียบเทียบด่วน:</span>
                            {MODEL_PRESETS.map((preset, pIdx) => (
                                <button
                                    key={pIdx}
                                    type="button"
                                    onClick={() => applyModelPreset(preset)}
                                    className="px-2.5 py-1 text-xs font-medium bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-gray-200 rounded-lg transition"
                                >
                                    {preset.name}
                                </button>
                            ))}
                        </div>

                        {/* Searchable Dropdown Container */}
                        <div className="relative" ref={dropdownRef}>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                ค้นหาและเลือกโมเดลจากรายการทั้งหมด (Search & Select Models)
                            </label>

                            {/* Dropdown Trigger Box */}
                            <div
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className={`w-full px-4 py-2.5 bg-white border rounded-xl flex items-center justify-between cursor-pointer transition shadow-sm ${isDropdownOpen ? 'ring-2 ring-indigo-500 border-transparent' : 'border-gray-300 hover:border-indigo-400'}`}
                            >
                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                    <Search size={16} className="text-gray-400" />
                                    <span>คลิกเพื่อค้นหาและเลือกโมเดลเพิ่มเติม (มีทั้งหมด {allAvailableModels.length} โมเดลในระบบ)</span>
                                </div>
                                <ChevronDown size={18} className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>

                            {/* Searchable Popover Menu */}
                            {isDropdownOpen && (
                                <div className="absolute z-30 left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 space-y-3 animate-in fade-in slide-in-from-top-2">
                                    {/* Search input & Provider Filter Tabs */}
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <div className="relative flex-1">
                                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="พิมพ์ชื่อโมเดล เช่น claude, flash, gpt, deepseek, pro..."
                                                className="w-full pl-9 pr-8 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                                autoFocus
                                            />
                                            {searchQuery && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSearchQuery('')}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex items-center bg-gray-100 p-1 rounded-lg shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setProviderFilter('all')}
                                                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${providerFilter === 'all' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                            >
                                                ทั้งหมด ({allAvailableModels.length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setProviderFilter('gemini')}
                                                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${providerFilter === 'gemini' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                            >
                                                Gemini
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setProviderFilter('openrouter')}
                                                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${providerFilter === 'openrouter' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                            >
                                                OpenRouter
                                            </button>
                                        </div>
                                    </div>

                                    {/* Models List Scrollable */}
                                    <div className="max-h-72 overflow-y-auto space-y-1 pr-1 divide-y divide-gray-50">
                                        {filteredModels.length === 0 ? (
                                            <div className="p-6 text-center text-xs text-gray-500">
                                                ไม่พบโมเดลที่ตรงกับคำค้นหา "{searchQuery}"
                                            </div>
                                        ) : (
                                            filteredModels.map((item, mIdx) => {
                                                const isSelected = selectedModels.some(
                                                    m => m.provider === item.provider && m.model === item.model
                                                );
                                                return (
                                                    <div
                                                        key={mIdx}
                                                        onClick={() => toggleModelSelection(item)}
                                                        className={`p-2.5 rounded-xl cursor-pointer transition flex items-center justify-between gap-3 ${isSelected ? 'bg-indigo-50/70 border border-indigo-200' : 'hover:bg-gray-50'}`}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition ${isSelected ? 'bg-indigo-600 text-white' : 'border border-gray-300'}`}>
                                                                {isSelected && <Check size={11} />}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${item.provider === 'gemini' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                                                        {item.provider}
                                                                    </span>
                                                                    <span className="font-semibold text-xs text-gray-900 truncate">{item.label}</span>
                                                                    {item.tag && (
                                                                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{item.tag}</span>
                                                                    )}
                                                                </div>
                                                                <div className="text-[11px] text-gray-400 font-mono truncate">{item.model}</div>
                                                            </div>
                                                        </div>

                                                        {item.contextLength && (
                                                            <span className="text-[10px] text-gray-400 shrink-0 font-mono">
                                                                {(item.contextLength / 1000).toFixed(0)}k ctx
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                        <span>เลือกได้สูงสุด 8 โมเดล</span>
                                        <button
                                            type="button"
                                            onClick={() => setIsDropdownOpen(false)}
                                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition"
                                        >
                                            เสร็จสิ้น ({selectedModels.length})
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Custom Model Input */}
                        <div className="pt-2 border-t border-gray-100">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                หรือระบุ Custom Model Identifier:
                            </label>
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
                            onClick={() => setStep(3)}
                            className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow flex items-center gap-2"
                        >
                            ถัดไป: เปิดห้องสอบ & Arena <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: Arena Dashboard (Live Student Session + Teacher Simulation) */}
            {step === 3 && (
                <div className="space-y-6">
                    {/* SECTION 1: Live Student Test Session Link Generator */}
                    <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 p-6 space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                            <div>
                                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                                    <Radio size={13} className="text-indigo-600 animate-pulse" />
                                    Live Student Testing Arena
                                </div>
                                <h2 className="text-lg font-bold text-gray-900 mt-1">
                                    เปิดห้องสอบจำลอง & สร้างลิงก์สำหรับนักเรียน
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    ให้นักเรียนเข้าสอบผ่านลิงก์หรือรหัส PIN ระบบจะรันโมเดล AI ทั้ง {selectedModels.length} ตัวเพื่อตรวจข้อสอบและเก็บผลเปรียบเทียบในฐานข้อมูล
                                </p>
                            </div>

                            {!activeSession ? (
                                <button
                                    type="button"
                                    onClick={handleCreateLiveSession}
                                    disabled={creatingSession}
                                    className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md flex items-center gap-2 shrink-0"
                                >
                                    {creatingSession ? 'กำลังสร้างห้องสอบ...' : <><Share2 size={16} /> เปิดห้องสอบ & สร้างลิงก์สอบ</>}
                                </button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                                        ห้องสอบกำลังเปิดอยู่ (Active)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => fetchLiveResults(activeSession._id)}
                                        disabled={loadingResults}
                                        className="p-2 text-gray-500 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 rounded-xl transition"
                                        title="รีเฟรชผลล่าสุด"
                                    >
                                        <RefreshCw size={15} className={loadingResults ? 'animate-spin' : ''} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Active Session Info Box */}
                        {activeSession && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                {/* Direct Link & PIN */}
                                <div className="md:col-span-2 space-y-3">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600">Direct Link สำหรับนักเรียนเข้าสอบ:</label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <input
                                                type="text"
                                                readOnly
                                                value={liveStudentUrl}
                                                className="flex-1 px-3 py-2 text-xs bg-white border border-indigo-200 rounded-xl text-indigo-900 font-mono select-all outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleCopyLink}
                                                className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shrink-0 flex items-center gap-1"
                                            >
                                                {copiedLink ? <CheckCheck size={14} /> : <Copy size={14} />}
                                                {copiedLink ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div>
                                            <span className="text-xs text-gray-500">รหัส PIN ห้องสอบ:</span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-2xl font-black font-mono text-indigo-700 tracking-wider">
                                                    {activeSession.shortCode}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={handleCopyPin}
                                                    className="p-1 text-gray-400 hover:text-indigo-600 transition"
                                                    title="คัดลอก PIN"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="border-l border-indigo-200 pl-4">
                                            <span className="text-xs text-gray-500">ส่งคำตอบแล้ว:</span>
                                            <div className="text-xl font-bold text-gray-900 mt-0.5 flex items-center gap-1.5">
                                                <Users size={18} className="text-indigo-600" />
                                                {sessionResults?.attempts?.length ?? 0} คน
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* QR Code Box */}
                                <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-indigo-100 shadow-sm">
                                    <QRCodeSVG value={liveStudentUrl} size={110} level="M" />
                                    <span className="text-[10px] font-medium text-gray-500 mt-2">สแกน QR เพื่อเข้าสอบ</span>
                                </div>
                            </div>
                        )}

                        {/* Multi-Student Aggregated Model Benchmark Results */}
                        {sessionResults?.aggregateInsights && sessionResults.attempts?.length > 0 && (
                            <div className="space-y-4 pt-3 border-t border-gray-100">
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <BarChart3 size={16} className="text-indigo-600" />
                                    สรุปเปรียบเทียบโมเดลจากนักเรียนทุกคน ({sessionResults.attempts.length} คน)
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {sessionResults.aggregateInsights.modelSummaries?.map((mStat, sIdx) => (
                                        <div key={sIdx} className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded uppercase">
                                                    {mStat.provider}
                                                </span>
                                                <span className="text-[11px] text-gray-400 font-mono">
                                                    {mStat.averageLatencyMs} ms
                                                </span>
                                            </div>
                                            <div className="font-bold text-sm text-gray-900">{mStat.label}</div>
                                            
                                            <div className="pt-2 border-t border-gray-100 flex justify-between items-end">
                                                <div>
                                                    <span className="text-[10px] text-gray-500">คะแนนเฉลี่ย:</span>
                                                    <div className="text-lg font-black text-indigo-600">
                                                        {mStat.averageScore} <span className="text-xs font-normal text-gray-400">/ {currentQuestion.points}</span>
                                                    </div>
                                                </div>
                                                <span className="text-[11px] text-emerald-600 font-medium">
                                                    สำเร็จ {mStat.successRate}%
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Student Submissions Table */}
                                <div className="pt-2">
                                    <h4 className="text-xs font-bold text-gray-700 mb-2">รายชื่อนักเรียนที่ส่งคำตอบ:</h4>
                                    <div className="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                                                <tr>
                                                    <th className="p-3">นักเรียน</th>
                                                    <th className="p-3">คำตอบที่ส่ง</th>
                                                    {selectedModels.map((m, mIdx) => (
                                                        <th key={mIdx} className="p-3">{m.label}</th>
                                                    ))}
                                                    <th className="p-3">เวลาส่ง</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {sessionResults.attempts.map((att, aIdx) => (
                                                    <tr key={aIdx} className="hover:bg-gray-50/70 transition">
                                                        <td className="p-3 font-semibold text-gray-900 whitespace-nowrap">
                                                            {att.studentInfo?.firstName || att.student?.firstName || 'นักเรียน'} {att.studentInfo?.lastName || att.student?.lastName || ''}
                                                            <div className="text-[11px] text-gray-400 font-normal">{att.studentInfo?.email || att.student?.email}</div>
                                                        </td>
                                                        <td className="p-3 text-gray-700 max-w-xs truncate" title={att.answers?.[0]?.selectedAnswer}>
                                                            {att.answers?.[0]?.selectedAnswer || '-'}
                                                        </td>
                                                        {selectedModels.map((m, mIdx) => {
                                                            const evalItem = att.evaluations?.[0]?.modelEvaluations?.find(
                                                                e => e.provider === m.provider && e.model === m.model
                                                            );
                                                            return (
                                                                <td key={mIdx} className="p-3 whitespace-nowrap">
                                                                    {evalItem ? (
                                                                        <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                                            {evalItem.totalScore} คะแนน
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-gray-400">-</span>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="p-3 text-gray-400 whitespace-nowrap text-[11px]">
                                                            {new Date(att.submittedAt).toLocaleTimeString('th-TH')}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SECTION 2: Instant Teacher Simulation Arena */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <Sparkles size={18} className="text-indigo-600" />
                                    จำลองคำตอบทดสอบทันที (Teacher 1-Click Simulation)
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    พิมพ์คำตอบทดสอบหรือเลือกจากตัวอย่างเพื่อดูผลลัพธ์จาก AI ทุกโมเดลได้ทันทีโดยไม่ต้องรอนักเรียน
                                </p>
                            </div>

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
                                rows={4}
                                value={studentAnswer}
                                onChange={(e) => setStudentAnswer(e.target.value)}
                                placeholder="พิมพ์คำตอบจำลอง..."
                                className="w-full p-3.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                            />
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={runBenchmark}
                                disabled={running}
                                className={`px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow transition flex items-center gap-2 ${running ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                            >
                                {running ? (
                                    <>
                                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                                        กำลังประมวลผล Arena ({selectedModels.length} โมเดล)...
                                    </>
                                ) : (
                                    <>
                                        <Play size={14} /> รันเปรียบเทียบโมเดลทันที (Run Simulation)
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Instant Simulation Results Display */}
                    {benchmarkData && (
                        <div className="space-y-4">
                            {/* Recommendations Banner */}
                            {benchmarkData.summary?.recommendations && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300/80 rounded-2xl p-5 shadow-sm space-y-2">
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

                                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-300/80 rounded-2xl p-5 shadow-sm space-y-2">
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

                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300/80 rounded-2xl p-5 shadow-sm space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full">
                                                <Scale size={14} className="text-blue-600" /> สมดุลแนะนำ
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

                            {/* Side-by-Side Arena Cards */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {benchmarkData.results.map((entry, idx) => {
                                    const isSuccess = entry.status === 'succeeded' && entry.result;
                                    return (
                                        <div
                                            key={idx}
                                            className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col justify-between"
                                        >
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

                                            <div className="p-4 space-y-3 flex-1 text-xs">
                                                {isSuccess ? (
                                                    <>
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
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal: Past Test Sessions */}
            {showHistoryModal && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                                <History size={18} className="text-indigo-600" />
                                ประวัติห้องสอบจำลองที่เคยเปิด
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowHistoryModal(false)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2">
                            {loadingHistory ? (
                                <div className="p-8 text-center text-xs text-gray-500">กำลังโหลดประวัติห้องสอบ...</div>
                            ) : pastSessions.length === 0 ? (
                                <div className="p-8 text-center text-xs text-gray-500">ยังไม่มีประวัติห้องสอบจำลองที่เคยเปิด</div>
                            ) : (
                                pastSessions.map((ps, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => handleSelectPastSession(ps)}
                                        className="p-4 rounded-xl border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50/40 cursor-pointer transition flex items-center justify-between gap-3"
                                    >
                                        <div className="space-y-1">
                                            <div className="font-bold text-sm text-gray-900">{ps.title}</div>
                                            <div className="text-xs text-gray-500 flex items-center gap-3">
                                                <span>PIN: <strong className="font-mono text-indigo-600">{ps.shortCode}</strong></span>
                                                <span>ส่งแล้ว {ps.submittedCount || 0} คน</span>
                                                <span>{new Date(ps.createdAt).toLocaleDateString('th-TH')}</span>
                                            </div>
                                        </div>

                                        <div className="text-indigo-600 text-xs font-semibold flex items-center gap-1">
                                            เปิดดูผล <ArrowRight size={14} />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestAIExam;
