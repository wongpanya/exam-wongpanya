import { useState, useRef } from 'react';
import { Image as ImageIcon, Trash2, Maximize2, RefreshCw, Loader2, UploadCloud } from 'lucide-react';
import { compressImage, formatBytes } from '../utils/imageCompressor';
import ImageLightboxModal from './ImageLightboxModal';

const QuestionImageUploader = ({ imageUrl, onChange, disabled = false, label = 'รูปภาพประกอบโจทย์' }) => {
    const fileInputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);
    const [error, setError] = useState('');
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [imgStats, setImgStats] = useState(null);

    const handleProcessFile = async (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setError('กรุณาเลือกไฟล์ภาพที่ถูกต้อง (PNG, JPG, WebP, GIF)');
            return;
        }

        setError('');
        setIsCompressing(true);
        try {
            const result = await compressImage(file, 1200, 1200, 0.8);
            setImgStats({
                originalSize: result.originalSize,
                compressedSize: result.compressedSize,
                dimensions: `${result.width} × ${result.height}`,
                format: result.format.toUpperCase(),
            });
            onChange(result.dataUrl);
        } catch (err) {
            console.error('Image compression failed:', err);
            setError(err.message || 'ไม่สามารถประมวลผลรูปภาพได้');
        } finally {
            setIsCompressing(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            handleProcessFile(file);
        }
        e.target.value = ''; // Reset input to allow re-uploading same file if desired
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (disabled) return;

        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            handleProcessFile(files[0]);
        }
    };

    const handlePaste = (e) => {
        if (disabled) return;
        const clipboardItems = e.clipboardData?.items;
        if (!clipboardItems) return;

        for (const item of clipboardItems) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    e.preventDefault();
                    handleProcessFile(file);
                    break;
                }
            }
        }
    };

    const handleRemoveImage = () => {
        setImgStats(null);
        setError('');
        onChange(null);
    };

    return (
        <div
            className="my-3 text-left"
            onPaste={handlePaste}
            tabIndex={0}
            role="region"
            aria-label="เครื่องมือแนบรูปภาพ"
        >
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={disabled}
            />

            {/* If Image is Attached */}
            {imageUrl ? (
                <div className="relative rounded-xl border border-gray-200 bg-gray-50/70 p-3 transition-all hover:border-indigo-200">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        {/* Image Thumbnail with zoom trigger */}
                        <div
                            className="relative group w-full sm:w-40 h-28 bg-white rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center cursor-pointer flex-shrink-0"
                            onClick={() => setLightboxOpen(true)}
                            title="คลิกเพื่อดูภาพขนาดเต็ม"
                        >
                            <img
                                src={imageUrl}
                                alt={label}
                                className="w-full h-full object-contain p-1 group-hover:scale-105 transition duration-200"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1 text-xs font-medium">
                                <Maximize2 size={16} />
                                <span>ขยาย</span>
                            </div>
                        </div>

                        {/* Image Info & Actions */}
                        <div className="flex-1 w-full space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                                        รูปภาพประกอบ
                                    </span>
                                    {imgStats && (
                                        <span className="text-xs text-gray-500">
                                            {formatBytes(imgStats.compressedSize)} ({imgStats.format}) · {imgStats.dimensions}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <p className="text-xs text-gray-500">
                                บีบอัดพร้อมบันทึก หรือกดวาง (Ctrl+V) เพื่อเปลี่ยนภาพใหม่ได้ทันที
                            </p>

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setLightboxOpen(true)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-medium hover:bg-gray-50 transition shadow-sm"
                                >
                                    <Maximize2 size={13} />
                                    <span>ดูภาพเต็ม</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={disabled || isCompressing}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-medium hover:bg-gray-50 transition shadow-sm"
                                >
                                    <RefreshCw size={13} className={isCompressing ? 'animate-spin' : ''} />
                                    <span>เปลี่ยนภาพ</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRemoveImage}
                                    disabled={disabled}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition shadow-sm ml-auto"
                                >
                                    <Trash2 size={13} />
                                    <span>ลบรูปภาพ</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Empty Upload Zone */
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative rounded-xl border-2 border-dashed p-3 sm:p-4 text-center cursor-pointer transition-all ${
                        isDragging
                            ? 'border-indigo-500 bg-indigo-50/60 scale-[1.005]'
                            : 'border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/20 bg-gray-50/40'
                    }`}
                >
                    {isCompressing ? (
                        <div className="flex flex-col items-center justify-center py-2 text-indigo-600">
                            <Loader2 size={24} className="animate-spin mb-1" />
                            <span className="text-xs font-medium">กำลังบีบอัดรูปภาพ WebP คุณภาพสูง...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-gray-500">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                                <UploadCloud size={18} />
                            </div>
                            <div className="text-xs leading-relaxed">
                                <span className="font-semibold text-indigo-600 hover:underline">คลิกเพื่อเลือกภาพ</span>
                                <span className="hidden sm:inline">, ลากไฟล์มาวาง</span> หรือ{' '}
                                <span className="inline-block px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-[11px] border border-gray-200">
                                    Ctrl + V
                                </span>{' '}
                                เพื่อวางภาพจากแคปหน้าจอ
                            </div>
                            <span className="text-[11px] text-gray-400 font-normal">
                                (บีบอัด WebP อัตโนมัติ ~50-80KB)
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <p className="mt-1.5 text-xs text-red-600">
                    {error}
                </p>
            )}

            {/* Lightbox for Preview */}
            <ImageLightboxModal
                isOpen={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
                imageUrl={imageUrl}
                alt={label}
            />
        </div>
    );
};

export default QuestionImageUploader;
