import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    AlertCircle,
    ArrowLeft,
    BookOpen,
    Brain,
    CheckCircle2,
    Clock3,
    FileCheck2,
    Gauge,
    History as HistoryIcon,
    ListChecks,
    LoaderCircle,
    RefreshCw,
    RotateCcw,
    Save,
    Server,
    ShieldCheck,
    Sparkles,
    UserCheck,
    XCircle,
} from 'lucide-react';
import api from '../../config/api';

const STATUS_STYLES = {
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    processing: 'bg-blue-100 text-blue-800 border-blue-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    'needs-review': 'bg-orange-100 text-orange-800 border-orange-200',
    reviewed: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    failed: 'bg-red-100 text-red-800 border-red-200',
    succeeded: 'bg-green-100 text-green-800 border-green-200',
    unavailable: 'bg-gray-100 text-gray-700 border-gray-200',
};

const STATUS_LABELS = {
    pending: 'รอตรวจ',
    processing: 'กำลังตรวจ',
    completed: 'ตรวจแล้ว',
    'needs-review': 'รออาจารย์ตรวจ',
    reviewed: 'อาจารย์ตรวจแล้ว',
    failed: 'ตรวจไม่สำเร็จ',
    succeeded: 'สำเร็จ',
    unavailable: 'ไม่พร้อมใช้งาน',
};

const REVIEW_ACTION_LABELS = {
    confirmed: 'ยืนยันคะแนน AI',
    adjusted: 'ปรับคะแนน',
    'regrade-requested': 'ขอตรวจใหม่',
    'regrade-completed': 'ตรวจใหม่เสร็จแล้ว',
};

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

const formatScore = (value) => {
    if (!isFiniteNumber(value)) return '-';
    return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
};

const formatDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('th-TH', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
};

const formatLatency = (value) => {
    if (!isFiniteNumber(value)) return '-';
    if (value < 1000) return `${Math.round(value)} ms`;
    return `${(value / 1000).toFixed(2)} วินาที`;
};

const getErrorMessage = (error, fallback) => (
    error?.response?.data?.message || error?.message || fallback
);

