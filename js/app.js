/**
 * app.js - نقطة الدخول الرئيسية
 * يدير التهيئة والربط بين الوحدات - عرض صفحات
 */
const App = {
    currentReading: 'Hafs',
    currentSurah: 1,
    currentPage: 1,

    async init() {
        try {
            UI.init();
            AudioPlayer.init();
            SearchEngine.init();
            DownloadManager.init();
            ListenRange.init();
            this._bindEvents();
            await this.loadReading('Hafs');
            this._registerSW();
        } catch (err) {
            console.error('خطأ في التهيئة:', err);
            document.getElementById('readingArea').innerHTML = 
                `<div class="loader" style="color:red">خطأ: ${err.message}</div>`;
        }
    },

    _bindEvents() {
        document.getElementById('readingSelect').addEventListener('change', (e) => {
            this.loadReading(e.target.value);
        });
        document.getElementById('surahSelect').addEventListener('change', (e) => {
            this.goToSurah(parseInt(e.target.value));
        });
        document.getElementById('jozzSelect').addEventListener('change', (e) => {
            const jozz = parseInt(e.target.value);
            if (!jozz) return;
            this._loadJozz(jozz);
        });
    },

    async loadReading(readingKey) {
        UI.showLoader();
        this.currentReading = readingKey;

        try {
            const data = await DataHandler.loadReading(readingKey);
            console.log(`تم تحميل ${readingKey}: ${data ? data.length : 0} آية`);
            
            if (!data || data.length === 0) {
                document.getElementById('readingArea').innerHTML = 
                    '<div class="loader">فشل تحميل البيانات - تأكد من اتصال الخادم</div>';
                return;
            }

            const surahs = DataHandler.getSurahs(data);
            UI.populateSurahs(surahs);

            const jozzList = DataHandler.getJozzList(data);
            UI.populateJozzList(jozzList);

            const totalPages = DataHandler.getTotalPages(data);
            console.log(`عدد الصفحات: ${totalPages}`);
            
            // عرض أول صفحة - fallback للسورة إذا لم تنجح الصفحة
            const pageAyahs = DataHandler.getAyahsByPage(data, 1);
            if (pageAyahs.length > 0) {
                this.loadPage(1);
                UI.updatePageInfo(1, totalPages);
            } else {
                // fallback: عرض أول سورة
                console.warn('لا توجد آيات في الصفحة 1، عرض السورة الأولى');
                this._loadSurahDirect(data, 1);
            }
        } catch (err) {
            console.error('خطأ تحميل الرواية:', err);
            document.getElementById('readingArea').innerHTML = 
                `<div class="loader" style="color:red">خطأ: ${err.message}</div>`;
        }
    },

    /** تحميل صفحة بالرقم */
    loadPage(pageNo) {
        const data = DataHandler.cache[this.currentReading];
        if (!data) return;

        this.currentPage = pageNo;
        const ayahs = DataHandler.getAyahsByPage(data, pageNo);
        
        if (ayahs.length === 0) {
            console.warn(`صفحة ${pageNo} فارغة`);
            return;
        }

        const totalPages = DataHandler.getTotalPages(data);
        UI.updatePageInfo(pageNo, totalPages);

        const firstAyah = ayahs[0];
        this.currentSurah = firstAyah.sura_no;
        document.getElementById('surahSelect').value = firstAyah.sura_no;

        UI.renderAyahs(ayahs, this.currentReading, firstAyah.sura_no);
        AudioPlayer.buildPlaylist(this.currentReading, firstAyah.sura_no, ayahs);
    },

    /** عرض سورة مباشرة (fallback) */
    _loadSurahDirect(data, surahNo) {
        const ayahs = DataHandler.getAyahsForSurah(data, surahNo);
        if (ayahs.length === 0) return;
        this.currentSurah = surahNo;
        UI.renderAyahs(ayahs, this.currentReading, surahNo);
        AudioPlayer.buildPlaylist(this.currentReading, surahNo, ayahs);
    },

    goToSurah(surahNo) {
        const data = DataHandler.cache[this.currentReading];
        if (!data) return;
        this.currentSurah = surahNo;
        const page = DataHandler.getPageForSurah(data, surahNo);
        if (page) {
            this.loadPage(page);
        } else {
            this._loadSurahDirect(data, surahNo);
        }
    },

    async _loadJozz(jozz) {
        const data = DataHandler.cache[this.currentReading];
        if (!data) return;
        const ayahs = DataHandler.getAyahsByJozz(data, jozz);
        if (ayahs.length === 0) return;
        const page = ayahs[0].page;
        if (page) {
            this.loadPage(page);
        }
    },

    async switchToReading(readingKey, surahNo, ayahNo) {
        document.getElementById('readingSelect').value = readingKey;
        await this.loadReading(readingKey);
        this.goToSurah(surahNo);

        setTimeout(() => {
            const el = document.querySelector(`[data-ayah="${ayahNo}"][data-surah="${surahNo}"]`);
            if (el) {
                el.classList.add('active');
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 500);
    },

    _registerSW() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(err => {
                console.warn('SW:', err);
            });
        }
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
