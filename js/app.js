/**
 * app.js - النسخة المستقرة
 */
const App = {
    currentReading: 'Hafs',
    currentPage: 1,
    currentSurah: 1,

    async init() {
        console.log("App Init Start...");
        if (typeof AudioPlayer !== 'undefined') AudioPlayer.init();
        if (typeof UI !== 'undefined') UI.init();
        
        if (typeof SURAHS !== 'undefined') UI.populateSurahs(SURAHS);
        if (typeof JOZZ_LIST !== 'undefined') UI.populateJozzList(JOZZ_LIST);

        this._bind();
        await this.loadPage(1);
    },

    _bind() {
        const r = document.getElementById('readingSelect');
        const s = document.getElementById('surahSelect');
        const j = document.getElementById('jozzSelect');

        if (r) r.onchange = (e) => { this.currentReading = e.target.value; this.loadPage(this.currentPage); };
        if (s) s.onchange = (e) => { 
            const surah = SURAHS.find(x => x.number == e.target.value);
            if (surah) this.loadPage(surah.startPage);
        };
        if (j) j.onchange = (e) => this.loadPage((e.target.value - 1) * 20 + 1);
    },

    async loadPage(page) {
        if (page < 1 || page > 604) return;
        this.currentPage = page;
        UI.showLoader();
        if (typeof AudioPlayer !== 'undefined') AudioPlayer.stop();

        try {
            const ayahs = await DataHandler.getPageAyahs(this.currentReading, page);
            if (ayahs && ayahs.length > 0) {
                this.currentSurah = ayahs[0].sura_no;
                UI.renderAyahs(ayahs, this.currentReading);
                UI.updatePageInfo(page);
                const sSel = document.getElementById('surahSelect');
                if (sSel) sSel.value = this.currentSurah;
            }
        } catch (e) {
            console.error("Load Error:", e);
        }
    }
};

window.onload = () => App.init();
