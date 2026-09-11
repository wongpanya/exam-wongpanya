/**
 * Client-side image compressor utility
 * Compresses images (PNG, JPEG, WebP, GIF, etc.) to lightweight WebP format
 * using HTML5 Canvas before persisting as Base64 to MongoDB Atlas.
 */

export const formatBytes = (bytes, decimals = 1) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const compressImage = (fileOrBlob, maxWidth = 1200, maxHeight = 1200, quality = 0.8) => {
    return new Promise((resolve, reject) => {
        if (!fileOrBlob) {
            return reject(new Error('ไม่พบไฟล์รูปภาพ'));
        }

        // Validate type if file has type
        if (fileOrBlob.type && !fileOrBlob.type.startsWith('image/')) {
            return reject(new Error('ไฟล์ที่เลือกไม่ใช่รูปภาพ กรุณาเลือกไฟล์ภาพ (PNG, JPG, WebP, GIF)'));
        }

        const originalSize = fileOrBlob.size || 0;
        const objectUrl = URL.createObjectURL(fileOrBlob);
        const img = new Image();

        img.onload = () => {
            try {
                URL.revokeObjectURL(objectUrl);

                let { width, height } = img;

                // Scale down proportionally if larger than maximum dimension
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('เบราว์เซอร์ไม่รองรับ HTML Canvas 2D'));
                }

                // WebP supports transparency natively, clear canvas ensures clean background
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                // Attempt WebP export first
                let dataUrl = canvas.toDataURL('image/webp', quality);
                let format = 'webp';

                // Fallback to JPEG if browser does not support WebP canvas export
                if (!dataUrl.startsWith('data:image/webp')) {
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                    format = 'jpeg';
                }

                // Calculate base64 binary size
                const base64Content = dataUrl.split(',')[1] || '';
                const compressedSize = Math.round((base64Content.length * 3) / 4);

                resolve({
                    dataUrl,
                    format,
                    width,
                    height,
                    originalSize,
                    compressedSize,
                });
            } catch (err) {
                reject(err);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
        };

        img.src = objectUrl;
    });
};
