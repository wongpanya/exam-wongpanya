import { useState, useEffect } from 'react';
import { PixelMascotSprite, SPECIES, MASCOT_THEMES, HATS, ACCESSORIES } from './PixelSprites';
import { Palette, Sparkles, Check, RotateCcw, Glasses, X, Settings } from 'lucide-react';

export const MASCOT_CONFIG_STORAGE_KEY = 'student_mascot_config';

/**
 * MascotCustomizer Component:
 * Customization panel / modal for selecting Species (Owl, Cat, Dog),
 * Color theme, Hats, and Face accessories.
 * STRICTLY NO EMOJIS.
 */
export const MascotCustomizer = ({ isOpen = false, onClose = null, isModal = false }) => {
    const [selectedSpecies, setSelectedSpecies] = useState('owl');
    const [selectedTheme, setSelectedTheme] = useState('classic');
    const [selectedHat, setSelectedHat] = useState('none');
    const [selectedAccessory, setSelectedAccessory] = useState('none');
    const [previewExpression, setPreviewExpression] = useState('idle');
    const [activeTab, setActiveTab] = useState('species'); // 'species' | 'theme' | 'hat' | 'face'
    const [savedSuccess, setSavedSuccess] = useState(false);

    // Load saved settings
    useEffect(() => {
        try {
            const saved = localStorage.getItem(MASCOT_CONFIG_STORAGE_KEY);
            if (saved) {
                const config = JSON.parse(saved);
                if (config.species) setSelectedSpecies(config.species);
                if (config.themeId) setSelectedTheme(config.themeId);
                if (config.hatId) setSelectedHat(config.hatId);
                if (config.accessoryId) setSelectedAccessory(config.accessoryId);
            }
        } catch {
            // ignore
        }
    }, [isOpen]);

    // Save configuration
    const handleSave = () => {
        const config = {
            species: selectedSpecies,
            themeId: selectedTheme,
            hatId: selectedHat,
            accessoryId: selectedAccessory,
        };
        try {
            localStorage.setItem(MASCOT_CONFIG_STORAGE_KEY, JSON.stringify(config));
            window.dispatchEvent(new Event('storage'));
            setSavedSuccess(true);
            setTimeout(() => {
                setSavedSuccess(false);
                if (isModal && onClose) onClose();
            }, 1200);
        } catch (err) {
            console.error('Failed to save mascot config:', err);
        }
    };

    // Reset to defaults
    const handleReset = () => {
        setSelectedSpecies('owl');
        setSelectedTheme('classic');
        setSelectedHat('none');
        setSelectedAccessory('none');
    };

    const content = (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">ปรับแต่งผู้ช่วยสอบ (Mascot Studio)</h2>
                        <p className="text-xs text-gray-500">เลือกตัวละคร สัตว์เลี้ยง สีสัน และเครื่องประดับได้ตามต้องการ</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition flex items-center gap-1 cursor-pointer"
                        title="คืนค่าเริ่มต้น"
                    >
                        <RotateCcw size={13} />
                        <span>คืนค่า</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                            savedSuccess
                                ? 'bg-emerald-600 text-white'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                    >
                        <Check size={14} />
                        <span>{savedSuccess ? 'บันทึกแล้ว' : 'บันทึกการปรับแต่ง'}</span>
                    </button>
                    {isModal && onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Interactive Customization Section */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Left Column: Live Mascot Preview Canvas */}
                <div className="md:col-span-5 bg-gradient-to-b from-indigo-50/50 to-gray-50 rounded-2xl p-6 border border-gray-100 flex flex-col items-center justify-center relative min-h-[220px]">
                    <div className="transform hover:scale-110 transition duration-200 cursor-pointer">
                        <PixelMascotSprite
                            species={selectedSpecies}
                            themeId={selectedTheme}
                            hatId={selectedHat}
                            accessoryId={selectedAccessory}
                            expression={previewExpression}
                            size={120}
                        />
                    </div>

                    {/* Preview expression switcher */}
                    <div className="mt-4 flex items-center gap-1.5 bg-white/90 backdrop-blur-xs px-2 py-1 rounded-xl border border-gray-200 text-xs font-medium text-gray-600">
                        <span className="text-[11px] text-gray-400 mr-1">ท่าทาง:</span>
                        <button
                            type="button"
                            onClick={() => setPreviewExpression('idle')}
                            className={`px-2 py-0.5 rounded-md transition cursor-pointer text-xs ${
                                previewExpression === 'idle' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100'
                            }`}
                        >
                            ปกติ
                        </button>
                        <button
                            type="button"
                            onClick={() => setPreviewExpression('shocked')}
                            className={`px-2 py-0.5 rounded-md transition cursor-pointer text-xs ${
                                previewExpression === 'shocked' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100'
                            }`}
                        >
                            ตกใจ
                        </button>
                        <button
                            type="button"
                            onClick={() => setPreviewExpression('celebrate')}
                            className={`px-2 py-0.5 rounded-md transition cursor-pointer text-xs ${
                                previewExpression === 'celebrate' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100'
                            }`}
                        >
                            ฉลอง
                        </button>
                        <button
                            type="button"
                            onClick={() => setPreviewExpression('sleep')}
                            className={`px-2 py-0.5 rounded-md transition cursor-pointer text-xs ${
                                previewExpression === 'sleep' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100'
                            }`}
                        >
                            หลับ
                        </button>
                    </div>
                </div>

                {/* Right Column: Category Tabs & Options */}
                <div className="md:col-span-7 space-y-4">
                    {/* Tabs navigation */}
                    <div className="flex border-b border-gray-200 flex-wrap gap-1">
                        <button
                            type="button"
                            onClick={() => setActiveTab('species')}
                            className={`pb-2 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
                                activeTab === 'species'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            <Settings size={14} />
                            <span>ชนิดสัตว์เลี้ยง</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('theme')}
                            className={`pb-2 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
                                activeTab === 'theme'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            <Palette size={14} />
                            <span>สีตัวละคร</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('hat')}
                            className={`pb-2 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
                                activeTab === 'hat'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            <Sparkles size={14} />
                            <span>หมวก / ส่วนหัว</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('face')}
                            className={`pb-2 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
                                activeTab === 'face'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            <Glasses size={14} />
                            <span>แว่นตา / ใบหน้า</span>
                        </button>
                    </div>

                    {/* Tab 0: Species Selection (Owl, Cat, Dog) */}
                    {activeTab === 'species' && (
                        <div className="grid grid-cols-3 gap-2.5 pt-1">
                            {SPECIES.map(sp => {
                                const isSelected = selectedSpecies === sp.id;
                                return (
                                    <button
                                        key={sp.id}
                                        type="button"
                                        onClick={() => setSelectedSpecies(sp.id)}
                                        className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-2 cursor-pointer ${
                                            isSelected
                                                ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="w-12 h-12 flex items-center justify-center">
                                            <PixelMascotSprite
                                                species={sp.id}
                                                themeId={selectedTheme}
                                                size={44}
                                            />
                                        </div>
                                        <p className="text-xs font-semibold text-gray-800 truncate">{sp.name}</p>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Tab 1: Theme Options */}
                    {activeTab === 'theme' && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                            {Object.values(MASCOT_THEMES).map(th => {
                                const isSelected = selectedTheme === th.id;
                                return (
                                    <button
                                        key={th.id}
                                        type="button"
                                        onClick={() => setSelectedTheme(th.id)}
                                        className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                                            isSelected
                                                ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        <span 
                                            className="w-5 h-5 rounded-full border border-gray-300 shadow-2xs shrink-0" 
                                            style={{ backgroundColor: th.primary }} 
                                        />
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-gray-800 truncate">{th.name}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Tab 2: Hats */}
                    {activeTab === 'hat' && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                            {HATS.map(h => {
                                const isSelected = selectedHat === h.id;
                                return (
                                    <button
                                        key={h.id}
                                        type="button"
                                        onClick={() => setSelectedHat(h.id)}
                                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                                            isSelected
                                                ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        <p className="text-xs font-semibold text-gray-800">{h.name}</p>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Tab 3: Face Accessories */}
                    {activeTab === 'face' && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                            {ACCESSORIES.map(acc => {
                                const isSelected = selectedAccessory === acc.id;
                                return (
                                    <button
                                        key={acc.id}
                                        type="button"
                                        onClick={() => setSelectedAccessory(acc.id)}
                                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                                            isSelected
                                                ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        <p className="text-xs font-semibold text-gray-800">{acc.name}</p>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    if (isModal) {
        if (!isOpen) return null;
        return (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto border border-gray-200 animate-scale-up">
                    {content}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {content}
        </div>
    );
};

export default MascotCustomizer;
