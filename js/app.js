/**
 * app.js - النسخة المستقرة
 */
const APP_BUILD = 'v4.6';

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
        const needsRefresh = await this._ensureLatestBuild();
        if (needsRefresh) return;

        console.log("App Init Start...", APP_BUILD);
        this._patchAudioPlayerUi();
        if (typeof AudioPlayer !== 'undefined') AudioPlayer.init();
        this._patchAudioPlayerUi();
        if (typeof UI !== 'undefined') UI.init();
        
        if (typeof SURAHS !== 'undefined') UI.populateSurahs(SURAHS);
        if (typeof JOZZ_LIST !== 'undefined') UI.populateJozzList(JOZZ_LIST);

        this._bind();
        this._initForceRefreshUi();
        await this.loadPage(1);
    },

    _patchAudioPlayerUi() {
        if (typeof AudioPlayer === 'undefined') return;
        AudioPlayer._setPlayerState = function (state) {
            const btn = document.getElementById('playPauseBtn');
            if (!btn) return;
            if (state === 'loading') state = 'paused';
            const playing = state === 'playing';
            AudioPlayer.isPlaying = playing;
            btn.innerHTML = playing ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
            btn.removeAttribute('aria-busy');
        };
    },

    async _ensureLatestBuild() {
        const prev = localStorage.getItem('app_build');
        if (prev === APP_BUILD) return false;
        localStorage.setItem('app_build', APP_BUILD);
        if (!prev) return false;
        await this._forceAppRefresh();
        return true;
    },

    _initForceRefreshUi() {
        const lbl = document.getElementById('appVersionLabel');
        if (lbl) lbl.textContent = 'نسخة ' + APP_BUILD;
        const btn = document.getElementById('forceRefreshBtn');
        if (btn) btn.onclick = () => this._forceAppRefresh();
    },

    async _forceAppRefresh() {
        try {
            if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map((r) => r.unregister()));
            }
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map((k) => caches.delete(k)));
            }
        } catch (e) {
            console.warn('Cache clear:', e);
        }
        const url = new URL(window.location.href);
        url.searchParams.set('_refresh', Date.now().toString());
        window.location.replace(url.toString());
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
        if (typeof IS_CAPACITOR_NATIVE !== 'undefined' && IS_CAPACITOR_NATIVE) return;
        const bar = document.createElement('div');
        bar.id = 'appUpdateBar';
        bar.className = 'app-update-bar';
        bar.innerHTML = '<span>يتوفر تحديث للتطبيق</span><button type="button" id="appUpdateBtn" class="btn btn-primary btn-sm">تحديث الآن</button>';
        document.body.appendChild(bar);
        document.getElementById('appUpdateBtn').onclick = () => App._applyPendingUpdate();
    },

    _applyPendingUpdate() {
        if (this._swRegistration && this._swRegistration.waiting) {
            this._swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        let reloaded = false;
        const onCtrl = () => {
            if (reloaded) return;
            reloaded = true;
            window.location.reload();
        };
        navigator.serviceWorker.addEventListener('controllerchange', onCtrl);
        setTimeout(() => { if (!reloaded) window.location.reload(); }, 1500);
    },

    _checkForSwUpdate(reg) {
        if (!reg || !navigator.serviceWorker.controller) return;
        if (reg.waiting) {
            this._showUpdateBanner();
            return;
        }
        if (reg.installing) {
            reg.installing.addEventListener('statechange', () => {
                if (reg.waiting) this._showUpdateBanner();
            });
        }
    },

    async _initServiceWorker() {
        if (typeof IS_CAPACITOR_NATIVE !== 'undefined' && IS_CAPACITOR_NATIVE) return;
        if (!('serviceWorker' in navigator)) return;

        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'APP_UPDATE_READY' && navigator.serviceWorker.controller) {
                this._showUpdateBanner();
            }
        });

        try {
            const reg = await navigator.serviceWorker.register('./sw.js?v=18');
            this._swRegistration = reg;
            this._checkForSwUpdate(reg);

            reg.addEventListener('updatefound', () => {
                const worker = reg.installing;
                if (!worker) return;
                worker.addEventListener('statechange', () => {
                    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                        this._showUpdateBanner();
                    }
                });
            });

            await reg.update();
            this._checkForSwUpdate(reg);

            const poll = () => reg.update().then(() => this._checkForSwUpdate(reg)).catch(() => {});
            setInterval(poll, 5 * 60 * 1000);
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') poll();
            });
            window.addEventListener('focus', poll);
        } catch (err) {
            console.error('Service Worker Registration Error:', err);
        }
    }
};

// تهيئة التطبيق عند التحميل
document.addEventListener('DOMContentLoaded', () => {
    App.init();
    App._initServiceWorker();
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

