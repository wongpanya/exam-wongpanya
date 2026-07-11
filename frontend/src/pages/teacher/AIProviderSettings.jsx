import { useEffect, useState } from 'react';
import {
    CheckCircle2,
    KeyRound,
    LoaderCircle,
    RefreshCw,
    Save,
    ShieldCheck,
    Trash2,
    XCircle,
} from 'lucide-react';
import api from '../../config/api';
import { useDialog } from '../../components/DialogProvider';

const PROVIDER_INFO = {
    gemini: {
        name: 'Gemini',
        description: 'ใช้ API key จาก Google AI Studio',
        placeholder: 'วาง Gemini API key',
    },
    openrouter: {
        name: 'OpenRouter',
        description: 'ใช้ API key จากบัญชี OpenRouter ของคุณ',
        placeholder: 'วาง OpenRouter API key',
    },
};

const getErrorMessage = error => error?.response?.data?.message
    || error?.message
    || 'เกิดข้อผิดพลาด กรุณาลองใหม่';

const AIProviderSettings = () => {
    const { showConfirm } = useDialog();
    const [settings, setSettings] = useState({ primary: 'gemini', fallbacks: [], providers: [] });
    const [keys, setKeys] = useState({ gemini: '', openrouter: '' });
    const [modelInputs, setModelInputs] = useState({});
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState({});
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const fetchSettings = async () => {
        try {
            setError('');
            const { data } = await api.get('/grading/provider-settings');
            setSettings(data);
        } catch (fetchError) {
            setError(getErrorMessage(fetchError));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const updateProvider = (provider, next) => {
        setSettings(current => ({
            ...current,
            providers: current.providers.map(item => item.provider === provider ? next : item),
        }));
    };

    const setProviderBusy = (provider, action) => {
        setBusy(current => ({ ...current, [provider]: action }));
    };

    const setPrimaryProvider = async (provider) => {
        try {
            setProviderBusy('primary', 'primary');
            setError('');
            const { data } = await api.patch('/grading/provider-settings/primary', { provider });
            setSettings(current => ({ ...current, ...data }));
            setNotice(`ตั้ง ${PROVIDER_INFO[provider].name} เป็น Provider หลักแล้ว`);
        } catch (primaryError) {
            setError(getErrorMessage(primaryError));
        } finally {
            setProviderBusy('primary', null);
        }
    };

    const saveKey = async (provider) => {
        const apiKey = keys[provider].trim();
        if (!apiKey) {
            setError(`กรุณาใส่ API key ของ ${PROVIDER_INFO[provider].name}`);
            return;
        }
        try {
            setProviderBusy(provider, 'key');
            setError('');
            setNotice('');
            const { data } = await api.put(`/grading/provider-settings/${provider}/key`, { apiKey });
            updateProvider(provider, data);
            setKeys(current => ({ ...current, [provider]: '' }));
            setNotice(`บันทึก ${PROVIDER_INFO[provider].name} API key และโหลดรายชื่อโมเดลแล้ว`);
        } catch (saveError) {
            setError(getErrorMessage(saveError));
        } finally {
            setProviderBusy(provider, null);
        }
    };

    const selectModel = async (provider, model) => {
        try {
            setProviderBusy(provider, 'model');
            setError('');
            const { data } = await api.patch(`/grading/provider-settings/${provider}/model`, { model });
            updateProvider(provider, data);
            setNotice(`เลือกโมเดล ${data.selectedModel} แล้ว`);
        } catch (selectError) {
            setError(getErrorMessage(selectError));
        } finally {
            setProviderBusy(provider, null);
        }
    };

    const handleModelInput = (provider, value, models) => {
        setModelInputs(current => ({ ...current, [provider]: value }));
        if (models.some(model => model.modelId === value)) {
            selectModel(provider, value);
        }
    };

    const refreshModels = async (provider) => {
        try {
            setProviderBusy(provider, 'refresh');
            setError('');
            const { data } = await api.post(`/grading/provider-settings/${provider}/refresh-models`);
            updateProvider(provider, data);
            setNotice(`อัปเดตรายชื่อโมเดลของ ${PROVIDER_INFO[provider].name} แล้ว`);
        } catch (refreshError) {
            setError(getErrorMessage(refreshError));
        } finally {
            setProviderBusy(provider, null);
        }
    };

    const removeKey = async (provider) => {
        const confirmed = await showConfirm({
            title: `ลบ ${PROVIDER_INFO[provider].name} API key`,
            message: 'ข้อสอบที่เลือก Provider นี้จะไม่สามารถตรวจได้จนกว่าจะตั้งค่า key ใหม่',
            confirmText: 'ลบ Key',
            cancelText: 'ยกเลิก',
            variant: 'danger',
        });
        if (!confirmed) return;
        try {
            setProviderBusy(provider, 'delete');
            setError('');
            await api.delete(`/grading/provider-settings/${provider}/key`);
            updateProvider(provider, {
                provider,
                configured: false,
                keyHint: null,
                selectedModel: null,
                models: [],
                modelsFetchedAt: null,
            });
            setNotice(`ลบ ${PROVIDER_INFO[provider].name} API key แล้ว`);
            await fetchSettings();
        } catch (deleteError) {
            setError(getErrorMessage(deleteError));
        } finally {
            setProviderBusy(provider, null);
        }
    };

    if (loading) {
        return <div className="flex h-64 items-center justify-center text-gray-500"><LoaderCircle className="mr-2 animate-spin" /> กำลังโหลด...</div>;
    }

    return (
        <div className="space-y-6">
            <header>
                <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 sm:text-3xl">
                    <KeyRound className="text-indigo-600" /> ตั้งค่า AI Provider
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    API key แยกตามบัญชีอาจารย์ ระบบไม่ส่ง key กลับมาที่ browser และไม่แชร์กับอาจารย์คนอื่น
                </p>
            </header>

            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                <ShieldCheck className="mt-0.5 shrink-0" size={20} />
                <p>ใส่เฉพาะ API key แล้วระบบจะตรวจสอบและโหลด model ที่บัญชีนี้ใช้งานได้ให้เลือกอัตโนมัติ</p>
            </div>

            <section className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-5">
                <label htmlFor="primary-provider" className="block text-sm font-semibold text-gray-900">Provider หลักสำหรับการตรวจ AI</label>
                <p className="mt-1 text-xs text-gray-600">ระบบจะใช้ Provider นี้ก่อน แล้วจึงลอง Provider อื่นที่ตั้งค่าไว้หากตรวจไม่สำเร็จ</p>
                <select
                    id="primary-provider"
                    value={settings.primary}
                    onChange={event => setPrimaryProvider(event.target.value)}
                    disabled={Boolean(busy.primary)}
                    className="mt-3 w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-100 sm:max-w-md"
                >
                    {Object.entries(PROVIDER_INFO).map(([provider, info]) => {
                        const configured = settings.providers.find(item => item.provider === provider)?.configured;
                        return <option key={provider} value={provider} disabled={!configured}>{info.name}{configured ? '' : ' (ยังไม่ตั้งค่า API key)'}</option>;
                    })}
                </select>
                {busy.primary === 'primary' && <LoaderCircle className="ml-2 inline animate-spin text-indigo-600" size={16} />}
            </section>

            {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
                    <XCircle className="mt-0.5 shrink-0" size={18} /> {error}
                </div>
            )}
            {notice && (
                <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700" role="status">
                    <CheckCircle2 className="mt-0.5 shrink-0" size={18} /> {notice}
                </div>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
                {Object.keys(PROVIDER_INFO).map((provider) => {
                    const info = PROVIDER_INFO[provider];
                    const setting = settings.providers.find(item => item.provider === provider) || {
                        provider,
                        configured: false,
                        models: [],
                    };
                    const action = busy[provider];
                    const routeRole = settings.primary === provider
                        ? 'Primary Provider'
                        : settings.fallbacks.includes(provider) ? 'Fallback Provider' : null;

                    return (
                        <section key={provider} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-lg font-semibold text-gray-900">{info.name}</h2>
                                        {routeRole && <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">{routeRole}</span>}
                                    </div>
                                    <p className="mt-1 text-sm text-gray-500">{info.description}</p>
                                </div>
                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${setting.configured ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {setting.configured ? `ตั้งค่าแล้ว ••••${setting.keyHint}` : 'ยังไม่ตั้งค่า'}
                                </span>
                            </div>

                            <div className="mt-5">
                                <label htmlFor={`${provider}-key`} className="mb-1.5 block text-sm font-medium text-gray-700">
                                    {setting.configured ? 'เปลี่ยน API key' : 'API key'}
                                </label>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <input
                                        id={`${provider}-key`}
                                        type="password"
                                        autoComplete="new-password"
                                        value={keys[provider]}
                                        onChange={event => setKeys(current => ({ ...current, [provider]: event.target.value }))}
                                        placeholder={info.placeholder}
                                        className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => saveKey(provider)}
                                        disabled={Boolean(action) || !keys[provider].trim()}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {action === 'key' ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}
                                        ตรวจสอบและบันทึก
                                    </button>
                                </div>
                            </div>

                            {setting.configured && (
                                <div className="mt-5 border-t border-gray-100 pt-5">
                                    <div className="flex items-end gap-2">
                                        <label className="min-w-0 flex-1">
                                            <span className="mb-1.5 block text-sm font-medium text-gray-700">Model เริ่มต้น</span>
                                            <input
                                                list={`${provider}-model-list`}
                                                value={modelInputs[provider] ?? setting.selectedModel ?? ''}
                                                onChange={event => handleModelInput(provider, event.target.value, setting.models)}
                                                disabled={Boolean(action) || setting.models.length === 0}
                                                placeholder="พิมพ์ค้นหาชื่อหรือรหัส model"
                                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-100"
                                            />
                                            <datalist id={`${provider}-model-list`}>
                                                {setting.models.map(model => (
                                                    <option key={model.modelId} value={model.modelId} label={model.displayName} />
                                                ))}
                                            </datalist>
                                        </label>
                                        {action === 'model' && <LoaderCircle className="mb-2 animate-spin text-indigo-600" size={18} />}
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-xs text-gray-400">พบ {setting.models.length.toLocaleString()} models</p>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => refreshModels(provider)}
                                                disabled={Boolean(action)}
                                                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                                            >
                                                <RefreshCw className={action === 'refresh' ? 'animate-spin' : ''} size={14} /> อัปเดต Models
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeKey(provider)}
                                                disabled={Boolean(action)}
                                                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                                            >
                                                <Trash2 size={14} /> ลบ Key
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>
                    );
                })}
            </div>
        </div>
    );
};

export default AIProviderSettings;
