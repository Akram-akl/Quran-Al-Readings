/**
 * saveFile.js - حفظ الملفات في المتصفح أو داخل تطبيق Android (APK)
 * يستخدم @capacitor-community/media لحفظ الصور مباشرة في معرض الأندرويد
 */
const SaveFile = {
    _blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result || '';
                resolve(String(result).split(',')[1] || '');
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    },

    /** حفظ صورة مباشرة في معرض الأندرويد عبر MediaStore */
    async _saveImageToGallery(blob, filename) {
        const isNative = window.Capacitor?.isNativePlatform?.() === true;
        if (!isNative) return { ok: false };

        // محاولة استخدام @capacitor-community/media (أفضل طريقة)
        const Media = window.Capacitor?.Plugins?.Media;
        if (Media?.savePhoto) {
            try {
                // أولاً: احفظ الملف في CACHE للحصول على URI
                const base64Data = await this._blobToBase64(blob);
                const Filesystem = window.Capacitor?.Plugins?.Filesystem;
                const tempFile = await Filesystem.writeFile({
                    path: `quran_temp_${Date.now()}.png`,
                    data: base64Data,
                    directory: 'CACHE',
                    recursive: true
                });

                // ثانياً: أضفه للمعرض باستخدام Media plugin
                await Media.savePhoto({ path: tempFile.uri });

                // احذف الملف المؤقت
                try {
                    await Filesystem.deleteFile({
                        path: `quran_temp_${Date.now()}.png`,
                        directory: 'CACHE'
                    });
                } catch (_) { /* لا يهم */ }

                return { ok: true, method: 'gallery' };
            } catch (err) {
                console.warn('Media.savePhoto failed:', err);
            }
        }

        // احتياط: استخدام Filesystem مع PICTURES
        const Filesystem = window.Capacitor?.Plugins?.Filesystem;
        if (Filesystem?.writeFile) {
            try {
                const base64 = await this._blobToBase64(blob);
                await Filesystem.writeFile({
                    path: `Quran/${filename}`,
                    data: base64,
                    directory: 'PICTURES',
                    recursive: true
                });
                return { ok: true, method: 'filesystem' };
            } catch (e) {
                console.warn('Filesystem PICTURES save failed:', e);
            }
        }

        return { ok: false };
    },

    /** مشاركة ملف عبر Share plugin أو Web Share API */
    async share(blob, filename) {
        const isNative = window.Capacitor?.isNativePlatform?.() === true;
        if (isNative && window.Capacitor?.Plugins?.Share) {
            try {
                const base64Data = await this._blobToBase64(blob);
                const savedFile = await window.Capacitor.Plugins.Filesystem.writeFile({
                    path: `Quran/share_temp_${Date.now()}.${filename.split('.').pop()}`,
                    data: base64Data,
                    directory: 'CACHE',
                    recursive: true
                });
                await window.Capacitor.Plugins.Share.share({
                    title: 'مشاركة',
                    text: 'تطبيق القراءات الميسرة',
                    url: savedFile.uri,
                    dialogTitle: 'مشاركة الملف'
                });
                return { ok: true, method: 'share' };
            } catch (err) {
                if (err?.message?.includes('cancel') || err?.message?.includes('abort')) {
                    return { ok: false, cancelled: true };
                }
                console.warn('Capacitor share failed:', err);
                return { ok: false };
            }
        }

        if (!navigator.share) return { ok: false };
        try {
            const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
            if (navigator.canShare && !navigator.canShare({ files: [file] })) {
                return { ok: false };
            }
            await navigator.share({ files: [file], title: filename });
            return { ok: true, method: 'share' };
        } catch (err) {
            if (err.name === 'AbortError') return { ok: false, cancelled: true };
            return { ok: false };
        }
    },

    /** الحفظ العام - للملفات الصوتية وغيرها */
    async save(blob, filename) {
        const isNative = window.Capacitor?.isNativePlatform?.() === true;
        const isImage = blob.type && blob.type.startsWith('image');

        if (isNative) {
            if (isImage) {
                // للصور: احفظ مباشرة في المعرض
                const result = await this._saveImageToGallery(blob, filename);
                if (result.ok) return result;
                return { ok: false, message: 'تعذّر الحفظ في المعرض. حاول مجدداً أو استخدم المشاركة.' };
            }

            // للملفات الصوتية: احفظ في CACHE وشارك
            try {
                const Filesystem = window.Capacitor?.Plugins?.Filesystem;
                const base64 = await this._blobToBase64(blob);
                const result = await Filesystem.writeFile({
                    path: `Quran/${filename}`,
                    data: base64,
                    directory: 'CACHE',
                    recursive: true
                });
                return { ok: true, method: 'cache', uri: result.uri };
            } catch (e) {
                console.warn('Audio save to cache failed:', e);
            }

            return { ok: false, message: 'تعذّر حفظ الملف.' };
        }

        // المتصفح: تحميل مباشر
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        return { ok: true, method: 'browser' };
    }
};
