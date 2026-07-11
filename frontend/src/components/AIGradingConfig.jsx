import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    AlertTriangle,
    CheckCircle2,
    FlaskConical,
    LoaderCircle,
    Plus,
    Sparkles,
    Trash2,
} from 'lucide-react';

const PROVIDERS = new Set(['system', 'gemini', 'openrouter']);
const LANGUAGES = new Set(['th', 'en']);

const inputClassName = 'w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';

const toStringList = (input, { split = false } = {}) => {
    if (Array.isArray(input)) return input.map(item => String(item ?? ''));
    if (typeof input !== 'string') return [];
    return split ? input.split(/[,\n]/).map(item => item.trim()).filter(Boolean) : [input];
};

const parseKeyConcepts = input => input
    .split(/[,\n]/)
    .map(item => item.trim())
    .filter(Boolean);

const normalizeConfig = (value, points) => {
    const source = value && typeof value === 'object' ? value : {};
    const numericPoints = Number(points);
    const defaultScore = Number.isFinite(numericPoints) && numericPoints > 0 ? numericPoints : 1;
    const groundTruths = toStringList(source.groundTruths);
    const rawCriteria = Array.isArray(source.rubricCriteria) ? source.rubricCriteria : [];

    return {
        groundTruths: groundTruths.length > 0 ? groundTruths : [''],
        rubricCriteria: rawCriteria.length > 0
            ? rawCriteria.map((criterion, index) => {
                const numericScore = Number(criterion?.maxScore);
                return {
                    rubricId: String(criterion?.rubricId ?? criterion?.id ?? `rubric-${index + 1}`),
                    title: String(criterion?.title ?? ''),
                    description: String(criterion?.description ?? ''),
                    maxScore: Number.isFinite(numericScore) ? numericScore : 0,
                };
            })
            : [{ rubricId: 'rubric-1', title: '', description: '', maxScore: defaultScore }],
        keyConcepts: toStringList(source.keyConcepts, { split: true })
            .map(item => item.trim())
            .filter(Boolean),
        language: LANGUAGES.has(source.language) ? source.language : 'th',
        providerPreference: PROVIDERS.has(source.providerPreference)
            ? source.providerPreference
            : 'system',
        modelPreference: String(source.modelPreference || ''),
    };
};

const nextRubricId = criteria => {
    const ids = new Set(criteria.map(criterion => criterion.rubricId));
    let index = criteria.length + 1;
    while (ids.has(`rubric-${index}`)) index += 1;
    return `rubric-${index}`;
};

const errorMessage = error => error?.response?.data?.message
    || error?.message
    || 'ไม่สามารถทดลองตรวจคำตอบได้ กรุณาลองใหม่อีกครั้ง';

const scoreText = value => Number.isFinite(Number(value)) ? Number(value).toLocaleString() : '-';

