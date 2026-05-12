/**
 * app.js - المحرك الرئيسي
 */
const App = {
    currentReading: 'Hafs',
    currentPage: 1,
    currentSurah: 1,

    async init() {
        console.log("App Starting...");
        try {
            if (typeof AudioPlayer !== 'undefined') AudioPlayer.init();
            if (typeof UI !== 'undefined') UI.init();
            
            if (typeof SURAHS !== 'undefined') UI.populateSurahs(SURAHS);
            if (typeof JOZZ_LIST !== 'undefined') UI.populateJozzList(JOZZ_LIST);

            this._bindEvents();
            await this.loadPage(1);
        } catch (e) {
            console.error("Critical Init Error:", e);
        }
    },

    _bindEvents() {
        const ids = ['readingSelect', 'surahSelect', 'jozzSelect'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.onchange = (e) => {
                    const val = e.target.value;
                    if (id === 'readingSelect') {
                        this.currentReading = val;
                        this.loadPage(this.currentPage);
                    } else if (id === 'surahSelect') {
                        const s = SURAHS.find(x => x.number == val);
                        if (s) this.loadPage(s.startPage);
                    } else if (id === 'jozzSelect') {
                        this.loadPage((val - 1) * 20 + 1);
                    }
                };
            }
        });
    },

    async loadPage(pageNo) {
        if (pageNo < 1 || pageNo > 604) return;
        this.currentPage = pageNo;
        
        UI.showLoader();
        if (typeof AudioPlayer !== 'undefined') AudioPlayer.stop();

        try {
            const ayahs = await DataHandler.getPageAyahs(this.currentReading, pageNo);
            if (ayahs && ayahs.length > 0) {
                this.currentSurah = ayahs[0].sura_no;
                UI.renderAyahs(ayahs, this.currentReading);
                UI.updatePageInfo(pageNo);
                
                const sSelect = document.getElementById('surahSelect');
                if (sSelect) sSelect.value = this.currentSurah;
            }
        } catch (error) {
            console.error("Load Error:", error);
        }
    }
};

window.onload = () => App.init();
