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
            try {
                const fs = await this._saveViaFilesystem(blob, filename);
                if (fs.ok) return fs;
            } catch (e) {
                console.warn('Filesystem save failed:', e);
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
                message: 'لم يُحفظ الملف. ثبّت آخر APK بعد sync الإضافات، أو استخدم الموقع من المتصفح.'
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
