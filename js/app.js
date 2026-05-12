/**
 * app.js - المحرك الرئيسي للتطبيق
 * يربط بين البيانات والواجهة والصوت
 */
const App = {
    currentReading: 'Hafs',
    currentPage: 1,
    currentSurah: 1,

    async init() {
        console.log("App Initializing...");
        AudioPlayer.init();
        UI.init();
        
        // تحميل القوائم
        UI.populateSurahs(SURAHS);
        UI.populateJozzList(JOZZ_LIST);

        // ربط أحداث التغيير
        this._bindEvents();

        // تحميل الصفحة الأولى افتراضياً
        await this.loadPage(1);
    },

    _bindEvents() {
        // تغيير الرواية
        document.getElementById('readingSelect').addEventListener('change', (e) => {
            this.currentReading = e.target.value;
            this.loadPage(this.currentPage);
        });

        // تغيير السورة
        document.getElementById('surahSelect').addEventListener('change', (e) => {
            const surahNo = parseInt(e.target.value);
            const surah = SURAHS.find(s => s.number === surahNo);
            if (surah) this.loadPage(surah.startPage);
        });

        // تغيير الجزء
        document.getElementById('jozzSelect').addEventListener('change', (e) => {
            const jozzNo = parseInt(e.target.value);
            const page = JOZZ_TO_PAGE[jozzNo];
            if (page) this.loadPage(page);
        });
    },

    async loadPage(pageNo) {
        if (pageNo < 1 || pageNo > 604) return;
        
        this.currentPage = pageNo;
        UI.showLoader();
        AudioPlayer.stop(); // إيقاف الصوت عند الانتقال لمنع التداخل

        try {
            const ayahs = await DataHandler.getPageAyahs(this.currentReading, pageNo);
            if (ayahs && ayahs.length > 0) {
                this.currentSurah = ayahs[0].sura_no;
                UI.renderAyahs(ayahs, this.currentReading, this.currentSurah);
                UI.updatePageInfo(pageNo, 604);
                
                // تحديث اختيار السورة في القائمة
                document.getElementById('surahSelect').value = this.currentSurah;
            }
        } catch (error) {
            console.error("Error loading page:", error);
        }
    }
};

// تشغيل التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => App.init());
