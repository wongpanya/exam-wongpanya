import { useState, useEffect, useRef, useCallback } from 'react';
import { PixelMascotSprite } from './PixelSprites';
import { 
    Clock, 
    Moon, 
    Sun, 
    EyeOff, 
    Eye, 
    X, 
    Sparkles,
    Move
} from 'lucide-react';

const MASCOT_CONFIG_STORAGE_KEY = 'student_mascot_config';

/**
 * PixelMascot Component:
 * Displays an interactive, draggable Pixel Exam Companion in TakeExam.
 * - Draggable to any position on the screen
 * - Speech bubble flips up/down automatically to remain in-bounds
 * - Serves as exclusive timekeeper (with countdown badge and audio/bubble alerts)
 * - Sleep / Hide modes with auto-wake on low time
 * STRICTLY NO EMOJIS. All icons are SVG (lucide-react) or SVG Pixel Art.
 */
export const PixelMascot = ({
    timeLeft,
    behavior, // Returned from useMascotBehavior hook
}) => {
    const {
        mascotState,
        speech,
        dismissSpeech,
        isSleeping,
        toggleSleep,
        isHidden,
        toggleHide,
        walkFrame,
        askTime,
        formatRemainingText,
    } = behavior;

    // Load customization from localStorage
    const [mascotConfig, setMascotConfig] = useState(() => {
        try {
            const saved = localStorage.getItem(MASCOT_CONFIG_STORAGE_KEY);
            return saved ? JSON.parse(saved) : { species: 'owl', themeId: 'classic', hatId: 'none', accessoryId: 'none' };
        } catch {
            return { species: 'owl', themeId: 'classic', hatId: 'none', accessoryId: 'none' };
        }
    });

    // Draggable position state
    const [position, setPosition] = useState({ x: null, y: null });
    const isDraggingRef = useRef(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });
    const hasMovedRef = useRef(false);

    // Set initial position at bottom-right area
    useEffect(() => {
        const initPos = () => {
            const defaultX = Math.max(20, window.innerWidth - 130);
            const defaultY = Math.max(20, window.innerHeight - 150);
            setPosition(prev => {
                if (prev.x === null) return { x: defaultX, y: defaultY };
                // Clamp existing position on window resize
                const clampedX = Math.min(Math.max(10, prev.x), window.innerWidth - 90);
                const clampedY = Math.min(Math.max(10, prev.y), window.innerHeight - 110);
                return { x: clampedX, y: clampedY };
            });
        };
        initPos();
        window.addEventListener('resize', initPos);
        return () => window.removeEventListener('resize', initPos);
    }, []);

    useEffect(() => {
        const handleStorageChange = () => {
            try {
                const saved = localStorage.getItem(MASCOT_CONFIG_STORAGE_KEY);
                if (saved) setMascotConfig(JSON.parse(saved));
            } catch {
                // ignore
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Pointer down handler for dragging
    const handlePointerDown = (e) => {
        // Ignore if clicking buttons inside (toolbar, dismiss, action buttons)
        if (e.target.closest('button')) return;

        isDraggingRef.current = true;
        hasMovedRef.current = false;

        const clientX = e.clientX ?? e.touches?.[0]?.clientX;
        const clientY = e.clientY ?? e.touches?.[0]?.clientY;

        dragOffsetRef.current = {
            x: clientX - (position.x || 0),
            y: clientY - (position.y || 0),
        };

        const handlePointerMove = (moveEvent) => {
            if (!isDraggingRef.current) return;
            hasMovedRef.current = true;

            const curX = moveEvent.clientX ?? moveEvent.touches?.[0]?.clientX;
            const curY = moveEvent.clientY ?? moveEvent.touches?.[0]?.clientY;

            const newX = Math.min(Math.max(10, curX - dragOffsetRef.current.x), window.innerWidth - 90);
            const newY = Math.min(Math.max(10, curY - dragOffsetRef.current.y), window.innerHeight - 110);

            setPosition({ x: newX, y: newY });
        };

        const handlePointerUp = () => {
            isDraggingRef.current = false;
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('touchmove', handlePointerMove);
            window.removeEventListener('touchend', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('touchmove', handlePointerMove);
        window.addEventListener('touchend', handlePointerUp);
    };

    const handleAvatarClick = () => {
        if (!hasMovedRef.current) {
            askTime();
        }
    };

    // Format mm:ss for the mascot's mini-countdown tag
    const formatDigitalTime = (seconds) => {
        if (seconds === null || seconds === undefined) return '--:--';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    // If completely hidden, display a discreet floating SVG toggle button at the bottom-right corner
    if (isHidden) {
        return (
            <div className="fixed bottom-16 right-4 z-40">
                <button
                    type="button"
                    onClick={toggleHide}
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg text-xs font-medium transition cursor-pointer border-2 border-white"
                    title="เรียกผู้ช่วยสอบกลับมา"
                >
                    <Eye size={15} />
                    <span>ผู้ช่วยสอบ</span>
                    {timeLeft !== null && (
                        <span className="font-mono bg-indigo-800/80 px-1.5 py-0.5 rounded text-[11px]">
                            {formatDigitalTime(timeLeft)}
                        </span>
                    )}
                </button>
            </div>
        );
    }

    if (position.x === null) return null;

    const isUrgent = timeLeft !== null && timeLeft <= 600;
    const isNearTop = position.y < 160;
    const isNearLeft = position.x < 180;

    return (
        <div
            style={{
                position: 'fixed',
                left: `${position.x}px`,
                top: `${position.y}px`,
                zIndex: 45,
                touchAction: 'none',
            }}
            onPointerDown={handlePointerDown}
            className={`select-none flex ${isNearTop ? 'flex-col' : 'flex-col-reverse'} ${isNearLeft ? 'items-start' : 'items-end'} group cursor-grab active:cursor-grabbing`}
        >
            {/* Mascot Container and Interactive Controls */}
            <div className="flex items-end gap-2 relative">
                {/* Drag Indicator on Hover */}
                <div className="absolute -top-2 -left-2 opacity-0 group-hover:opacity-100 transition duration-150 w-5 h-5 bg-gray-800/80 text-white rounded-full flex items-center justify-center pointer-events-none z-10">
                    <Move size={10} />
                </div>

                {/* Control Panel (Mini Floating Toolbar) */}
                <div className="flex flex-col gap-1 bg-white/95 backdrop-blur-xs border border-gray-200 rounded-xl p-1 shadow-md mb-1">
                    {/* Ask Time Button */}
                    <button
                        type="button"
                        onClick={askTime}
                        className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                        title="คลิกเพื่อถามเวลาคงเหลือ"
                    >
                        <Clock size={15} />
                    </button>

                    {/* Sleep / Wake Button */}
                    <button
                        type="button"
                        onClick={toggleSleep}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                            isSleeping 
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' 
                                : 'text-gray-600 hover:text-amber-600 hover:bg-amber-50'
                        }`}
                        title={isSleeping ? 'ปลุกผู้ช่วยสอบ' : 'สั่งให้นั่งหลับอยู่นิ่งๆ (ไม่รบกวน)'}
                    >
                        {isSleeping ? <Sun size={15} /> : <Moon size={15} />}
                    </button>

                    {/* Hide Button */}
                    <button
                        type="button"
                        onClick={toggleHide}
                        className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        title="ซ่อนผู้ช่วยสอบ"
                    >
                        <EyeOff size={15} />
                    </button>
                </div>

                {/* Mascot Avatar and Countdown Tag */}
                <div className="flex flex-col items-center">
                    {/* Mini Countdown Badge on Mascot */}
                    {timeLeft !== null && (
                        <button
                            type="button"
                            onClick={handleAvatarClick}
                            className={`mb-1 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold shadow-xs border transition cursor-pointer flex items-center gap-1 ${
                                isUrgent
                                    ? 'bg-red-500 text-white border-red-600 animate-pulse'
                                    : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                            }`}
                            title="เวลานับถอยหลัง (คลิกเพื่อถามเวลา)"
                        >
                            <Clock size={11} className={isUrgent ? 'animate-spin' : ''} />
                            <span>{formatDigitalTime(timeLeft)}</span>
                        </button>
                    )}

                    {/* Pixel Mascot Avatar Graphic */}
                    <div 
                        onClick={handleAvatarClick}
                        className={`transition-transform duration-200 hover:scale-105 active:scale-95 ${
                            isSleeping ? 'opacity-85' : ''
                        }`}
                        title={isSleeping ? 'กำลังหลับนิ่งๆ (คลิกเพื่อปลุก หรือลากเพื่อย้ายที่)' : 'คลิกเพื่อถามเวลา หรือลากเพื่อย้ายที่'}
                    >
                        <PixelMascotSprite
                            species={mascotConfig.species || 'owl'}
                            themeId={mascotConfig.themeId}
                            hatId={mascotConfig.hatId}
                            accessoryId={mascotConfig.accessoryId}
                            expression={mascotState}
                            walkFrame={walkFrame}
                            size={68}
                        />
                    </div>
                </div>
            </div>

            {/* Speech Bubble (Pixel / Retro Chat Box) */}
            {speech && (
                <div className={`${isNearTop ? 'mt-2' : 'mb-2'} max-w-xs sm:max-w-sm bg-white border-2 border-gray-800 rounded-xl p-3 shadow-xl text-gray-800 font-sans text-xs relative animate-fade-in`}>
                    {/* Header with dismiss button */}
                    <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-gray-100">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                            <Sparkles size={13} className="text-indigo-600" />
                            <span>ผู้ช่วยสอบ</span>
                        </div>
                        <button
                            type="button"
                            onClick={dismissSpeech}
                            className="text-gray-400 hover:text-gray-700 p-0.5 rounded transition cursor-pointer"
                            title="ปิดข้อความ"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {/* Speech Content */}
                    <p className="leading-relaxed text-gray-750 font-medium">
                        {speech.text}
                    </p>

                    {/* Quick action buttons in speech bubble */}
                    {speech.actions && speech.actions.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-gray-100 flex flex-wrap gap-1.5">
                            {speech.actions.map((act, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={act.onClick}
                                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                                >
                                    {act.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Speech Bubble Tail */}
                    {!isNearTop ? (
                        <>
                            <div 
                                className={`absolute -bottom-2 ${isNearLeft ? 'left-8' : 'right-8'} w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-gray-800`}
                            />
                            <div 
                                className={`absolute -bottom-1.5 ${isNearLeft ? 'left-8' : 'right-8'} w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-white`}
                            />
                        </>
                    ) : (
                        <>
                            <div 
                                className={`absolute -top-2 ${isNearLeft ? 'left-8' : 'right-8'} w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-gray-800`}
                            />
                            <div 
                                className={`absolute -top-1.5 ${isNearLeft ? 'left-8' : 'right-8'} w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[6px] border-b-white`}
                            />
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default PixelMascot;
