/**
 * app.js - النسخة المستقرة
 */
const App = {
    currentReading: 'Hafs',
    currentPage: 1,
    currentSurah: 1,

    TestingMode: {
        isActive: false,
        toggle() {
            this.isActive = !this.isActive;
            const btn = document.getElementById('testingModeBtn');
            if (btn) {
                btn.classList.toggle('btn-warning', !this.isActive);
                btn.classList.toggle('btn-danger', this.isActive);
                btn.innerHTML = this.isActive ? '<i class="fas fa-eye"></i> إيقاف وضع الاختبار' : '<i class="fas fa-eye-slash"></i> وضع الاختبار';
            }
            // إعادة رسم الآيات لتطبيق حالة الإخفاء أو الإظهار
            App.loadPage(App.currentPage);
        }
    },

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
        const t = document.getElementById('testingModeBtn');
        const d = document.getElementById('downloadOpenBtn');

        if (r) r.onchange = (e) => { this.currentReading = e.target.value; this.loadPage(this.currentPage, false, true); };
        if (s) s.onchange = (e) => { 
            const surah = SURAHS.find(x => x.number == e.target.value);
            if (surah) this.loadPage(surah.startPage);
        };
        if (j) j.onchange = (e) => this.loadPage(this.getJozzStartPage(e.target.value));
        if (t) t.onclick = () => this.TestingMode.toggle();
        if (d) d.onclick = () => document.getElementById('downloadModal').classList.add('active');

        const surahInfoBtn = document.getElementById('surahInfoBtn');
        if (surahInfoBtn) {
            surahInfoBtn.onclick = async () => {
                if (typeof TagsAndContext !== 'undefined') {
                    TagsAndContext.openApiModal('معلومات السورة', '<div class="loader">جاري جلب المعلومات...</div>');
                    const info = await SurahAPI.getSuraInfo(this.currentSurah);
                    
                    let html = '';
                    if (info.asmaa && info.asmaa.data) {
                        html += `<div style="margin-bottom:15px"><h3 style="color:var(--primary);margin-bottom:5px;"><i class="fas fa-signature"></i> أسماء السورة</h3><p>${info.asmaa.data}</p></div>`;
                    }
                    if (info.fadael && info.fadael.data) {
                        html += `<div style="margin-bottom:15px"><h3 style="color:var(--primary);margin-bottom:5px;"><i class="fas fa-star"></i> فضائل السورة</h3><p>${info.fadael.data}</p></div>`;
                    }
                    if (info.nozool && info.nozool.data) {
                        html += `<div style="margin-bottom:15px"><h3 style="color:var(--primary);margin-bottom:5px;"><i class="fas fa-map-marker-alt"></i> النزول</h3><p>${info.nozool.data}</p></div>`;
                    }
                    if (info.adad && info.adad.data) {
                        html += `<div style="margin-bottom:15px"><h3 style="color:var(--primary);margin-bottom:5px;"><i class="fas fa-list-ol"></i> عدد الآيات والاختلاف</h3><p>${info.adad.data}</p></div>`;
                    }
                    
                    if (!html) html = '<p>المعلومات غير متوفرة لهذه السورة.</p>';
                    TagsAndContext.openApiModal(`سورة ${document.getElementById('currentSurahTitle').textContent.replace('سورة ', '')}`, html);
                }
            };
        }
    },

    getJozzStartPage(jozzNum) {
        const jozz = parseInt(jozzNum);
        if (isNaN(jozz) || jozz < 1 || jozz > 30) return 1;

        const cachedData = DataHandler.cache[this.currentReading];
        if (cachedData && cachedData.length > 0) {
            const jozzAyahs = cachedData.filter(a => parseInt(a.jozz) === jozz);
            if (jozzAyahs.length > 0) {
                const minPage = Math.min(...jozzAyahs.map(a => parseInt(a.page)));
                if (minPage >= 1 && minPage <= 604) {
                    return minPage;
                }
            }
        }

        const hafsMap = {
            1: 1, 2: 22, 3: 42, 4: 62, 5: 82, 6: 102, 7: 121, 8: 142, 9: 162, 10: 182,
            11: 202, 12: 222, 13: 242, 14: 262, 15: 282, 16: 302, 17: 322, 18: 342, 19: 362, 20: 382,
            21: 402, 22: 422, 23: 442, 24: 462, 25: 482, 26: 502, 27: 522, 28: 542, 29: 562, 30: 582
        };
        const otherMap = { ...hafsMap, 11: 201 };
        const isHafs = this.currentReading.startsWith('Hafs');
        return isHafs ? hafsMap[jozz] : otherMap[jozz];
    },

    async loadPage(page, keepPlaylist = false, forceStop = false) {
        if (page < 1 || page > 604) return;
        this.currentPage = page;
        UI.showLoader();
        // إيقاف الصوت فقط عند تغيير الرواية، وليس عند تصفح الصفحات
        if (typeof AudioPlayer !== 'undefined' && forceStop) AudioPlayer.stop();

        try {
            const ayahs = await DataHandler.getPageAyahs(this.currentReading, page);
            if (ayahs && ayahs.length > 0) {
                this.currentSurah = ayahs[0].sura_no;
                UI.renderAyahs(ayahs, this.currentReading);
                UI.updatePageInfo(page);
                const sSel = document.getElementById('surahSelect');
                if (sSel) sSel.value = this.currentSurah;

                // التمهيد الصوتي المسبق للصفحة في الخلفية
                if (typeof AudioPlayer !== 'undefined') {
                    AudioPlayer.preloadPageAudios(this.currentReading, ayahs);
                }
            }
        } catch (e) {
            console.error("Load Error:", e);
        }
    }
};

window.onload = () => App.init();