const AIGradingConfig = ({ value, points, onChange, onTest, providerSettings }) => {
    const fieldId = useId();
    const config = normalizeConfig(value, points);
    const incomingConceptSignature = JSON.stringify(config.keyConcepts);
    const incomingConceptText = config.keyConcepts.join('\n');
    const lastEmittedConceptSignature = useRef(null);
    const [keyConceptText, setKeyConceptText] = useState(() => incomingConceptText);
    const [sampleAnswer, setSampleAnswer] = useState('');
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [testError, setTestError] = useState('');

    useEffect(() => {
        if (lastEmittedConceptSignature.current === incomingConceptSignature) {
            lastEmittedConceptSignature.current = null;
            return;
        }
        setKeyConceptText(incomingConceptText);
    }, [incomingConceptSignature, incomingConceptText]);

    const emitChange = patch => {
        if (typeof onChange !== 'function') return;
        onChange({ ...config, ...patch });
        setTestResult(null);
        setTestError('');
    };

    const updateGroundTruth = (index, nextValue) => {
        const groundTruths = config.groundTruths.map((item, itemIndex) => (
            itemIndex === index ? nextValue : item
        ));
        emitChange({ groundTruths });
    };

    const addGroundTruth = () => {
        if (config.groundTruths.length >= 10) return;
        emitChange({ groundTruths: [...config.groundTruths, ''] });
    };

    const removeGroundTruth = index => {
        if (config.groundTruths.length <= 1) return;
        emitChange({
            groundTruths: config.groundTruths.filter((_, itemIndex) => itemIndex !== index),
        });
    };

    const updateCriterion = (index, field, nextValue) => {
        const rubricCriteria = config.rubricCriteria.map((criterion, itemIndex) => (
            itemIndex === index ? { ...criterion, [field]: nextValue } : criterion
        ));
        emitChange({ rubricCriteria });
    };

    const addCriterion = () => {
        if (config.rubricCriteria.length >= 30) return;
        emitChange({
            rubricCriteria: [
                ...config.rubricCriteria,
                {
                    rubricId: nextRubricId(config.rubricCriteria),
                    title: '',
                    description: '',
                    maxScore: 0,
                },
            ],
        });
    };

    const removeCriterion = index => {
        if (config.rubricCriteria.length <= 1) return;
        emitChange({
            rubricCriteria: config.rubricCriteria.filter((_, itemIndex) => itemIndex !== index),
        });
    };

    const handleConceptChange = event => {
        const text = event.target.value;
        const keyConcepts = parseKeyConcepts(text);
        setKeyConceptText(text);
        lastEmittedConceptSignature.current = JSON.stringify(keyConcepts);
        emitChange({ keyConcepts });
    };

    const handleTest = async () => {
        if (typeof onTest !== 'function' || !sampleAnswer.trim() || testing) return;
        setTesting(true);
        setTestError('');
        setTestResult(null);
        try {
            const returned = await onTest(sampleAnswer.trim());
            setTestResult(returned?.data ?? returned);
        } catch (error) {
            setTestError(errorMessage(error));
        } finally {
            setTesting(false);
        }
    };

    const rubricTotal = config.rubricCriteria.reduce((sum, criterion) => (
        sum + (Number.isFinite(Number(criterion.maxScore)) ? Number(criterion.maxScore) : 0)
    ), 0);
    const numericPoints = Number(points);
    const hasPointMismatch = Number.isFinite(numericPoints)
        && Math.abs(rubricTotal - numericPoints) > 0.000001;
    const rubricIds = config.rubricCriteria.map(criterion => criterion.rubricId.trim()).filter(Boolean);
    const hasInvalidRubricIds = rubricIds.length !== config.rubricCriteria.length
        || new Set(rubricIds).size !== rubricIds.length;
    const result = testResult && typeof testResult === 'object' ? testResult : null;
    const confidence = Number(result?.confidence);
    const effectiveProvider = config.providerPreference === 'system'
        ? (providerSettings?.primary || 'gemini')
        : config.providerPreference;
    const selectedProviderSetting = providerSettings?.providers?.find(
        item => item.provider === effectiveProvider
    );
    const availableModels = selectedProviderSetting?.models || [];
    const selectedModel = config.modelPreference || selectedProviderSetting?.selectedModel || '';

    const handleProviderChange = event => {
        const providerPreference = event.target.value;
        const provider = providerPreference === 'system'
            ? (providerSettings?.primary || 'gemini')
            : providerPreference;
        const setting = providerSettings?.providers?.find(item => item.provider === provider);
        emitChange({
            providerPreference,
            modelPreference: setting?.selectedModel || '',
        });
    };

    return (
        <section
            className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 sm:p-5 space-y-5"
            aria-labelledby={`${fieldId}-title`}
        >
            <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-indigo-100 p-2 text-indigo-600" aria-hidden="true">
                    <Sparkles size={18} />
                </div>
                <div>
                    <h4 id={`${fieldId}-title`} className="font-semibold text-gray-900">
                        ตั้งค่าการตรวจอัตนัยด้วย AI
                    </h4>
                    <p className="mt-0.5 text-xs leading-5 text-gray-500">
                        AI จะให้คะแนนตามเกณฑ์และแนวคำตอบที่กำหนด ไม่ได้เปรียบเทียบข้อความเพียงอย่างเดียว
                    </p>
                </div>
            </div>

            <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-gray-700">แนวคำตอบ (Ground Truth)</legend>
                <p className="text-xs text-gray-500">เพิ่มแนวคำตอบที่ถูกต้องได้หลายรูปแบบ (สูงสุด 10 คำตอบ)</p>
                {config.groundTruths.map((groundTruth, index) => (
                    <div key={index} className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                            <label htmlFor={`${fieldId}-ground-truth-${index}`} className="sr-only">
                                แนวคำตอบที่ {index + 1}
                            </label>
                            <textarea
                                id={`${fieldId}-ground-truth-${index}`}
                                value={groundTruth}
                                onChange={event => updateGroundTruth(index, event.target.value)}
                                rows={3}
                                maxLength={12000}
                                placeholder={`แนวคำตอบที่ ${index + 1}`}
                                className={`${inputClassName} resize-y`}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => removeGroundTruth(index)}
                            disabled={config.groundTruths.length <= 1}
                            className="mt-1 rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={`ลบแนวคำตอบที่ ${index + 1}`}
                            title="ลบแนวคำตอบ"
                        >
                            <Trash2 size={17} />
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    onClick={addGroundTruth}
                    disabled={config.groundTruths.length >= 10}
                    className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 transition hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Plus size={15} aria-hidden="true" /> เพิ่มแนวคำตอบ
                </button>
            </fieldset>

            <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-gray-700">เกณฑ์การให้คะแนน (Rubric)</legend>
                <p className="text-xs text-gray-500">
                    คะแนนเต็มของทุกเกณฑ์ต้องรวมเท่ากับคะแนนเต็มของข้อนี้
                </p>
                {config.rubricCriteria.map((criterion, index) => (
                    <div key={index} className="rounded-lg border border-gray-200 bg-white p-3 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-gray-700">เกณฑ์ที่ {index + 1}</p>
                            <button
                                type="button"
                                onClick={() => removeCriterion(index)}
                                disabled={config.rubricCriteria.length <= 1}
                                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label={`ลบเกณฑ์ที่ ${index + 1}`}
                                title="ลบเกณฑ์"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                            <div className="lg:col-span-2">
                                <label htmlFor={`${fieldId}-rubric-id-${index}`} className="mb-1 block text-xs font-medium text-gray-600">
                                    Rubric ID
                                </label>
                                <input
                                    id={`${fieldId}-rubric-id-${index}`}
                                    type="text"
                                    value={criterion.rubricId}
                                    onChange={event => updateCriterion(index, 'rubricId', event.target.value)}
                                    maxLength={100}
                                    placeholder="เช่น accuracy"
                                    className={inputClassName}
                                />
                            </div>
                            <div className="lg:col-span-2">
                                <label htmlFor={`${fieldId}-rubric-title-${index}`} className="mb-1 block text-xs font-medium text-gray-600">
                                    ชื่อเกณฑ์
                                </label>
                                <input
                                    id={`${fieldId}-rubric-title-${index}`}
                                    type="text"
                                    value={criterion.title}
                                    onChange={event => updateCriterion(index, 'title', event.target.value)}
                                    maxLength={300}
                                    placeholder="เช่น ความถูกต้อง"
                                    className={inputClassName}
                                />
                            </div>
                            <div>
                                <label htmlFor={`${fieldId}-rubric-score-${index}`} className="mb-1 block text-xs font-medium text-gray-600">
                                    คะแนนเต็ม
                                </label>
                                <input
                                    id={`${fieldId}-rubric-score-${index}`}
                                    type="number"
                                    min="0"
                                    max="1000"
                                    step="0.5"
                                    value={criterion.maxScore}
                                    onChange={event => updateCriterion(index, 'maxScore', Number(event.target.value))}
                                    className={inputClassName}
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor={`${fieldId}-rubric-description-${index}`} className="mb-1 block text-xs font-medium text-gray-600">
                                รายละเอียดเกณฑ์
                            </label>
                            <textarea
                                id={`${fieldId}-rubric-description-${index}`}
                                value={criterion.description}
                                onChange={event => updateCriterion(index, 'description', event.target.value)}
                                rows={2}
                                maxLength={3000}
                                placeholder="อธิบายสิ่งที่ต้องพบในคำตอบและเงื่อนไขการให้คะแนน"
                                className={`${inputClassName} resize-y`}
                            />
                        </div>
                    </div>
                ))}

                <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                    <button
                        type="button"
                        onClick={addCriterion}
                        disabled={config.rubricCriteria.length >= 30}
                        className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 transition hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Plus size={15} aria-hidden="true" /> เพิ่มเกณฑ์
                    </button>
                    <div
                        className={`flex items-center gap-1.5 text-xs font-medium ${hasPointMismatch || hasInvalidRubricIds ? 'text-amber-700' : 'text-green-700'}`}
                        role="status"
                    >
                        {hasPointMismatch || hasInvalidRubricIds
                            ? <AlertTriangle size={15} aria-hidden="true" />
                            : <CheckCircle2 size={15} aria-hidden="true" />}
                        {hasInvalidRubricIds
                            ? 'Rubric ID ต้องไม่ซ้ำกันและห้ามเว้นว่าง'
                            : `รวม ${scoreText(rubricTotal)} / ${scoreText(points)} คะแนน`}
                    </div>
                </div>
            </fieldset>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="md:col-span-2">
                    <label htmlFor={`${fieldId}-key-concepts`} className="mb-1 block text-sm font-medium text-gray-700">
                        ประเด็นสำคัญ (Key Concepts)
                    </label>
                    <textarea
                        id={`${fieldId}-key-concepts`}
                        value={keyConceptText}
                        onChange={handleConceptChange}
                        rows={3}
                        placeholder={'พิมพ์หนึ่งประเด็นต่อบรรทัด หรือคั่นด้วยเครื่องหมายจุลภาค\nเช่น นิยาม, ขั้นตอน, ตัวอย่าง'}
                        aria-describedby={`${fieldId}-key-concepts-hint`}
                        className={`${inputClassName} resize-y`}
                    />
                    <p id={`${fieldId}-key-concepts-hint`} className="mt-1 text-xs text-gray-500">
                        ระบบจะแยกข้อความด้วยบรรทัดใหม่หรือเครื่องหมายจุลภาค
                    </p>
                </div>
                <div>
                    <label htmlFor={`${fieldId}-language`} className="mb-1 block text-sm font-medium text-gray-700">
                        ภาษาที่ใช้ตรวจ
                    </label>
                    <select
                        id={`${fieldId}-language`}
                        value={config.language}
                        onChange={event => emitChange({ language: event.target.value })}
                        className={inputClassName}
                    >
                        <option value="th">ภาษาไทย</option>
                        <option value="en">English</option>
                    </select>
                </div>
                <div>
                    <label htmlFor={`${fieldId}-provider`} className="mb-1 block text-sm font-medium text-gray-700">
                        AI Provider
                    </label>
                    <select
                        id={`${fieldId}-provider`}
                        value={config.providerPreference}
                        onChange={handleProviderChange}
                        className={inputClassName}
                    >
                        <option value="system">ใช้ค่าระบบ (แนะนำ)</option>
                        <option value="gemini">Gemini</option>
                        <option value="openrouter">OpenRouter</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">ค่าระบบจะใช้ {providerSettings?.primary || 'Provider หลัก'} ก่อน</p>
                </div>
                <div>
                    <label htmlFor={`${fieldId}-model`} className="mb-1 block text-sm font-medium text-gray-700">
                        Model
                    </label>
                    <input
                        id={`${fieldId}-model`}
                        list={`${fieldId}-model-list`}
                        value={selectedModel}
                        onChange={event => emitChange({ modelPreference: event.target.value })}
                        disabled={!selectedProviderSetting?.configured || availableModels.length === 0}
                        placeholder="พิมพ์ค้นหาชื่อหรือรหัส model"
                        className={inputClassName}
                    />
                    <datalist id={`${fieldId}-model-list`}>
                        {availableModels.map(model => (
                            <option key={model.modelId} value={model.modelId} label={model.displayName} />
                        ))}
                    </datalist>
                    {!selectedProviderSetting?.configured && (
                        <p className="mt-1 text-xs text-amber-700">
                            ยังไม่มี API key ของ {effectiveProvider === 'gemini' ? 'Gemini' : 'OpenRouter'} ·{' '}
                            <Link to="/teacher/ai-settings" className="font-medium underline">ตั้งค่า key</Link>
                        </p>
                    )}
                </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <FlaskConical size={17} className="text-indigo-600" aria-hidden="true" />
                    <h5 className="text-sm font-semibold text-gray-900">ทดลองตรวจคำตอบ</h5>
                </div>
                <div>
                    <label htmlFor={`${fieldId}-sample-answer`} className="sr-only">คำตอบตัวอย่างของนักศึกษา</label>
                    <textarea
                        id={`${fieldId}-sample-answer`}
                        value={sampleAnswer}
                        onChange={event => {
                            setSampleAnswer(event.target.value);
                            setTestResult(null);
                            setTestError('');
                        }}
                        rows={4}
                        maxLength={12000}
                        placeholder="ใส่คำตอบตัวอย่างของนักศึกษาเพื่อทดลองตรวจ..."
                        className={`${inputClassName} resize-y`}
                    />
                </div>
                <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                    <button
                        type="button"
                        onClick={handleTest}
                        disabled={testing || !sampleAnswer.trim() || typeof onTest !== 'function'}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {testing
                            ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                            : <Sparkles size={16} aria-hidden="true" />}
                        {testing ? 'กำลังทดลองตรวจ...' : 'ทดลองตรวจด้วย AI'}
                    </button>
                    {typeof onTest !== 'function' && (
                        <p className="text-xs text-gray-500">ยังไม่ได้เชื่อมต่อการทดลองตรวจกับเซิร์ฟเวอร์</p>
                    )}
                </div>

                {testError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
                        {testError}
                    </div>
                )}

                {result && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3" aria-live="polite">
                        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-green-700">ผลทดลองตรวจ</p>
                                <p className="mt-0.5 text-2xl font-bold text-gray-900">
                                    {scoreText(result.totalScore ?? result.aiScore)}
                                    <span className="text-sm font-medium text-gray-500"> / {scoreText(result.maxScore ?? points)} คะแนน</span>
                                </p>
                            </div>
                            {Number.isFinite(confidence) && (
                                <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-green-200">
                                    ความมั่นใจ {Math.round(confidence * 100)}%
                                </span>
                            )}
                        </div>

                        {Array.isArray(result.criteria) && result.criteria.length > 0 && (
                            <div className="space-y-2">
                                {result.criteria.map((item, index) => {
                                    const configuredCriterion = config.rubricCriteria.find(criterion => criterion.rubricId === item.rubricId);
                                    return (
                                        <div key={`${item.rubricId ?? 'criterion'}-${index}`} className="rounded-lg bg-white/80 p-3 text-sm">
                                            <div className="flex items-start justify-between gap-3">
                                                <p className="font-medium text-gray-800">
                                                    {configuredCriterion?.title || item.rubricId || `เกณฑ์ที่ ${index + 1}`}
                                                </p>
                                                <p className="shrink-0 font-semibold text-indigo-700">
                                                    {scoreText(item.score)} / {scoreText(item.maxScore)}
                                                </p>
                                            </div>
                                            {item.reason && <p className="mt-1 text-xs leading-5 text-gray-600">{item.reason}</p>}
                                            {Array.isArray(item.evidence) && item.evidence.length > 0 && (
                                                <p className="mt-1 text-xs leading-5 text-gray-500">
                                                    หลักฐาน: {item.evidence.join(' · ')}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {(result.metadata?.provider || result.provider) && (
                            <p className="text-xs text-gray-600">
                                Provider: {result.metadata?.provider || result.provider}
                                {(result.metadata?.model || result.model) && ` · Model: ${result.metadata?.model || result.model}`}
                                {Number.isFinite(Number(result.metadata?.latencyMs)) && ` · ${Number(result.metadata.latencyMs).toLocaleString()} ms`}
                            </p>
                        )}

                        {result.needsHumanReview && (
                            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                                <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                                <p>
                                    ควรให้อาจารย์ตรวจซ้ำ
                                    {result.reviewReason && `: ${result.reviewReason}`}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
};

export default AIGradingConfig;
