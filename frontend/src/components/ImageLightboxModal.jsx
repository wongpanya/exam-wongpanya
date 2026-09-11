import { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Move } from 'lucide-react';

const ImageLightboxModal = ({ isOpen, onClose, imageUrl, alt = 'รูปประกอบข้อสอบ' }) => {
    const [zoomLevel, setZoomLevel] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    const dragOriginRef = useRef({ x: 0, y: 0 });
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    // Reset zoom and position ONLY when opening a new modal/image, never on parent component re-renders (e.g. timers)
    const prevOpenRef = useRef(false);
    useEffect(() => {
        if (isOpen && (!prevOpenRef.current || !imageUrl)) {
            setZoomLevel(1);
            setPosition({ x: 0, y: 0 });
            setIsDragging(false);
        }
        prevOpenRef.current = isOpen;
    }, [isOpen, imageUrl]);

    // Handle ESC key without re-triggering effects on parent re-renders
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                e.preventDefault();
                onCloseRef.current?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [isOpen]);

    if (!isOpen || !imageUrl) return null;

    const handleZoomIn = (e) => {
        e?.stopPropagation();
        setZoomLevel(prev => Math.min(Number((prev + 0.3).toFixed(2)), 4));
    };

    const handleZoomOut = (e) => {
        e?.stopPropagation();
        setZoomLevel(prev => {
            const next = Math.max(Number((prev - 0.3).toFixed(2)), 0.5);
            if (next <= 1) {
                setPosition({ x: 0, y: 0 });
            }
            return next;
        });
    };

    const handleResetZoom = (e) => {
        e?.stopPropagation();
        setZoomLevel(1);
        setPosition({ x: 0, y: 0 });
    };

    const handleWheel = (e) => {
        // Allow user to zoom in/out with mouse wheel when over the image
        e.stopPropagation();
        if (e.deltaY < 0) {
            setZoomLevel(prev => Math.min(Number((prev + 0.2).toFixed(2)), 4));
        } else if (e.deltaY > 0) {
            setZoomLevel(prev => {
                const next = Math.max(Number((prev - 0.2).toFixed(2)), 0.5);
                if (next <= 1) {
                    setPosition({ x: 0, y: 0 });
                }
                return next;
            });
        }
    };

    // Double click to toggle zoom (1x <-> 2x)
    const handleDoubleClick = (e) => {
        e.stopPropagation();
        if (zoomLevel > 1) {
            setZoomLevel(1);
            setPosition({ x: 0, y: 0 });
        } else {
            setZoomLevel(2);
        }
    };

    // Pointer Events for smooth drag/pan (works for Mouse and Touch on all devices)
    const handlePointerDown = (e) => {
        // Allow dragging whenever zoomed in or if user clicks on the image
        if (zoomLevel <= 1) return;
        e.preventDefault();
        e.stopPropagation();

        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
            // ignore if not supported
        }

        dragOriginRef.current = {
            startX: e.clientX - position.x,
            startY: e.clientY - position.y,
        };
        setIsDragging(true);
    };

    const handlePointerMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        e.stopPropagation();

        const newX = e.clientX - dragOriginRef.current.startX;
        const newY = e.clientY - dragOriginRef.current.startY;
        setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        e.stopPropagation();

        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
            // ignore
        }
        setIsDragging(false);
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4 select-none animate-fadeIn"
            onClick={onClose}
        >
            {/* Top Toolbar */}
            <div
                className="w-full max-w-4xl flex items-center justify-between px-4 py-2.5 text-white bg-gray-900/90 rounded-t-xl border-b border-gray-700/60 shadow-lg"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="text-xs sm:text-sm font-medium text-gray-200 truncate">
                        {alt}
                    </span>
                    {zoomLevel > 1 && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-amber-400/90 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/40">
                            <Move size={11} />
                            <span>คลิกลากเพื่อเลื่อนดูภาพ</span>
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={handleZoomOut}
                        disabled={zoomLevel <= 0.5}
                        className="p-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-40 transition text-gray-300 hover:text-white cursor-pointer"
                        title="ย่อภาพ (-)"
                    >
                        <ZoomOut size={18} />
                    </button>
                    <span className="text-xs text-gray-300 min-w-[48px] text-center font-mono font-semibold">
                        {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                        type="button"
                        onClick={handleZoomIn}
                        disabled={zoomLevel >= 4}
                        className="p-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-40 transition text-gray-300 hover:text-white cursor-pointer"
                        title="ขยายภาพ (+)"
                    >
                        <ZoomIn size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={handleResetZoom}
                        className="p-1.5 rounded-lg hover:bg-gray-800 transition text-gray-300 hover:text-white cursor-pointer"
                        title="รีเซ็ตขนาดและตำแหน่งเดิม (100%)"
                    >
                        <RotateCcw size={16} />
                    </button>
                    <div className="w-px h-5 bg-gray-700 mx-1" />
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-red-600/80 bg-gray-800/80 text-white transition cursor-pointer"
                        title="ปิดหน้าต่าง (Esc)"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Image Viewer Body */}
            <div
                className={`relative w-full max-w-4xl flex-1 max-h-[85vh] bg-gray-950/90 rounded-b-xl overflow-hidden flex items-center justify-center p-4 border border-t-0 border-gray-700/60 shadow-2xl ${
                    zoomLevel > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
                }`}
                onClick={(e) => e.stopPropagation()}
                onWheel={handleWheel}
                onDoubleClick={handleDoubleClick}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                <div
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel})`,
                        transformOrigin: 'center center',
                        transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                        willChange: 'transform',
                    }}
                    className="flex items-center justify-center pointer-events-none select-none"
                >
                    <img
                        src={imageUrl}
                        alt={alt}
                        className="max-h-[72vh] max-w-full object-contain rounded-lg shadow-2xl select-none"
                        draggable={false}
                    />
                </div>

                {/* Floating guide badge when zoomed in */}
                {zoomLevel > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/75 backdrop-blur-xs text-white/90 text-xs font-medium flex items-center gap-1.5 shadow-md pointer-events-none border border-white/10 sm:hidden">
                        <Move size={12} className="text-amber-400" />
                        <span>แตะค้างแล้วลากเพื่อเลื่อนภาพ</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageLightboxModal;
