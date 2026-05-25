/**
 * saveFile.js - حفظ الملفات في المتصفح أو داخل تطبيق Android (APK)
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

    async _saveViaShare(blob, filename) {
        if (window.Capacitor?.isNativePlatform?.() === true && window.Capacitor?.Plugins?.Share) {
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
                console.warn("Capacitor share failed:", err);
                return { ok: false };
            }
        }
        
        if (!navigator.share) return { ok: false };
        const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
        if (navigator.canShare && !navigator.canShare({ files: [file] })) {
            return { ok: false };
        }
        await navigator.share({ files: [file], title: filename });
        return { ok: true, method: 'share' };
    },

    async _saveViaFilesystem(blob, filename) {
        const Filesystem = window.Capacitor?.Plugins?.Filesystem;
        if (!Filesystem?.writeFile) return { ok: false };

        const base64 = await this._blobToBase64(blob);
        const dir = (blob.type && blob.type.startsWith('image')) ? 'PICTURES' : 'DOCUMENTS';
        
        const result = await Filesystem.writeFile({
            path: `Quran/${filename}`,
            data: base64,
            directory: dir,
            recursive: true
        });
        return { ok: true, method: 'filesystem', uri: result.uri, type: blob.type };
    },

    async save(blob, filename) {
        const isNative = window.Capacitor?.isNativePlatform?.() === true;

        if (isNative) {
            const isImage = blob.type && blob.type.startsWith('image');
            if (isImage) {
                try {
                    const shared = await this._saveViaShare(blob, filename);
                    if (shared.ok) return shared;
                } catch (e) {
                    console.warn('Share image failed:', e);
                }
                return {
                    ok: false,
                    message: 'تعذر الحفظ في المعرض. يمكنك تجربة المشاركة لحفظها.'
                };
            }

            try {
                const fs = await this._saveViaFilesystem(blob, filename);
                if (fs.ok) return fs;
            } catch (e) {
                console.warn('Filesystem save to public dir failed, trying CACHE:', e);
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
                } catch (cacheErr) {
                    console.warn('Filesystem CACHE save failed:', cacheErr);
                }
            }
            try {
                const shared = await this._saveViaShare(blob, filename);
                if (shared.ok) return shared;
            } catch (e) {
                if (e.name === 'AbortError') return { ok: false, cancelled: true };
                console.warn('Share save failed:', e);
            }
            return {
                ok: false,
                message: 'لم يُحفظ الملف، يرجى إعطاء التطبيق صلاحيات التخزين أو مشاركته.'
            };
        }

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
