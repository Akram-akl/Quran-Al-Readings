/**
 * listen.js - نافذة الاستماع المنفصلة من-إلى
 */
const ListenRange = {
    modal: null,
    _surahsCache: null,

    init() {
        this.modal = document.getElementById('listenModal');
        document.getElementById('listenRangeBtn').addEventListener('click', () => this.open());
        this.modal.querySelector('.close-modal').addEventListener('click', () => this.close());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });
        document.getElementById('executeListenBtn').addEventListener('click', () => this.execute());
        document.getElementById('lsSurahFrom').addEventListener('change', () => this._updateAyahLimit('lsSurahFrom', 'lsAyahFrom'));
        document.getElementById('lsSurahTo').addEventListener('change', () => this._updateAyahLimit('lsSurahTo', 'lsAyahTo'));

        // تقييد إدخال الأرقام ديناميكياً لمنع تخطي الحدود أو القيم السالبة بصفحة الاستماع
        const clampInput = (inputId, surahSelectId) => {
            const input = document.getElementById(inputId);
            if (!input) return;
            input.addEventListener('input', () => {
                const surahNo = parseInt(document.getElementById(surahSelectId).value);
                if (!this._surahsCache) return;
                const surah = this._surahsCache.find(s => s.number === surahNo);
                if (surah) {
                    let val = parseInt(input.value);
                    if (isNaN(val)) return;
                    if (val > surah.ayahCount) input.value = surah.ayahCount;
                    if (val < 1) input.value = 1;
                }
            });
            input.addEventListener('blur', () => {
                let val = parseInt(input.value);
                if (isNaN(val) || val < 1) input.value = 1;
            });
        };
        clampInput('lsAyahFrom', 'lsSurahFrom');
        clampInput('lsAyahTo', 'lsSurahTo');
    },

    open() {
        this._populateSurahSelects();
        this.modal.classList.add('active');
    },

    close() {
        this.modal.classList.remove('active');
        document.getElementById('lsStatus').textContent = '';
    },

    _populateSurahSelects() {
        const readingKey = document.getElementById('listenReading').value;
        const currentData = DataHandler.cache[readingKey] || DataHandler.cache[App.currentReading];
        if (!currentData) return;
        this._surahsCache = DataHandler.getSurahs(currentData);

        ['lsSurahFrom', 'lsSurahTo'].forEach(id => {
            const sel = document.getElementById(id);
            sel.innerHTML = '';
            this._surahsCache.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.number;
                opt.textContent = `${s.number}. ${s.nameAr}`;
                sel.appendChild(opt);
            });
        });

        // تعيين الحدود تلقائياً بناءً على الصفحة الحالية المعروضة
        if (typeof UI !== 'undefined' && UI.currentPageAyahs && UI.currentPageAyahs.length > 0) {
            const firstAyah = UI.currentPageAyahs[0];
            const lastAyah = UI.currentPageAyahs[UI.currentPageAyahs.length - 1];

            document.getElementById('lsSurahFrom').value = firstAyah.sura_no;
            this._updateAyahLimit('lsSurahFrom', 'lsAyahFrom');
            document.getElementById('lsAyahFrom').value = firstAyah.aya_no;

            document.getElementById('lsSurahTo').value = lastAyah.sura_no;
            this._updateAyahLimit('lsSurahTo', 'lsAyahTo');
            document.getElementById('lsAyahTo').value = lastAyah.aya_no;
        } else {
            if (App.currentSurah) {
                document.getElementById('lsSurahFrom').value = App.currentSurah;
                document.getElementById('lsSurahTo').value = App.currentSurah;
            }
            this._updateAyahLimit('lsSurahFrom', 'lsAyahFrom');
            this._updateAyahLimit('lsSurahTo', 'lsAyahTo');
            document.getElementById('lsAyahFrom').value = 1;
            document.getElementById('lsAyahTo').value = 1;
        }
    },

    _updateAyahLimit(surahSelectId, ayahInputId) {
        const surahNo = parseInt(document.getElementById(surahSelectId).value);
        const ayahInput = document.getElementById(ayahInputId);
        if (!this._surahsCache) return;
        const surah = this._surahsCache.find(s => s.number === surahNo);
        if (surah) {
            ayahInput.max = surah.ayahCount;
            if (parseInt(ayahInput.value) > surah.ayahCount) ayahInput.value = surah.ayahCount;
            if (parseInt(ayahInput.value) < 1) ayahInput.value = 1;
        }
    },

    async execute() {
        const surahFrom = parseInt(document.getElementById('lsSurahFrom').value);
        const ayahFrom = parseInt(document.getElementById('lsAyahFrom').value);
        const surahTo = parseInt(document.getElementById('lsSurahTo').value);
        const ayahTo = parseInt(document.getElementById('lsAyahTo').value);
        const readingKey = document.getElementById('listenReading').value;
        const statusEl = document.getElementById('lsStatus');

        if (surahTo < surahFrom) {
            statusEl.textContent = '⚠️ لا يمكن أن تكون سورة النهاية قبل سورة البداية';
            return;
        }
        if (surahFrom === surahTo && ayahTo < ayahFrom) {
            statusEl.textContent = '⚠️ لا يمكن أن تكون آية النهاية قبل آية البداية';
            return;
        }

        const data = await DataHandler.loadReading(readingKey);
        if (!data || data.length === 0) {
            statusEl.textContent = 'خطأ في تحميل البيانات';
            return;
        }

        const ayahs = data.filter(a => {
            if (a.aya_no === 0) return false;
            if (surahFrom === surahTo) {
                return a.sura_no === surahFrom && a.aya_no >= ayahFrom && a.aya_no <= ayahTo;
            }
            if (a.sura_no === surahFrom) return a.aya_no >= ayahFrom;
            if (a.sura_no === surahTo) return a.aya_no <= ayahTo;
            return a.sura_no > surahFrom && a.sura_no < surahTo;
        }).sort((a, b) => a.sura_no !== b.sura_no ? a.sura_no - b.sura_no : a.aya_no - b.aya_no);

        if (ayahs.length === 0) {
            statusEl.textContent = 'لم يتم العثور على آيات';
            return;
        }

        AudioPlayer.buildPlaylistFromRange(readingKey, ayahs);
        AudioPlayer.playlistIndex = 0;
        AudioPlayer._playCurrentTrack();

        statusEl.textContent = `▶ جاري تشغيل ${ayahs.length} آية`;
        setTimeout(() => this.close(), 1000);
    }
};
