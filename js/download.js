/**
 * download.js - تحميل الآيات كصورة أو صوت مدمج + تشغيل نطاق
 */
const DownloadManager = {
    modal: null,
    _surahsCache: null,

    init() {
        this.modal = document.getElementById('downloadModal');
        const dlOpenBtn = document.getElementById('downloadOpenBtn');
        if (dlOpenBtn) dlOpenBtn.addEventListener('click', () => this.open());
        this.modal.querySelector('.close-modal').addEventListener('click', () => this.close());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });
        document.getElementById('startDownloadBtn').addEventListener('click', () => this.execute());

        document.getElementById('dlFromSurah').addEventListener('change', () => this._updateAyahLimit('dlFromSurah', 'dlFromAyah'));
        document.getElementById('dlToSurah').addEventListener('change', () => this._updateAyahLimit('dlToSurah', 'dlToAyah'));
    },

    open() {
        this._populateSurahSelects();
        this.modal.classList.add('active');
    },

    close() {
        this.modal.classList.remove('active');
        document.getElementById('downloadStatus').textContent = '';
    },

    _populateSurahSelects() {
        const currentData = DataHandler.cache[App.currentReading];
        if (!currentData) return;
        this._surahsCache = DataHandler.getSurahs(currentData);

        ['dlFromSurah', 'dlToSurah'].forEach(id => {
            const sel = document.getElementById(id);
            // It's an input type=number now, not a select!
            // Wait, in my HTML I made them inputs! Let's change them back to selects or handle inputs.
            // Oh, I will handle them as inputs. Wait, the user has to type Surah number.
            // That's fine, I don't need to populate them. 
        });
        // Since we changed them to inputs in HTML, no need to populate options.
        // We just set min, max.
        const dlFrom = document.getElementById('dlFromSurah');
        const dlTo = document.getElementById('dlToSurah');
        if (dlFrom) { dlFrom.min = 1; dlFrom.max = 114; }
        if (dlTo) { dlTo.min = 1; dlTo.max = 114; }

        if (App.currentSurah) {
            document.getElementById('dlFromSurah').value = App.currentSurah;
            document.getElementById('dlToSurah').value = App.currentSurah;
        }

        this._updateAyahLimit('dlFromSurah', 'dlFromAyah');
        this._updateAyahLimit('dlToSurah', 'dlToAyah');
    },

    /** تحديث الحد الأقصى لرقم الآية بناء على السورة المختارة */
    _updateAyahLimit(surahSelectId, ayahInputId) {
        const surahNo = parseInt(document.getElementById(surahSelectId).value);
        const ayahInput = document.getElementById(ayahInputId);
        if (!this._surahsCache) return;
        const surah = this._surahsCache.find(s => s.number === surahNo);
        if (surah) {
            ayahInput.max = surah.ayahCount;
            if (parseInt(ayahInput.value) > surah.ayahCount) {
                ayahInput.value = surah.ayahCount;
            }
            if (parseInt(ayahInput.value) < 1) {
                ayahInput.value = 1;
            }
        }
    },

    /** التحقق من صحة النطاق */
    _validateRange() {
        const surahFrom = parseInt(document.getElementById('dlFromSurah').value);
        const ayahFrom = parseInt(document.getElementById('dlFromAyah').value);
        const surahTo = parseInt(document.getElementById('dlToSurah').value);
        const ayahTo = parseInt(document.getElementById('dlToAyah').value);
        const statusEl = document.getElementById('downloadStatus');

        if (surahTo < surahFrom) {
            statusEl.textContent = '⚠️ لا يمكن أن تكون سورة النهاية قبل سورة البداية';
            return null;
        }
        if (surahFrom === surahTo && ayahTo < ayahFrom) {
            statusEl.textContent = '⚠️ لا يمكن أن تكون آية النهاية قبل آية البداية';
            return null;
        }
        return { surahFrom, ayahFrom, surahTo, ayahTo };
    },

    /** تشغيل نطاق محدد */
    async playRange() {
        const range = this._validateRange();
        if (!range) return;
        const statusEl = document.getElementById('downloadStatus');
        const readingKey = App.currentReading;

        const data = await DataHandler.loadReading(readingKey);
        if (!data || data.length === 0) {
            statusEl.textContent = 'خطأ في تحميل البيانات';
            return;
        }

        const ayahs = this._getAyahsInRange(data, range);
        if (ayahs.length === 0) {
            statusEl.textContent = 'لم يتم العثور على آيات';
            return;
        }

        // بناء قائمة تشغيل كاملة
        AudioPlayer.buildPlaylistFromRange(readingKey, ayahs);
        AudioPlayer.currentIndex = 0;
        AudioPlayer._playCurrentTrack();

        statusEl.textContent = `▶ جاري تشغيل ${ayahs.length} آية`;
        this.close();
    },

    async execute() {
        const range = this._validateRange();
        if (!range) return;
        const readingKey = App.currentReading;
        const statusEl = document.getElementById('downloadStatus');

        statusEl.textContent = 'جاري التجهيز...';

        const data = await DataHandler.loadReading(readingKey);
        if (!data || data.length === 0) {
            statusEl.textContent = 'خطأ في تحميل البيانات';
            return;
        }

        const ayahs = this._getAyahsInRange(data, range);
        if (ayahs.length === 0) {
            statusEl.textContent = 'لم يتم العثور على آيات في هذا النطاق';
            return;
        }

        // Remove image download logic, keep only audio
        await this._downloadAsMergedAudio(ayahs, readingKey, statusEl);
    },

    /** استخراج الآيات في النطاق المحدد */
    _getAyahsInRange(data, { surahFrom, ayahFrom, surahTo, ayahTo }) {
        return data.filter(a => {
            if (a.aya_no === 0) return false;
            if (surahFrom === surahTo) {
                return a.sura_no === surahFrom && a.aya_no >= ayahFrom && a.aya_no <= ayahTo;
            }
            if (a.sura_no === surahFrom) return a.aya_no >= ayahFrom;
            if (a.sura_no === surahTo) return a.aya_no <= ayahTo;
            return a.sura_no > surahFrom && a.sura_no < surahTo;
        }).sort((a, b) => a.sura_no !== b.sura_no ? a.sura_no - b.sura_no : a.aya_no - b.aya_no);
    },

    async _downloadAsImage(ayahs, readingKey, statusEl) {
        statusEl.textContent = 'جاري إنشاء الصورة...';
        const config = READINGS_CONFIG[readingKey];
        const captureArea = document.getElementById('imageCaptureArea');

        let html = `<div style="direction:rtl;text-align:center;padding:40px 30px;max-width:800px;background:#fff;font-family:'${config.fontFamily}',serif;">`;
        html += `<h2 style="color:#10b981;margin-bottom:20px;font-family:sans-serif;">${config.name}</h2>`;

        let currentSurah = null;
        ayahs.forEach(a => {
            if (a.sura_no !== currentSurah) {
                currentSurah = a.sura_no;
                html += `<h3 style="color:#064e3b;margin:15px 0;font-family:sans-serif;">سورة ${a.sura_name_ar}</h3>`;
            }
            html += `<span style="font-size:28px;line-height:2;">${a.aya_text} </span>`;
        });
        html += '</div>';
        captureArea.innerHTML = html;

        try {
            const canvas = await html2canvas(captureArea, { scale: 2, useCORS: true });
            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `quran_${readingKey}_${ayahs[0].sura_no}_${ayahs[0].aya_no}.png`;
                a.click();
                URL.revokeObjectURL(url);
                statusEl.textContent = 'تم التحميل بنجاح ✓';
            });
        } catch (err) {
            statusEl.textContent = 'حدث خطأ أثناء إنشاء الصورة';
            console.error(err);
        }
        captureArea.innerHTML = '';
    },

    /** تحميل صوت مدمج - كل الآيات في ملف واحد */
    async _downloadAsMergedAudio(ayahs, readingKey, statusEl) {
        const config = READINGS_CONFIG[readingKey];
        const audioBlobs = [];
        let loaded = 0;

        for (const ayah of ayahs) {
            statusEl.textContent = `جاري التحميل... ${++loaded}/${ayahs.length}`;
            const url = config.getAudioPath(ayah);
            try {
                const resp = await fetch(url);
                if (resp.ok) {
                    const blob = await resp.blob();
                    audioBlobs.push(blob);
                }
            } catch (e) {
                console.warn(`تخطي: ${url}`);
            }
        }

        if (audioBlobs.length === 0) {
            statusEl.textContent = 'لم يتم العثور على ملفات صوتية';
            return;
        }

        statusEl.textContent = 'جاري دمج الصوت...';
        // دمج كل ملفات MP3 في ملف واحد (MP3 يدعم التسلسل المباشر)
        const mergedBlob = new Blob(audioBlobs, { type: 'audio/mpeg' });
        const url = URL.createObjectURL(mergedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quran_${readingKey}_${ayahs[0].sura_no}-${ayahs[0].aya_no}_to_${ayahs[ayahs.length-1].sura_no}-${ayahs[ayahs.length-1].aya_no}.mp3`;
        a.click();
        URL.revokeObjectURL(url);
        statusEl.textContent = 'تم التحميل بنجاح ✓';
    }
};
