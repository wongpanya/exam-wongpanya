import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../config/api';
import {
    Upload, FileText, Trash2, Sparkles, Download,
    ChevronDown, ChevronUp, Edit3, Check, X, AlertCircle,
    BookOpen, Brain, Lightbulb, Search, Star, Layers,
    CheckCircle, FileSpreadsheet, File
} from 'lucide-react';

const BLOOM_LEVELS = [
    { value: 'remember', label: 'จำ (Remember)', icon: <BookOpen size={16} />, color: 'bg-blue-100 text-blue-700 border-blue-300', description: 'ทดสอบการจำ ระบุ เรียกคืนข้อมูล' },
    { value: 'understand', label: 'เข้าใจ (Understand)', icon: <Lightbulb size={16} />, color: 'bg-green-100 text-green-700 border-green-300', description: 'ทดสอบการอธิบาย สรุป ตีความ' },
    { value: 'apply', label: 'ประยุกต์ (Apply)', icon: <Layers size={16} />, color: 'bg-yellow-100 text-yellow-700 border-yellow-300', description: 'ทดสอบการนำไปใช้ในสถานการณ์ใหม่' },
    { value: 'analyze', label: 'วิเคราะห์ (Analyze)', icon: <Search size={16} />, color: 'bg-orange-100 text-orange-700 border-orange-300', description: 'ทดสอบการแยกแยะ เปรียบเทียบ' },
    { value: 'evaluate', label: 'ประเมิน (Evaluate)', icon: <Star size={16} />, color: 'bg-red-100 text-red-700 border-red-300', description: 'ทดสอบการตัดสิน ให้เหตุผล' },
    { value: 'create', label: 'สร้างสรรค์ (Create)', icon: <Brain size={16} />, color: 'bg-purple-100 text-purple-700 border-purple-300', description: 'ทดสอบการออกแบบ สร้างสิ่งใหม่' },
];

const FILE_ICONS = {
    'application/pdf': <FileText size={20} className="text-red-500" />,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': <File size={20} className="text-blue-500" />,
    'text/csv': <FileSpreadsheet size={20} className="text-green-500" />,
};

const getFileIcon = (file) => {
    return FILE_ICONS[file.type] || <File size={20} className="text-gray-500" />;
};

const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
};

