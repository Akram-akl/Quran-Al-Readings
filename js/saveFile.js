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

    /** طلب إذن التخزين عند الحاجة (Android) */
    async _requestStoragePermission() {
        try {
            const Filesystem = window.Capacitor?.Plugins?.Filesystem;
            if (Filesystem) {
                await Filesystem.requestPermissions();
            }
        } catch (e) {
            console.warn('Filesystem permission request failed:', e);
        }
        try {
            const Media = window.Capacitor?.Plugins?.Media;
            if (Media && Media.requestPermissions) {
                await Media.requestPermissions();
            }
        } catch (e) {
            console.warn('Media permission request failed:', e);
        }
        return true;
    },

    /** حفظ صورة مباشرة في معرض الأندرويد */
    async _saveImageToGallery(blob, filename) {
        const isNative = window.Capacitor?.isNativePlatform?.() === true;
        if (!isNative) return { ok: false };

        const Filesystem = window.Capacitor?.Plugins?.Filesystem;
        const Media = window.Capacitor?.Plugins?.Media;
        const GallerySaver = window.Capacitor?.Plugins?.GallerySaver;

        // اطلب الإذن أولاً
        await this._requestStoragePermission();

        // الخيار الأول والأقوى: استخدام البلجن الأصلي المخصص GallerySaver الذي يتعامل مع المعرض مباشرة
        if (GallerySaver?.saveImage) {
            try {
                const base64Data = await this._blobToBase64(blob);
                const res = await GallerySaver.saveImage({
                    base64Data: base64Data,
                    fileName: filename
                });
                if (res && res.success) {
                    console.log('[SaveFile] GallerySaver success path:', res.path);
                    return { ok: true, method: 'custom-gallery-saver' };
                }
            } catch (err) {
                console.warn('[SaveFile] Custom GallerySaver failed:', JSON.stringify(err));
            }
        }

        // الخيار الثاني: Media plugin (الاحتياطي)
        if (Media?.savePhoto) {
            try {
                const base64Data = await this._blobToBase64(blob);
                const tempName = `quran_temp_${Date.now()}.png`;
                const tempFile = await Filesystem.writeFile({
                    path: tempName,
                    data: base64Data,
                    directory: 'CACHE',
                    recursive: true
                });
                console.log('[SaveFile] temp URI:', tempFile.uri);
                await Media.savePhoto({ path: tempFile.uri });
                // حذف الملف المؤقت
                try { await Filesystem.deleteFile({ path: tempName, directory: 'CACHE' }); } catch (_) {}
                return { ok: true, method: 'media-plugin' };
            } catch (err) {
                console.warn('[SaveFile] Media.savePhoto failed:', JSON.stringify(err));
            }
        }

        // الطريقة الثانية: حفظ مباشر في PICTURES
        if (Filesystem?.writeFile) {
            try {
                const base64 = await this._blobToBase64(blob);
                await Filesystem.writeFile({
                    path: `Quran/${filename}`,
                    data: base64,
                    directory: 'PICTURES',
                    recursive: true
                });
                return { ok: true, method: 'filesystem-pictures' };
            } catch (e) {
                console.warn('[SaveFile] Filesystem PICTURES failed:', JSON.stringify(e));
            }
        }

        return { ok: false, message: 'فشل الحفظ: تحقق من الأذونات في الإعدادات' };
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

            // للملفات الصوتية: احفظ في DOCUMENTS وشارك
            try {
                const Filesystem = window.Capacitor?.Plugins?.Filesystem;
                const base64 = await this._blobToBase64(blob);
                const result = await Filesystem.writeFile({
                    path: `Quran/${filename}`,
                    data: base64,
                    directory: 'DOCUMENTS',
                    recursive: true
                });
                return { ok: true, method: 'documents', uri: result.uri };
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