const StatusBadge = ({ status }) => (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status] || STATUS_STYLES.unavailable}`}>
        {status === 'processing' && <LoaderCircle size={13} className="animate-spin" />}
        {status === 'failed' && <XCircle size={13} />}
        {['completed', 'reviewed', 'succeeded'].includes(status) && <CheckCircle2 size={13} />}
        {['pending', 'needs-review', 'unavailable'].includes(status) && <AlertCircle size={13} />}
        {STATUS_LABELS[status] || status || 'ไม่ทราบสถานะ'}
    </span>
);

const GradingReview = () => {
    const { id, attemptId, questionId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const sessionId = new URLSearchParams(location.search).get('sessionId');
    const backPath = `/teacher/exams/${id}/attempts${sessionId ? `?sessionId=${sessionId}` : ''}`;
    const gradingPath = `/grading/${encodeURIComponent(attemptId)}/questions/${encodeURIComponent(questionId)}`;

    const [pageData, setPageData] = useState(null);
    const [history, setHistory] = useState({ runs: [], reviews: [] });
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [historyError, setHistoryError] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    const [reviewAction, setReviewAction] = useState('confirm');
    const [adjustScore, setAdjustScore] = useState('');
    const [reviewReason, setReviewReason] = useState('');
    const [preferredProvider, setPreferredProvider] = useState('system');
    const [preferredModel, setPreferredModel] = useState('');
    const [providerSettings, setProviderSettings] = useState({ primary: 'gemini', fallbacks: [], providers: [] });
    const [savingReview, setSavingReview] = useState(false);
    const [regrading, setRegrading] = useState(false);
    const [formError, setFormError] = useState('');
    const [notice, setNotice] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        const fetchData = async () => {
            setLoading(true);
            setLoadError('');
            setHistoryError('');

            const [gradingResponse, historyResponse] = await Promise.allSettled([
                api.get(gradingPath, { signal: controller.signal }),
                api.get(`${gradingPath}/history`, { signal: controller.signal }),
            ]);

            if (controller.signal.aborted) return;

            if (gradingResponse.status === 'rejected') {
                setLoadError(getErrorMessage(gradingResponse.reason, 'ไม่สามารถโหลดผลการตรวจได้'));
                setLoading(false);
                return;
            }

            const nextPageData = gradingResponse.value.data;
            const nextResult = nextPageData?.result;
            setPageData(nextPageData);
            setAdjustScore(String(nextResult?.teacherScore ?? nextResult?.finalScore ?? nextResult?.aiScore ?? ''));

            if (historyResponse.status === 'fulfilled') {
                setHistory({
                    runs: historyResponse.value.data?.runs || [],
                    reviews: historyResponse.value.data?.reviews || [],
                });
            } else {
                setHistoryError(getErrorMessage(historyResponse.reason, 'ไม่สามารถโหลดประวัติได้'));
            }

            setLoading(false);
        };

        fetchData();
        return () => controller.abort();
    }, [gradingPath, refreshKey]);

    useEffect(() => {
        api.get('/grading/provider-settings')
            .then(({ data }) => {
                setProviderSettings(data);
                const primary = data.providers?.find(item => item.provider === data.primary);
                setPreferredModel(primary?.selectedModel || '');
            })
            .catch(() => {});
    }, []);

    const handleReview = async (event) => {
        event.preventDefault();
        setFormError('');
        setNotice('');

        const reason = reviewReason.trim();
        let body;

        if (reviewAction === 'adjust') {
            const numericScore = Number(adjustScore);
            const maxScore = pageData?.result?.maxScore;

            if (adjustScore.trim() === '' || !Number.isFinite(numericScore)) {
                setFormError('กรุณากรอกคะแนนที่ต้องการปรับ');
                return;
            }
            if (numericScore < 0 || (isFiniteNumber(maxScore) && numericScore > maxScore)) {
                setFormError(`คะแนนต้องอยู่ระหว่าง 0 ถึง ${formatScore(maxScore)}`);
                return;
            }
            if (!reason) {
                setFormError('กรุณาระบุเหตุผลในการปรับคะแนน');
                return;
            }

            body = { action: 'adjust', score: numericScore, reason };
        } else {
            body = { action: 'confirm', reason };
        }

        try {
            setSavingReview(true);
            await api.patch(`${gradingPath}/review`, body);
            setNotice(reviewAction === 'adjust' ? 'บันทึกคะแนนที่ปรับแล้ว' : 'ยืนยันคะแนน AI แล้ว');
            setReviewReason('');
            setRefreshKey((value) => value + 1);
        } catch (error) {
            setFormError(getErrorMessage(error, 'ไม่สามารถบันทึกการตรวจได้'));
        } finally {
            setSavingReview(false);
        }
    };

    const handleRegrade = async () => {
        setFormError('');
        setNotice('');

        try {
            setRegrading(true);
            const body = { preferredProvider, preferredModel };
            await api.post(`${gradingPath}/regrade`, body);
            setNotice('ตรวจคำตอบด้วย AI ใหม่เสร็จแล้ว กรุณาตรวจสอบผลล่าสุด');
            setRefreshKey((value) => value + 1);
        } catch (error) {
            setFormError(getErrorMessage(error, 'ไม่สามารถส่งตรวจใหม่ได้'));
        } finally {
            setRegrading(false);
        }
    };

    if (loading && !pageData) {
        return (
            <div className="flex min-h-64 items-center justify-center text-gray-500">
                <LoaderCircle size={28} className="mr-2 animate-spin text-indigo-600" />
                กำลังโหลดผลการตรวจ...
            </div>
        );
    }

    if (loadError || !pageData) {
        return (
            <div className="container mx-auto max-w-3xl px-4 py-8">
                <button
                    type="button"
                    onClick={() => navigate(backPath)}
                    className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-indigo-700"
                >
                    <ArrowLeft size={18} /> กลับไปรายการส่งคำตอบ
                </button>
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                    <XCircle size={36} className="mx-auto mb-3 text-red-500" />
                    <h1 className="text-lg font-semibold text-red-900">โหลดผลการตรวจไม่สำเร็จ</h1>
                    <p className="mt-1 text-sm text-red-700">{loadError || 'ไม่พบข้อมูลการตรวจคำตอบนี้'}</p>
                    <button
                        type="button"
                        onClick={() => setRefreshKey((value) => value + 1)}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                        <RefreshCw size={16} /> ลองใหม่
                    </button>
                </div>
            </div>
        );
    }

    const { result, attempt, exam, question, studentAnswer } = pageData;
    const aiGrading = question?.aiGrading || {};
    const groundTruths = aiGrading.groundTruths || [];
    const rubric = aiGrading.rubricCriteria || [];
    const configuredConcepts = aiGrading.keyConcepts || [];
    const criteria = result?.criteria || [];
    const detectedConcepts = result?.detectedConcepts || [];
    const missingConcepts = result?.missingConcepts || [];
    const runs = history.runs || [];
    const reviews = history.reviews || [];
    const student = attempt?.student || {};
    const studentName = [student.firstName, student.lastName].filter(Boolean).join(' ') || 'ไม่ระบุชื่อ';
    const selectedRun = result?.selectedRun && typeof result.selectedRun === 'object' ? result.selectedRun : null;
    const confidencePercent = isFiniteNumber(result?.confidence)
        ? Math.round(Math.min(1, Math.max(0, result.confidence)) * 100)
        : null;
    const totalTokens = [result?.inputTokens, result?.outputTokens].filter(isFiniteNumber).reduce((sum, value) => sum + value, 0);
    const canReview = isFiniteNumber(result?.aiScore) && result?.status !== 'processing';
    const busy = savingReview || regrading;
    const effectiveProvider = preferredProvider === 'system' ? providerSettings.primary : preferredProvider;
    const regradeProviderSetting = providerSettings.providers.find(item => item.provider === effectiveProvider);

    const handleRegradeProviderChange = (event) => {
        const provider = event.target.value;
        const effective = provider === 'system' ? providerSettings.primary : provider;
        const setting = providerSettings.providers.find(item => item.provider === effective);
        setPreferredProvider(provider);
        setPreferredModel(setting?.selectedModel || '');
    };

    return (
        <div className="container mx-auto max-w-7xl space-y-6 px-4 py-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <button
                        type="button"
                        onClick={() => navigate(backPath)}
                        className="mt-0.5 rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 hover:text-indigo-700"
                        aria-label="กลับไปรายการส่งคำตอบ"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-bold text-gray-900">ตรวจคำตอบอัตนัย</h1>
                            <StatusBadge status={result?.status} />
                        </div>
                        <p className="mt-1 truncate text-sm text-gray-500">
                            {exam?.title || 'ข้อสอบ'} · {studentName} · คำถาม {questionId}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setRefreshKey((value) => value + 1)}
                    disabled={loading || busy}
                    className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> อัปเดตข้อมูล
                </button>
            </header>

            {notice && (
                <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800" role="status">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                    <span>{notice}</span>
                </div>
            )}

            {result?.status === 'failed' && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="flex items-start gap-3">
                        <XCircle size={21} className="mt-0.5 shrink-0 text-red-600" />
                        <div>
                            <h2 className="font-semibold text-red-900">AI ตรวจคำตอบไม่สำเร็จ</h2>
                            <p className="mt-1 text-sm text-red-700">
                                {result.lastError?.message || 'Provider ทั้งหมดไม่สามารถคืนผลการตรวจที่ใช้งานได้ กรุณาตรวจสอบแล้วส่งตรวจใหม่'}
                            </p>
                            {result.lastError?.code && (
                                <p className="mt-2 font-mono text-xs text-red-600">รหัส: {result.lastError.code}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <main className="min-w-0 space-y-6">
                    <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                        <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
                            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                                <BookOpen size={19} className="text-indigo-600" /> คำถามและคำตอบนักศึกษา
                            </h2>
                        </div>
                        <div className="space-y-5 p-5 sm:p-6">
                            <div>
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">คำถาม</p>
                                    <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                                        {formatScore(result?.maxScore ?? question?.points)} คะแนน
                                    </span>
                                </div>
                                <div
                                    className="prose prose-sm max-w-none text-gray-900"
                                    dangerouslySetInnerHTML={{ __html: question?.prompt || '' }}
                                />
                            </div>
                            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-900">
                                    <UserCheck size={17} /> คำตอบนักศึกษา
                                </div>
                                <div className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-900">
                                    {studentAnswer || <span className="italic text-gray-500">ไม่ได้ส่งคำตอบ</span>}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                        <h2 className="mb-5 flex items-center gap-2 font-semibold text-gray-900">
                            <FileCheck2 size={19} className="text-indigo-600" /> ข้อมูลอ้างอิงในการตรวจ
                        </h2>

                        <div className="space-y-6">
                            <div>
                                <h3 className="mb-3 text-sm font-semibold text-gray-800">Ground Truth</h3>
                                {groundTruths.length > 0 ? (
                                    <div className="space-y-3">
                                        {groundTruths.map((truth, index) => (
                                            <div key={`${index}-${truth.slice(0, 20)}`} className="flex gap-3 rounded-lg border border-green-100 bg-green-50/60 p-3 text-sm leading-6 text-gray-800">
                                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">{index + 1}</span>
                                                <p className="whitespace-pre-wrap break-words">{truth}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">ไม่ได้กำหนดคำตอบอ้างอิง</p>
                                )}
                            </div>

                            <div>
                                <h3 className="mb-3 text-sm font-semibold text-gray-800">Rubric</h3>
                                {rubric.length > 0 ? (
                                    <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200">
                                        {rubric.map((item, index) => (
                                            <div key={item.rubricId || index} className="p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900">{index + 1}. {item.title}</p>
                                                        <p className="mt-1 text-sm leading-6 text-gray-600">{item.description}</p>
                                                    </div>
                                                    <span className="shrink-0 rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                                                        {formatScore(item.maxScore)} คะแนน
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">ไม่ได้กำหนดเกณฑ์การให้คะแนน</p>
                                )}
                            </div>

                            <div>
                                <h3 className="mb-3 text-sm font-semibold text-gray-800">Key Concepts ที่กำหนด</h3>
                                {configuredConcepts.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {configuredConcepts.map((concept, index) => (
                                            <span key={`${concept}-${index}`} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                                                {concept}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">ไม่ได้กำหนดประเด็นสำคัญ</p>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                        <div className="mb-5 flex items-center justify-between gap-3">
                            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                                <ListChecks size={19} className="text-indigo-600" /> ผลตามเกณฑ์รายข้อ
                            </h2>
                            <span className="text-sm font-semibold text-indigo-700">
                                {formatScore(result?.aiScore)} / {formatScore(result?.maxScore)} คะแนน
                            </span>
                        </div>

                        {criteria.length > 0 ? (
                            <div className="space-y-4">
                                {criteria.map((criterion, index) => {
                                    const definition = rubric.find((item) => item.rubricId === criterion.rubricId);
                                    return (
                                        <article key={criterion.rubricId || index} className="rounded-xl border border-gray-200 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">
                                                        {index + 1}. {definition?.title || criterion.rubricId}
                                                    </h3>
                                                    {definition?.description && (
                                                        <p className="mt-1 text-sm leading-6 text-gray-500">{definition.description}</p>
                                                    )}
                                                </div>
                                                <span className="shrink-0 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-700">
                                                    {formatScore(criterion.score)} / {formatScore(criterion.maxScore)}
                                                </span>
                                            </div>
                                            <div className="mt-4 rounded-lg bg-gray-50 p-3">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">เหตุผล</p>
                                                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-800">{criterion.reason || '-'}</p>
                                            </div>
                                            <div className="mt-3">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">หลักฐานจากคำตอบ</p>
                                                {criterion.evidence?.length > 0 ? (
                                                    <div className="mt-2 space-y-2">
                                                        {criterion.evidence.map((evidence, evidenceIndex) => (
                                                            <blockquote key={`${evidenceIndex}-${evidence.slice(0, 20)}`} className="border-l-4 border-blue-300 bg-blue-50 px-3 py-2 text-sm leading-6 text-blue-950">
                                                                “{evidence}”
                                                            </blockquote>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="mt-1 text-sm italic text-gray-500">ไม่พบหลักฐานที่อ้างอิง</p>
                                                )}
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                                ยังไม่มีผลคะแนนแยกตาม Rubric
                            </div>
                        )}
                    </section>

                    <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                        <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
                            <Brain size={19} className="text-indigo-600" /> การวิเคราะห์ประเด็นสำคัญ
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                                <h3 className="flex items-center gap-2 text-sm font-semibold text-green-900">
                                    <CheckCircle2 size={17} /> ประเด็นที่พบ
                                </h3>
                                {detectedConcepts.length > 0 ? (
                                    <ul className="mt-3 space-y-2 text-sm text-green-900">
                                        {detectedConcepts.map((concept, index) => (
                                            <li key={`${concept}-${index}`} className="flex gap-2">
                                                <span aria-hidden="true">•</span><span>{concept}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="mt-3 text-sm text-green-800/70">ไม่พบประเด็นที่ตรงกับเกณฑ์</p>
                                )}
                            </div>
                            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                                <h3 className="flex items-center gap-2 text-sm font-semibold text-red-900">
                                    <AlertCircle size={17} /> ประเด็นที่ขาด
                                </h3>
                                {missingConcepts.length > 0 ? (
                                    <ul className="mt-3 space-y-2 text-sm text-red-900">
                                        {missingConcepts.map((concept, index) => (
                                            <li key={`${concept}-${index}`} className="flex gap-2">
                                                <span aria-hidden="true">•</span><span>{concept}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="mt-3 text-sm text-red-800/70">ไม่พบประเด็นสำคัญที่ขาด</p>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                                <HistoryIcon size={19} className="text-indigo-600" /> ประวัติการตรวจและทบทวน
                            </h2>
                            <span className="text-xs text-gray-500">AI runs {runs.length} ครั้ง · การทบทวน {reviews.length} ครั้ง</span>
                        </div>

                        {historyError && (
                            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                {historyError}
                            </div>
                        )}

                        <div>
                            <h3 className="mb-3 text-sm font-semibold text-gray-800">AI grading runs</h3>
                            {runs.length > 0 ? (
                                <div className="space-y-3">
                                    {runs.map((run, index) => (
                                        <div key={run._id || `${run.provider}-${index}`} className="rounded-lg border border-gray-200 p-4">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-semibold text-gray-900">Run #{run.attemptNumber ?? index + 1}</span>
                                                        <StatusBadge status={run.status} />
                                                        {run.trigger && <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{run.trigger}</span>}
                                                    </div>
                                                    <p className="mt-2 text-sm text-gray-700">
                                                        <span className="font-medium">{run.provider || '-'}</span>
                                                        {run.model ? ` · ${run.model}` : ''}
                                                    </p>
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        Prompt {run.promptVersion || '-'} · {formatDateTime(run.createdAt || run.startedAt)}
                                                    </p>
                                                </div>
                                                <div className="text-left text-xs text-gray-500 sm:text-right">
                                                    <p>เวลา {formatLatency(run.latencyMs)}</p>
                                                    <p className="mt-1">Tokens {isFiniteNumber(run.inputTokens) ? run.inputTokens.toLocaleString() : '-'} / {isFiniteNumber(run.outputTokens) ? run.outputTokens.toLocaleString() : '-'}</p>
                                                </div>
                                            </div>
                                            {(run.errorMessage || run.errorCode) && (
                                                <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                                                    {run.errorCode && <span className="font-mono font-semibold">{run.errorCode}: </span>}
                                                    {run.errorMessage || 'Provider ไม่สามารถตรวจได้'}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">ยังไม่มีประวัติ AI run</p>
                            )}
                        </div>

                        <div className="mt-6 border-t border-gray-100 pt-6">
                            <h3 className="mb-3 text-sm font-semibold text-gray-800">ประวัติการทบทวนโดยอาจารย์</h3>
                            {reviews.length > 0 ? (
                                <div className="space-y-3">
                                    {reviews.map((review, index) => {
                                        const actor = review.actor && typeof review.actor === 'object'
                                            ? [review.actor.firstName, review.actor.lastName].filter(Boolean).join(' ')
                                            : '';
                                        return (
                                            <div key={review._id || index} className="rounded-lg border border-gray-200 p-4">
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{REVIEW_ACTION_LABELS[review.action] || review.action}</p>
                                                        <p className="mt-1 text-xs text-gray-500">{actor || 'ผู้ตรวจ'} · {formatDateTime(review.createdAt)}</p>
                                                    </div>
                                                    <div className="text-sm text-gray-700 sm:text-right">
                                                        <span className="text-gray-500">คะแนนสุดท้าย </span>
                                                        <span className="font-semibold">{formatScore(review.before?.finalScore)}</span>
                                                        <span className="mx-2 text-gray-400">→</span>
                                                        <span className="font-semibold text-indigo-700">{formatScore(review.after?.finalScore)}</span>
                                                    </div>
                                                </div>
                                                {review.reason && (
                                                    <p className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-sm leading-6 text-gray-700">เหตุผล: {review.reason}</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">ยังไม่มีการยืนยันหรือปรับคะแนน</p>
                            )}
                        </div>
                    </section>
                </main>

                <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
                    <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                        <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
                            <Sparkles size={19} className="text-indigo-600" /> สรุปคะแนนข้อนี้
                        </h2>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-lg bg-violet-50 p-3 text-center">
                                <p className="text-xs text-violet-700">AI</p>
                                <p className="mt-1 text-xl font-bold text-violet-900">{formatScore(result?.aiScore)}</p>
                            </div>
                            <div className="rounded-lg bg-amber-50 p-3 text-center">
                                <p className="text-xs text-amber-700">อาจารย์</p>
                                <p className="mt-1 text-xl font-bold text-amber-900">{formatScore(result?.teacherScore)}</p>
                            </div>
                            <div className="rounded-lg bg-green-50 p-3 text-center">
                                <p className="text-xs text-green-700">สุดท้าย</p>
                                <p className="mt-1 text-xl font-bold text-green-900">{formatScore(result?.finalScore)}</p>
                            </div>
                        </div>
                        <p className="mt-3 text-center text-xs text-gray-500">คะแนนเต็ม {formatScore(result?.maxScore)} คะแนน</p>
                    </section>

                    <section className={`rounded-xl border p-5 shadow-sm ${result?.needsHumanReview ? 'border-orange-200 bg-orange-50' : 'border-gray-100 bg-white'}`}>
                        <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                            <ShieldCheck size={19} className={result?.needsHumanReview ? 'text-orange-600' : 'text-green-600'} />
                            สถานะ Human Review
                        </h2>
                        <div className="mt-3">
                            {result?.needsHumanReview ? (
                                <>
                                    <p className="text-sm font-semibold text-orange-900">ต้องให้อาจารย์ตรวจซ้ำ</p>
                                    <p className="mt-1 text-sm leading-6 text-orange-800">{result.reviewReason || 'ผลตรวจมีความไม่แน่นอน โปรดทบทวนหลักฐานและคะแนน'}</p>
                                </>
                            ) : result?.status === 'reviewed' ? (
                                <>
                                    <p className="text-sm font-semibold text-green-800">ทบทวนเรียบร้อยแล้ว</p>
                                    <p className="mt-1 text-xs text-gray-500">{formatDateTime(result.reviewedAt)}</p>
                                </>
                            ) : result?.status === 'failed' ? (
                                <p className="text-sm text-red-700">ยังไม่มีผลให้ทบทวน กรุณาส่งตรวจใหม่</p>
                            ) : (
                                <p className="text-sm text-gray-600">ระบบยังไม่ระบุว่าต้องตรวจซ้ำ</p>
                            )}
                        </div>
                        {result?.rulesDecisions?.length > 0 && (
                            <div className="mt-4 border-t border-gray-200/70 pt-3">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Rules Engine</p>
                                <ul className="space-y-2 text-xs leading-5 text-gray-700">
                                    {result.rulesDecisions.map((decision, index) => (
                                        <li key={`${decision.rule}-${index}`} className="rounded-md bg-white/70 p-2">
                                            <span className="font-semibold">{decision.rule}</span>: {decision.reason}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </section>

                    <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                        <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                            <Gauge size={19} className="text-indigo-600" /> ความมั่นใจ
                        </h2>
                        {confidencePercent !== null ? (
                            <>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">AI confidence</span>
                                    <span className="font-bold text-gray-900">{confidencePercent}%</span>
                                </div>
                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-label="ระดับความมั่นใจของ AI" aria-valuemin="0" aria-valuemax="100" aria-valuenow={confidencePercent}>
                                    <div
                                        className={`h-full rounded-full ${confidencePercent >= 70 ? 'bg-green-500' : confidencePercent >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                        style={{ width: `${confidencePercent}%` }}
                                    />
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-gray-500">ยังไม่มีค่าความมั่นใจ</p>
                        )}
                    </section>

                    <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                        <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
                            <Server size={19} className="text-indigo-600" /> ข้อมูลการประมวลผล
                        </h2>
                        <dl className="space-y-3 text-sm">
                            <div className="flex items-start justify-between gap-3">
                                <dt className="text-gray-500">Provider</dt>
                                <dd className="text-right font-medium text-gray-900">{result?.provider || selectedRun?.provider || '-'}</dd>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                                <dt className="text-gray-500">Model</dt>
                                <dd className="max-w-48 break-words text-right font-medium text-gray-900">{result?.model || selectedRun?.model || '-'}</dd>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                                <dt className="flex items-center gap-1 text-gray-500"><Clock3 size={14} /> Latency</dt>
                                <dd className="font-medium text-gray-900">{formatLatency(result?.latencyMs ?? selectedRun?.latencyMs)}</dd>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                                <dt className="text-gray-500">Input tokens</dt>
                                <dd className="font-medium text-gray-900">{isFiniteNumber(result?.inputTokens) ? result.inputTokens.toLocaleString() : '-'}</dd>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                                <dt className="text-gray-500">Output tokens</dt>
                                <dd className="font-medium text-gray-900">{isFiniteNumber(result?.outputTokens) ? result.outputTokens.toLocaleString() : '-'}</dd>
                            </div>
                            <div className="flex items-start justify-between gap-3 border-t border-gray-100 pt-3">
                                <dt className="text-gray-500">รวม tokens</dt>
                                <dd className="font-semibold text-gray-900">{totalTokens > 0 ? totalTokens.toLocaleString() : '-'}</dd>
                            </div>
                            {isFiniteNumber(result?.estimatedCost) && (
                                <div className="flex items-start justify-between gap-3">
                                    <dt className="text-gray-500">ค่าใช้จ่ายโดยประมาณ</dt>
                                    <dd className="font-medium text-gray-900">${result.estimatedCost.toFixed(6)}</dd>
                                </div>
                            )}
                        </dl>
                    </section>

                    <section className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm">
                        <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
                            <UserCheck size={19} className="text-indigo-600" /> การตัดสินของอาจารย์
                        </h2>
                        {!canReview && (
                            <div className="mb-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                                ต้องมีผลคะแนน AI ที่สำเร็จก่อนจึงจะยืนยันหรือปรับคะแนนได้
                            </div>
                        )}
                        <form onSubmit={handleReview} className="space-y-4">
                            <div className="grid grid-cols-2 gap-2" role="group" aria-label="เลือกการตัดสินคะแนน">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setReviewAction('confirm');
                                        setFormError('');
                                    }}
                                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${reviewAction === 'confirm' ? 'border-green-500 bg-green-50 text-green-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                >
                                    ยืนยัน AI
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setReviewAction('adjust');
                                        setFormError('');
                                    }}
                                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${reviewAction === 'adjust' ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                >
                                    ปรับคะแนน
                                </button>
                            </div>

                            {reviewAction === 'adjust' && (
                                <label className="block">
                                    <span className="mb-1.5 block text-sm font-medium text-gray-700">คะแนนใหม่ <span className="text-red-500">*</span></span>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            max={result?.maxScore}
                                            step="0.01"
                                            value={adjustScore}
                                            onChange={(event) => setAdjustScore(event.target.value)}
                                            disabled={busy || !canReview}
                                            className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-20 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">/ {formatScore(result?.maxScore)}</span>
                                    </div>
                                </label>
                            )}

                            <label className="block">
                                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                                    เหตุผล {reviewAction === 'adjust' ? <span className="text-red-500">*</span> : <span className="font-normal text-gray-400">(ไม่บังคับ)</span>}
                                </span>
                                <textarea
                                    rows="3"
                                    maxLength="2000"
                                    value={reviewReason}
                                    onChange={(event) => setReviewReason(event.target.value)}
                                    disabled={busy || !canReview}
                                    placeholder={reviewAction === 'adjust' ? 'อธิบายเหตุผลที่ปรับคะแนน...' : 'หมายเหตุเพิ่มเติม...'}
                                    className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100"
                                />
                            </label>

                            <button
                                type="submit"
                                disabled={busy || !canReview}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {savingReview ? <LoaderCircle size={17} className="animate-spin" /> : <Save size={17} />}
                                {reviewAction === 'adjust' ? 'บันทึกคะแนนใหม่' : 'ยืนยันคะแนน AI'}
                            </button>
                        </form>
                    </section>

                    <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                        <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                            <RotateCcw size={19} className="text-indigo-600" /> ส่งตรวจ AI ใหม่
                        </h2>
                        <p className="mb-4 text-xs leading-5 text-gray-500">ระบบจะเก็บ run เดิมไว้ในประวัติและเลือกผลล่าสุดที่ตรวจสำเร็จ</p>
                        <label className="block">
                            <span className="mb-1.5 block text-sm font-medium text-gray-700">Provider</span>
                            <select
                                value={preferredProvider}
                                onChange={handleRegradeProviderChange}
                                disabled={busy}
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100"
                            >
                                <option value="system">ใช้ค่าระบบ (แนะนำ)</option>
                                <option value="gemini">Gemini</option>
                                <option value="openrouter">OpenRouter</option>
                            </select>
                        </label>
                        <label className="mt-3 block">
                            <span className="mb-1.5 block text-sm font-medium text-gray-700">Model</span>
                            <input
                                list="regrade-model-list"
                                value={preferredModel}
                                onChange={(event) => setPreferredModel(event.target.value)}
                                disabled={busy || !regradeProviderSetting?.configured || !regradeProviderSetting?.models?.length}
                                placeholder="พิมพ์ค้นหาชื่อหรือรหัส model"
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100"
                            />
                            <datalist id="regrade-model-list">
                                {(regradeProviderSetting?.models || []).map(model => (
                                    <option key={model.modelId} value={model.modelId} label={model.displayName} />
                                ))}
                            </datalist>
                        </label>
                        {!regradeProviderSetting?.configured && (
                            <p className="mt-2 text-xs text-amber-700">ยังไม่ได้ตั้งค่า API key สำหรับ Provider นี้</p>
                        )}
                        <button
                            type="button"
                            onClick={handleRegrade}
                            disabled={busy || result?.status === 'processing'}
                            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {regrading ? <LoaderCircle size={17} className="animate-spin" /> : <RotateCcw size={17} />}
                            {regrading ? 'กำลังตรวจใหม่...' : 'ตรวจใหม่'}
                        </button>
                    </section>

                    {formError && (
                        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
                            <AlertCircle size={18} className="mt-0.5 shrink-0" />
                            <span>{formError}</span>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
};

export default GradingReview;
