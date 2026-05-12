/**
 * app.js - المحرك الرئيسي
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
        if (typeof SURAHS !== 'undefined') UI.populateSurahs(SURAHS);
        if (typeof JOZZ_LIST !== 'undefined') UI.populateJozzList(JOZZ_LIST);

        // ربط أحداث التغيير
        this._bindEvents();

        // تحميل الصفحة الأولى
        await this.loadPage(1);
    },

    _bindEvents() {
        const readingSelect = document.getElementById('readingSelect');
        const surahSelect = document.getElementById('surahSelect');
        const jozzSelect = document.getElementById('jozzSelect');

        if (readingSelect) {
            readingSelect.onchange = (e) => {
                this.currentReading = e.target.value;
                this.loadPage(this.currentPage);
            };
        }

        if (surahSelect) {
            surahSelect.onchange = (e) => {
                const surahNo = parseInt(e.target.value);
                const surah = SURAHS.find(s => s.number === surahNo);
                if (surah) this.loadPage(surah.startPage);
            };
        }

        if (jozzSelect) {
            jozzSelect.onchange = (e) => {
                const jozzNo = parseInt(e.target.value);
                // تبسيط منطق الجزء للنماذج الأولية
                const page = (jozzNo - 1) * 20 + 1; 
                this.loadPage(page);
            };
        }
    },

    async loadPage(pageNo) {
        if (pageNo < 1 || pageNo > 604) return;
        
        this.currentPage = pageNo;
        UI.showLoader();
        AudioPlayer.stop();

        try {
            const ayahs = await DataHandler.getPageAyahs(this.currentReading, pageNo);
            if (ayahs && ayahs.length > 0) {
                this.currentSurah = ayahs[0].sura_no;
                UI.renderAyahs(ayahs, this.currentReading);
                UI.updatePageInfo(pageNo, 604);
                
                const surahSelect = document.getElementById('surahSelect');
                if (surahSelect) surahSelect.value = this.currentSurah;
            }
        } catch (error) {
            console.error("Error loading page:", error);
            document.getElementById('readingArea').innerHTML = `<div class="error">خطأ في تحميل الصفحة: ${error.message}</div>`;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
