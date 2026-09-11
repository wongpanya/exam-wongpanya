import { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const ImageLightboxModal = ({ isOpen, onClose, imageUrl, alt = 'รูปประกอบข้อสอบ' }) => {
    const [zoomLevel, setZoomLevel] = useState(1);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    // Reset zoom ONLY when opening a new modal/image, never on parent component re-renders (e.g. timers)
    const prevOpenRef = useRef(false);
    useEffect(() => {
        if (isOpen && (!prevOpenRef.current || !imageUrl)) {
            setZoomLevel(1);
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
        e.stopPropagation();
        setZoomLevel(prev => Math.min(Number((prev + 0.25).toFixed(2)), 3.5));
    };

    const handleZoomOut = (e) => {
        e.stopPropagation();
        setZoomLevel(prev => Math.max(Number((prev - 0.25).toFixed(2)), 0.5));
    };

    const handleResetZoom = (e) => {
        e.stopPropagation();
        setZoomLevel(1);
    };

    const handleWheel = (e) => {
        // Allow user to zoom in/out with mouse wheel when over the image
        e.stopPropagation();
        if (e.deltaY < 0) {
            setZoomLevel(prev => Math.min(Number((prev + 0.15).toFixed(2)), 3.5));
        } else if (e.deltaY > 0) {
            setZoomLevel(prev => Math.max(Number((prev - 0.15).toFixed(2)), 0.5));
        }
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
                <span className="text-xs sm:text-sm font-medium text-gray-200 truncate pr-2">
                    {alt}
                </span>

                <div className="flex items-center gap-1 sm:gap-2">
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
                        disabled={zoomLevel >= 3.5}
                        className="p-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-40 transition text-gray-300 hover:text-white cursor-pointer"
                        title="ขยายภาพ (+)"
                    >
                        <ZoomIn size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={handleResetZoom}
                        className="p-1.5 rounded-lg hover:bg-gray-800 transition text-gray-300 hover:text-white cursor-pointer"
                        title="รีเซ็ตขนาดปกติ (100%)"
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
                className="w-full max-w-4xl flex-1 max-h-[85vh] bg-gray-950/80 rounded-b-xl overflow-auto flex items-center justify-center p-4 border border-t-0 border-gray-700/60 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                onWheel={handleWheel}
            >
                <div className="flex items-center justify-center min-w-full min-h-full p-2">
                    <img
                        src={imageUrl}
                        alt={alt}
                        style={{
                            transform: `scale(${zoomLevel})`,
                            transformOrigin: 'center center',
                            transition: 'transform 0.12s ease-out',
                        }}
                        className="max-h-[72vh] max-w-full object-contain rounded-lg shadow-2xl select-none"
                        draggable={false}
                    />
                </div>
            </div>
        </div>
    );
};

export default ImageLightboxModal;
