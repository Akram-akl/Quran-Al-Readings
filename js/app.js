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
                    
                    let html = '<div class="api-tabs">';
                    let contentHtml = '';
                    let isFirst = true;

                    if (info.asmaa && info.asmaa.content) {
                        html += `<button class="api-tab-btn ${isFirst ? 'active' : ''}" onclick="switchApiTab('asmaa')">أسماء السورة</button>`;
                        contentHtml += `<div id="tab-asmaa" class="api-tab-content ${isFirst ? 'active' : ''}"><h3 style="color:var(--primary);margin-bottom:5px;"><i class="fas fa-signature"></i> أسماء السورة</h3><p>${TagsAndContext._formatContentWithFootnotes(info.asmaa.content)}</p></div>`;
                        isFirst = false;
                    }
                    if (info.fadael && info.fadael.content) {
                        html += `<button class="api-tab-btn ${isFirst ? 'active' : ''}" onclick="switchApiTab('fadael')">الفضائل</button>`;
                        contentHtml += `<div id="tab-fadael" class="api-tab-content ${isFirst ? 'active' : ''}"><h3 style="color:var(--primary);margin-bottom:5px;"><i class="fas fa-star"></i> فضائل السورة</h3><p>${TagsAndContext._formatContentWithFootnotes(info.fadael.content)}</p></div>`;
                        isFirst = false;
                    }
                    if (info.nozool && info.nozool.content) {
                        html += `<button class="api-tab-btn ${isFirst ? 'active' : ''}" onclick="switchApiTab('nozool')">النزول</button>`;
                        contentHtml += `<div id="tab-nozool" class="api-tab-content ${isFirst ? 'active' : ''}"><h3 style="color:var(--primary);margin-bottom:5px;"><i class="fas fa-map-marker-alt"></i> النزول</h3><p>${TagsAndContext._formatContentWithFootnotes(info.nozool.content)}</p></div>`;
                        isFirst = false;
                    }
                    if (info.adad && info.adad.content) {
                        html += `<button class="api-tab-btn ${isFirst ? 'active' : ''}" onclick="switchApiTab('adad')">الآيات</button>`;
                        contentHtml += `<div id="tab-adad" class="api-tab-content ${isFirst ? 'active' : ''}"><h3 style="color:var(--primary);margin-bottom:5px;"><i class="fas fa-list-ol"></i> عدد الآيات والاختلاف</h3><p>${TagsAndContext._formatContentWithFootnotes(info.adad.content)}</p></div>`;
                        isFirst = false;
                    }
                    
                    html += '</div>' + contentHtml;
                    if (isFirst) html = '<p>المعلومات غير متوفرة لهذه السورة.</p>';
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

    /** رقم الصفحة المناسب لعرض الآية (يدعم الآيات الممتدة عبر صفحتين) */
    resolvePageForAyah(ayah, preferPage = this.currentPage) {
        if (!ayah || ayah.page == null) return preferPage;
        const raw = String(ayah.page);
        if (raw.includes('-')) {
            const parts = raw.split('-').map(n => parseInt(n, 10));
            const start = parts[0];
            const end = parts[1] || start;
            if (preferPage >= start && preferPage <= end) return preferPage;
            return start;
        }
        const p = parseInt(raw, 10);
        return Number.isNaN(p) ? preferPage : p;
    },

    isAyahOnPage(ayah, pageNo) {
        if (!ayah) return false;
        const p = parseInt(pageNo, 10);
        if (typeof UI !== 'undefined' && UI.currentPageAyahs && UI.currentPageAyahs.length > 0 && p === parseInt(this.currentPage, 10)) {
            if (UI.currentPageAyahs.some(a => a.sura_no === ayah.sura_no && a.aya_no === ayah.aya_no)) {
                return true;
            }
        }
        if (ayah.page == null) return false;
        const raw = String(ayah.page).trim();
        if (raw.includes('-')) {
            const parts = raw.split('-').map(n => parseInt(n, 10));
            const start = parts[0];
            const end = parts[1] || start;
            return p >= start && p <= end;
        }
        return parseInt(raw, 10) === p;
    },

    async loadPage(page, keepPlaylist = false, forceStop = false, silent = false) {
        if (page < 1 || page > 604) return;
        this.currentPage = page;
        if (!silent) UI.showLoader();
        if (typeof AudioPlayer !== 'undefined' && forceStop) AudioPlayer.stop();

        try {
            const ayahs = await DataHandler.getPageAyahs(this.currentReading, page);
            if (ayahs && ayahs.length > 0) {
                this.currentSurah = ayahs[0].sura_no;
                UI.renderAyahs(ayahs, this.currentReading);
                UI.updatePageInfo(page);
                const sSel = document.getElementById('surahSelect');
                if (sSel) sSel.value = this.currentSurah;

                if (typeof AudioPlayer !== 'undefined') {
                    AudioPlayer.preloadPageAudios(this.currentReading, ayahs);
                    if (AudioPlayer.currentAyah) {
                        const cur = AudioPlayer.currentAyah;
                        if (ayahs.some(a => a.sura_no === cur.sura_no && a.aya_no === cur.aya_no)) {
                            AudioPlayer._highlightSingle(cur.aya_no, cur.sura_no);
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Load Error:", e);
            const area = document.getElementById('readingArea');
            if (area) area.innerHTML = '<div class="loader">تعذّر تحميل الصفحة</div>';
        }
    },

    _showUpdateBanner() {
        if (document.getElementById('appUpdateBar')) return;
        const bar = document.createElement('div');
        bar.id = 'appUpdateBar';
        bar.className = 'app-update-bar';
        bar.innerHTML = '<span>يتوفر تحديث للتطبيق</span><button type="button" id="appUpdateBtn" class="btn btn-primary btn-sm">تحديث الآن</button>';
        document.body.appendChild(bar);
        document.getElementById('appUpdateBtn').onclick = () => {
            if (this._swRegistration && this._swRegistration.waiting) {
                this._swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            let reloaded = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (reloaded) return;
                reloaded = true;
                window.location.reload();
            });
            setTimeout(() => { if (!reloaded) window.location.reload(); }, 1500);
        };
    }
};

// تهيئة التطبيق عند التحميل
document.addEventListener('DOMContentLoaded', () => {
    App.init();
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js?v=9').then(reg => {
            App._swRegistration = reg;
            reg.update();
            setInterval(() => reg.update(), 60 * 60 * 1000);
            if (reg.waiting) App._showUpdateBanner();
            reg.addEventListener('updatefound', () => {
                const worker = reg.installing;
                if (!worker) return;
                worker.addEventListener('statechange', () => {
                    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                        App._showUpdateBanner();
                    }
                });
            });
        }).catch(err => {
            console.error('Service Worker Registration Error:', err);
        });
    }
});

window.switchApiTab = function(tabId, btnElement) {
    document.querySelectorAll('.api-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.api-tab-content').forEach(c => {
        c.classList.remove('active');
        c.style.display = 'none';
    });
    
    if (btnElement) {
        btnElement.classList.add('active');
    } else {
        const btn = document.querySelector(`.api-tab-btn[onclick*="${tabId}"]`);
        if (btn) btn.classList.add('active');
    }
    
    let tab = document.getElementById(tabId) || document.getElementById(`tab-${tabId}`);
    if (tab) {
        tab.classList.add('active');
        tab.style.display = 'block';
    }
};