const AIExamGenerator = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // Upload state
    const [files, setFiles] = useState([]);
    const [dragOver, setDragOver] = useState(false);

    // Settings state
    const [numQuestions, setNumQuestions] = useState(5);
    const [bloomLevel, setBloomLevel] = useState('understand');
    const [questionType, setQuestionType] = useState('radio');
    const [language, setLanguage] = useState('th');

    // Generation state
    const [generating, setGenerating] = useState(false);
    const [generatedQuestions, setGeneratedQuestions] = useState([]);
    const [metadata, setMetadata] = useState(null);
    const [error, setError] = useState('');

    // Editing state
    const [editingIndex, setEditingIndex] = useState(null);
    const [editForm, setEditForm] = useState(null);

    // File handling
    const ACCEPTED_TYPES = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/csv',
        'application/vnd.ms-excel',
    ];
    const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.csv'];

    const isValidFile = (file) => {
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        return ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.includes(ext);
    };

    const handleFileSelect = useCallback((newFiles) => {
        const validFiles = Array.from(newFiles).filter(isValidFile);
        if (validFiles.length !== newFiles.length) {
            setError('บางไฟล์ไม่รองรับ — รองรับเฉพาะ PDF, DOCX, CSV');
        }
        setFiles(prev => {
            const combined = [...prev, ...validFiles];
            return combined.slice(0, 10); // max 10 files
        });
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        handleFileSelect(e.dataTransfer.files);
    }, [handleFileSelect]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragOver(false);
    }, []);

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Generate questions
    const handleGenerate = async () => {
        if (files.length === 0) {
            setError('กรุณาอัปโหลดไฟล์อย่างน้อย 1 ไฟล์');
            return;
        }

        setError('');
        setGenerating(true);
        setGeneratedQuestions([]);
        setMetadata(null);

        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const formData = new FormData();

            files.forEach(file => {
                formData.append('files', file);
            });
            formData.append('numQuestions', numQuestions);
            formData.append('bloomLevel', bloomLevel);
            formData.append('language', language);
            formData.append('questionType', questionType);

            const { data } = await api.post('/ai-generator/generate', formData, {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                    'Content-Type': 'multipart/form-data',
                },
                timeout: 120000, // 2 min timeout for AI processing
            });

            setGeneratedQuestions(data.questions);
            setMetadata(data.metadata);
        } catch (err) {
            setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการสร้างข้อสอบ กรุณาลองใหม่');
        } finally {
            setGenerating(false);
        }
    };

    // Question editing
    const startEdit = (index) => {
        setEditingIndex(index);
        setEditForm(JSON.parse(JSON.stringify(generatedQuestions[index])));
    };

    const cancelEdit = () => {
        setEditingIndex(null);
        setEditForm(null);
    };

    const saveEdit = () => {
        if (editingIndex === null || !editForm) return;
        const updated = [...generatedQuestions];
        updated[editingIndex] = editForm;
        setGeneratedQuestions(updated);
        setEditingIndex(null);
        setEditForm(null);
    };

    const deleteQuestion = (index) => {
        setGeneratedQuestions(prev => prev.filter((_, i) => i !== index));
    };

    // Import to CreateExam
    const handleImport = () => {
        // Strip AI-specific fields and prepare for exam format
        const examQuestions = generatedQuestions.map((q, i) => ({
            type: q.type || 'radio',
            prompt: q.prompt,
            choices: q.choices || [],
            correctAnswer: q.correctAnswer,
            points: q.points || 1,
        }));

        navigate('/teacher/exams/create', {
            state: { importedQuestions: examQuestions },
        });
    };

    const selectedBloom = BLOOM_LEVELS.find(b => b.value === bloomLevel);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                        <Sparkles size={22} className="text-white" />
                    </div>
                    AI สร้างข้อสอบ
                </h1>
                <p className="text-gray-500 mt-1">อัปโหลดเอกสารการสอน ให้ AI ช่วยร่างข้อสอบจากเนื้อหาจริง</p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
                    <p className="text-red-600 text-sm">{error}</p>
                    <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Panel — Upload & Settings */}
                <div className="space-y-4">
                    {/* File Upload Zone */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Upload size={20} className="text-indigo-500" />
                            อัปโหลดเอกสาร
                        </h2>

                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${dragOver
                                    ? 'border-indigo-500 bg-indigo-50 scale-[1.01]'
                                    : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                                }`}
                        >
                            <div className="flex flex-col items-center gap-2">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${dragOver ? 'bg-indigo-100' : 'bg-gray-100'
                                    }`}>
                                    <Upload size={24} className={dragOver ? 'text-indigo-600' : 'text-gray-400'} />
                                </div>
                                <p className="text-sm font-medium text-gray-700">
                                    ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือก
                                </p>
                                <p className="text-xs text-gray-400">
                                    PDF, DOCX, CSV — สูงสุด 10 ไฟล์ (ไม่เกิน 10 MB/ไฟล์)
                                </p>
                            </div>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.docx,.doc,.csv"
                            onChange={(e) => handleFileSelect(e.target.files)}
                            className="hidden"
                        />

                        {/* File List */}
                        {files.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {files.map((file, index) => (
                                    <div key={index} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100 group">
                                        {getFileIcon(file)}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                                            <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                                            className="p-1.5 text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Settings */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Layers size={20} className="text-indigo-500" />
                            ตั้งค่าการสร้างข้อสอบ
                        </h2>

                        {/* Bloom's Taxonomy */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                ระดับ Bloom's Taxonomy
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {BLOOM_LEVELS.map((level) => (
                                    <button
                                        key={level.value}
                                        type="button"
                                        onClick={() => setBloomLevel(level.value)}
                                        className={`p-2.5 rounded-lg border-2 text-left transition-all text-xs ${bloomLevel === level.value
                                                ? `${level.color} border-current shadow-sm`
                                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center gap-1.5 font-medium">
                                            {level.icon}
                                            {level.label.split(' ')[0]}
                                        </div>
                                        <p className="mt-1 text-[10px] opacity-70 leading-tight">{level.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Number of Questions */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                จำนวนข้อ: <span className="text-indigo-600 font-bold">{numQuestions}</span>
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="30"
                                value={numQuestions}
                                onChange={(e) => setNumQuestions(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                                <span>1</span>
                                <span>15</span>
                                <span>30</span>
                            </div>
                        </div>

                        {/* Question Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">ประเภทข้อสอบ</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setQuestionType('radio')}
                                    className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${questionType === 'radio'
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    ปรนัย (Multiple Choice)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setQuestionType('text')}
                                    className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${questionType === 'text'
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    อัตนัย (Short Answer)
                                </button>
                            </div>
                        </div>

                        {/* Language */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">ภาษาข้อสอบ</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setLanguage('th')}
                                    className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${language === 'th'
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    🇹🇭 ภาษาไทย
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLanguage('en')}
                                    className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${language === 'en'
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    🇺🇸 English
                                </button>
                            </div>
                        </div>

                        {/* Generate Button */}
                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={generating || files.length === 0}
                            className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                        >
                            {generating ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    AI กำลังสร้างข้อสอบ...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={20} />
                                    สร้างข้อสอบ ({numQuestions} ข้อ)
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Right Panel — Generated Questions */}
                <div className="space-y-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <FileText size={20} className="text-indigo-500" />
                                ข้อสอบที่สร้าง
                                {generatedQuestions.length > 0 && (
                                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                                        {generatedQuestions.length} ข้อ
                                    </span>
                                )}
                            </h2>
                            {generatedQuestions.length > 0 && (
                                <button
                                    onClick={handleImport}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition shadow-sm"
                                >
                                    <Download size={16} />
                                    นำเข้าข้อสอบ
                                </button>
                            )}
                        </div>

                        {/* Metadata */}
                        {metadata && (
                            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs text-gray-500 space-y-1">
                                <p>📄 ไฟล์ที่ประมวลผล: {metadata.filesProcessed?.map(f => f.filename).join(', ')}</p>
                                <p>🧠 Bloom's Level: {selectedBloom?.label}</p>
                                {metadata.tokensUsed && (
                                    <p>⚡ Tokens: {metadata.tokensUsed.total_tokens?.toLocaleString()}</p>
                                )}
                            </div>
                        )}

                        {/* Empty State */}
                        {!generating && generatedQuestions.length === 0 && (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                    <Sparkles size={28} className="text-gray-300" />
                                </div>
                                <p className="text-gray-400 text-sm">
                                    อัปโหลดไฟล์และกด "สร้างข้อสอบ"<br />
                                    AI จะร่างข้อสอบจากเนื้อหาให้คุณ
                                </p>
                            </div>
                        )}

                        {/* Loading State */}
                        {generating && (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                                    <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                </div>
                                <p className="text-indigo-600 text-sm font-medium mb-1">AI กำลังวิเคราะห์เอกสาร...</p>
                                <p className="text-gray-400 text-xs">อาจใช้เวลา 30-60 วินาที ขึ้นอยู่กับปริมาณเนื้อหา</p>
                            </div>
                        )}

                        {/* Question Cards */}
                        <div className="space-y-3">
                            {generatedQuestions.map((q, qIndex) => (
                                <div key={qIndex} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                                    {editingIndex === qIndex ? (
                                        /* Edit Mode */
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-indigo-600">แก้ไขข้อ {qIndex + 1}</span>
                                                <div className="flex gap-1">
                                                    <button onClick={saveEdit} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg">
                                                        <Check size={16} />
                                                    </button>
                                                    <button onClick={cancelEdit} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg">
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            <textarea
                                                value={editForm.prompt}
                                                onChange={(e) => setEditForm({ ...editForm, prompt: e.target.value })}
                                                rows={3}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                                            />
                                            {editForm.choices?.length > 0 && (
                                                <div className="space-y-2">
                                                    {editForm.choices.map((c, cIdx) => (
                                                        <div key={cIdx} className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditForm({ ...editForm, correctAnswer: c.value })}
                                                                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition ${editForm.correctAnswer === c.value
                                                                        ? 'bg-green-500 text-white'
                                                                        : 'bg-gray-200 text-gray-500'
                                                                    }`}
                                                            >
                                                                {c.value.toUpperCase()}
                                                            </button>
                                                            <input
                                                                type="text"
                                                                value={c.label}
                                                                onChange={(e) => {
                                                                    const updatedChoices = [...editForm.choices];
                                                                    updatedChoices[cIdx] = { ...c, label: e.target.value };
                                                                    setEditForm({ ...editForm, choices: updatedChoices });
                                                                }}
                                                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* View Mode */
                                        <div>
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">ข้อ {qIndex + 1}</span>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => startEdit(qIndex)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
                                                        <Edit3 size={14} />
                                                    </button>
                                                    <button onClick={() => deleteQuestion(qIndex)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-800 mb-2 leading-relaxed">{q.prompt}</p>

                                            {/* Choices */}
                                            {q.choices?.length > 0 && (
                                                <div className="space-y-1.5 mb-3">
                                                    {q.choices.map((c, cIdx) => (
                                                        <div
                                                            key={cIdx}
                                                            className={`flex items-center gap-2 p-2 rounded-lg text-sm ${q.correctAnswer === c.value
                                                                    ? 'bg-green-50 border border-green-200'
                                                                    : 'bg-gray-50 border border-gray-100'
                                                                }`}
                                                        >
                                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${q.correctAnswer === c.value
                                                                    ? 'bg-green-500 text-white'
                                                                    : 'bg-gray-200 text-gray-500'
                                                                }`}>
                                                                {q.correctAnswer === c.value ? <CheckCircle size={12} /> : c.value.toUpperCase()}
                                                            </span>
                                                            <span className={q.correctAnswer === c.value ? 'text-green-700 font-medium' : 'text-gray-600'}>
                                                                {c.label}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Short answer */}
                                            {(!q.choices || q.choices.length === 0) && q.correctAnswer && (
                                                <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg text-sm">
                                                    <span className="text-green-600 font-medium">คำตอบ: </span>
                                                    <span className="text-green-800">{q.correctAnswer}</span>
                                                </div>
                                            )}

                                            {/* Source Badge */}
                                            {q.source && (
                                                <div className="flex items-center gap-1.5 mt-2">
                                                    <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                        📎 {q.source}
                                                    </span>
                                                    {q.bloomLevel && (
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${BLOOM_LEVELS.find(b => b.value === q.bloomLevel)?.color || 'bg-gray-100 text-gray-600 border-gray-300'
                                                            }`}>
                                                            {BLOOM_LEVELS.find(b => b.value === q.bloomLevel)?.label.split(' ')[0] || q.bloomLevel}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Bottom Import Button (when many questions) */}
                        {generatedQuestions.length > 3 && (
                            <button
                                onClick={handleImport}
                                className="w-full mt-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition shadow-sm"
                            >
                                <Download size={18} />
                                นำเข้าทั้ง {generatedQuestions.length} ข้อไปสร้างข้อสอบ
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIExamGenerator;
