import { useState, useEffect, useRef, useCallback } from 'react';
import { PixelMascotSprite } from './PixelSprites';
import MascotCustomizer, { MASCOT_CONFIG_STORAGE_KEY } from './MascotCustomizer';
import { Settings, Sparkles, X, Move } from 'lucide-react';

/**
 * DraggableStudentMascot Component:
 * An interactive, draggable mascot companion on the /student dashboard.
 * - Sits in the screen corner by default
 * - Can be dragged anywhere on the screen
 * - Has an edit/settings button to open the customization modal
 * - Supports Owl, Cat, and Dog
 * STRICTLY NO EMOJIS.
 */
export const DraggableStudentMascot = () => {
    const [config, setConfig] = useState(() => {
        try {
            const saved = localStorage.getItem(MASCOT_CONFIG_STORAGE_KEY);
            return saved ? JSON.parse(saved) : { species: 'owl', themeId: 'classic', hatId: 'none', accessoryId: 'none' };
        } catch {
            return { species: 'owl', themeId: 'classic', hatId: 'none', accessoryId: 'none' };
        }
    });

    const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
    const [speechText, setSpeechText] = useState('สวัสดี! ลากฉันไปวางตรงไหนก็ได้ หรือกดปุ่มตั้งค่าเพื่อแต่งตัวให้ฉันนะ');
    const [showSpeech, setShowSpeech] = useState(false);
    const [walkFrame, setWalkFrame] = useState(0);

    // Draggable position state
    const [position, setPosition] = useState({ x: null, y: null });
    const isDraggingRef = useRef(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });
    const hasMovedRef = useRef(false);
    const mascotRef = useRef(null);

    // Set initial position at bottom-right corner
    useEffect(() => {
        const setInitialPos = () => {
            const initialX = Math.max(20, window.innerWidth - 130);
            const initialY = Math.max(20, window.innerHeight - 150);
            setPosition({ x: initialX, y: initialY });
        };
        setInitialPos();
        window.addEventListener('resize', setInitialPos);
        return () => window.removeEventListener('resize', setInitialPos);
    }, []);

    // Listen to storage changes to update mascot clothing/species
    useEffect(() => {
        const handleStorage = () => {
            try {
                const saved = localStorage.getItem(MASCOT_CONFIG_STORAGE_KEY);
                if (saved) setConfig(JSON.parse(saved));
            } catch {
                // ignore
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    // Gentle animation loop
    useEffect(() => {
        const timer = setInterval(() => {
            setWalkFrame(f => (f === 0 ? 1 : 0));
        }, 800);
        return () => clearInterval(timer);
    }, []);

    // Pointer down handler for dragging
    const handlePointerDown = (e) => {
        // Don't drag if clicking buttons inside
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

            // Clamp inside viewport
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

    // Click handler when not dragged
    const handleClick = () => {
        if (!hasMovedRef.current) {
            setShowSpeech(prev => !prev);
        }
    };

    // Do not render until position is calculated
    if (position.x === null) return null;

    return (
        <>
            <div
                ref={mascotRef}
                style={{
                    position: 'fixed',
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    zIndex: 45,
                    touchAction: 'none',
                }}
                onPointerDown={handlePointerDown}
                className="select-none flex flex-col items-center group cursor-grab active:cursor-grabbing"
            >
                {/* Speech Bubble */}
                {showSpeech && (
                    <div 
                        className="mb-2 w-56 bg-white border-2 border-gray-800 rounded-xl p-2.5 shadow-xl text-xs text-gray-800 relative animate-fade-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-1 mb-1 border-b border-gray-100">
                            <span className="font-bold text-[11px] text-indigo-600 flex items-center gap-1">
                                <Sparkles size={12} />
                                <span>ผู้ช่วยส่วนตัว</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowSpeech(false)}
                                className="text-gray-400 hover:text-gray-600 p-0.5"
                            >
                                <X size={12} />
                            </button>
                        </div>
                        <p className="text-[11px] leading-relaxed text-gray-650 mb-2">
                            {speechText}
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setShowSpeech(false);
                                setIsCustomizerOpen(true);
                            }}
                            className="w-full py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1"
                        >
                            <Settings size={12} />
                            <span>ปรับแต่งตัวละคร</span>
                        </button>
                    </div>
                )}

                {/* Mascot Body & Action Floating Badges */}
                <div className="relative" onClick={handleClick}>
                    {/* Settings / Customize Action Button */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsCustomizerOpen(true);
                        }}
                        className="absolute -top-1 -right-1 z-10 w-6 h-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-md border-2 border-white transition-transform duration-150 hover:scale-110 cursor-pointer"
                        title="คลิกเพื่อปรับแต่งผู้ช่วยสอบ"
                    >
                        <Settings size={12} />
                    </button>

                    {/* Drag indicator icon */}
                    <div className="absolute -top-1 -left-1 opacity-0 group-hover:opacity-100 transition duration-150 w-5 h-5 bg-gray-800/80 text-white rounded-full flex items-center justify-center pointer-events-none">
                        <Move size={10} />
                    </div>

                    {/* Mascot Pixel Art */}
                    <div className="transition-transform duration-150 hover:scale-105 active:scale-95">
                        <PixelMascotSprite
                            species={config.species || 'owl'}
                            themeId={config.themeId || 'classic'}
                            hatId={config.hatId || 'none'}
                            accessoryId={config.accessoryId || 'none'}
                            expression="idle"
                            walkFrame={walkFrame}
                            size={68}
                        />
                    </div>
                </div>
            </div>

            {/* Customizer Modal */}
            <MascotCustomizer
                isModal={true}
                isOpen={isCustomizerOpen}
                onClose={() => setIsCustomizerOpen(false)}
            />
        </>
    );
};

export default DraggableStudentMascot;
