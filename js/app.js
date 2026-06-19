/**
 * app.js - النسخة المستقرة
 */
const APP_BUILD = 'v5.8'

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
        console.log("App Init Start...", APP_BUILD);
        const updateBtn = document.getElementById('appUpdateBtn');
        if (updateBtn) updateBtn.onclick = () => this._applyPendingUpdate();

        if (typeof AudioPlayer !== 'undefined') AudioPlayer.init();
        if (typeof UI !== 'undefined') UI.init();

        if (typeof SURAHS !== 'undefined') UI.populateSurahs(SURAHS);
        if (typeof JOZZ_LIST !== 'undefined') UI.populateJozzList(JOZZ_LIST);

        this._bind();
        this._startUpdateChecks();
        
        // استعادة آخر صفحة كان عليها المستخدم
        let savedPage = parseInt(localStorage.getItem('last_quran_page')) || 1;
        await this.loadPage(savedPage);
    },

    _startUpdateChecks() {
        this._checkRemoteVersion();
        setInterval(() => this._checkRemoteVersion(), 90 * 1000);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') this._checkRemoteVersion();
        });
        window.addEventListener('focus', () => this._checkRemoteVersion());
    },

    async _checkRemoteVersion() {
        if (typeof IS_CAPACITOR_NATIVE !== 'undefined' && IS_CAPACITOR_NATIVE) return;
        try {
            const res = await fetch('./version.json?nocache=' + Date.now(), { cache: 'no-store' });
            if (!res.ok) return;
            const data = await res.json();
            if (data && data.build && data.build !== APP_BUILD) {
                this._showUpdateBanner(data.build);
            }
        } catch (e) { /* offline */ }
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

        // Font scale controls
        const fontInc = document.getElementById('fontIncreaseBtn');
        const fontDec = document.getElementById('fontDecreaseBtn');
        let currentScale = parseFloat(localStorage.getItem('quran_font_scale')) || 1.0;
        document.documentElement.style.setProperty('--font-scale', currentScale);

        if (fontInc) {
            fontInc.onclick = () => {
                currentScale = Math.min(2.5, currentScale + 0.1);
                document.documentElement.style.setProperty('--font-scale', currentScale);
                localStorage.setItem('quran_font_scale', currentScale);
            };
        }
        if (fontDec) {
            fontDec.onclick = () => {
                currentScale = Math.max(0.4, currentScale - 0.1);
                document.documentElement.style.setProperty('--font-scale', currentScale);
                localStorage.setItem('quran_font_scale', currentScale);
            };
        }

        // Swipe Navigation (أجهزة اللمس فقط)
        const readingArea = document.getElementById('readingArea');
        if (readingArea && ('ontouchstart' in window)) {
            let touchStartX = 0;
            let isSwiping = false;
            const SWIPE_THRESHOLD = 70;

            readingArea.addEventListener('touchstart', e => {
                touchStartX = e.changedTouches[0].screenX;
                isSwiping = false;
            }, {passive: true});

            readingArea.addEventListener('touchend', e => {
                if (isSwiping) return;
                const touchEndX = e.changedTouches[0].screenX;
                const diffX = touchEndX - touchStartX;

                if (Math.abs(diffX) < SWIPE_THRESHOLD) return;
                isSwiping = true;

                // المصحف عربي: سحب لليمين = الصفحة التالية، سحب لليسار = الصفحة السابقة
                let targetPage = null;
                let slideDirection = 0; // 1 = يخرج يمين، -1 = يخرج يسار

                if (diffX > 0) {
                    // سحب لليمين -> الصفحة التالية
                    if (this.currentPage < 604) {
                        targetPage = this.currentPage + 1;
                        slideDirection = 1;  // المحتوى القديم يخرج لليمين
                    }
                } else {
                    // سحب لليسار -> الصفحة السابقة
                    if (this.currentPage > 1) {
                        targetPage = this.currentPage - 1;
                        slideDirection = -1; // المحتوى القديم يخرج لليسار
                    }
                }

                if (targetPage === null) { isSwiping = false; return; }

                // تأثير الانزلاق: المحتوى الحالي ينزلق للخارج
                readingArea.classList.remove('page-slide-in');
                readingArea.classList.add('page-slide-out');
                readingArea.style.transform = `translateX(${slideDirection * 100}%)`;
                readingArea.style.opacity = '0';

                setTimeout(async () => {
                    // تحميل الصفحة الجديدة (بدون حركة)
                    readingArea.classList.remove('page-slide-out');
                    readingArea.style.transition = 'none';
                    readingArea.style.transform = `translateX(${-slideDirection * 60}%)`;
                    readingArea.style.opacity = '0';

                    await this.loadPage(targetPage);

                    // انتظار إطار واحد ثم تحريك المحتوى الجديد للداخل
                    requestAnimationFrame(() => {
                        readingArea.classList.add('page-slide-in');
                        readingArea.style.transition = '';
                        readingArea.style.transform = 'translateX(0)';
                        readingArea.style.opacity = '1';

                        setTimeout(() => {
                            readingArea.classList.remove('page-slide-in');
                            readingArea.style.transform = '';
                            readingArea.style.opacity = '';
                            isSwiping = false;
                        }, 280);
                    });
                }, 260);
            }, {passive: true});
        }

        const surahInfoBtn = document.getElementById('surahInfoBtn');
        if (surahInfoBtn) {
            surahInfoBtn.onclick = () => {
                this.showSurahInfo(this.currentSurah);
            };
        }
        
        const aboutAppBtn = document.getElementById('aboutAppBtn');
        if (aboutAppBtn) {
            aboutAppBtn.onclick = () => {
                alert('تم صنع هذا التطبيق بواسطة أكرم عقل');
            };
        }
    },

    async showSurahInfo(suraNo) {
        if (typeof TagsAndContext === 'undefined') return;
        if (suraNo < 1 || suraNo > 114) return;

        TagsAndContext.openApiModal('معلومات السورة', '<div class="loader">جاري جلب المعلومات...</div>');
        const info = await SurahAPI.getSuraInfo(suraNo);
        
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

        // إضافة أزرار التنقل بين السور في أسفل معلومات السورة
        let navHtml = `<div class="surah-nav-buttons" style="display: flex; justify-content: space-between; margin-top: 25px; border-top: 1px solid var(--border); padding-top: 15px; direction: rtl;">`;
        if (suraNo > 1) {
            navHtml += `<button class="btn btn-secondary btn-sm" onclick="App.showSurahInfo(${suraNo - 1})"><i class="fas fa-chevron-right"></i> السورة السابقة</button>`;
        } else {
            navHtml += `<div></div>`;
        }
        if (suraNo < 114) {
            navHtml += `<button class="btn btn-secondary btn-sm" onclick="App.showSurahInfo(${suraNo + 1})">السورة التالية <i class="fas fa-chevron-left"></i></button>`;
        } else {
            navHtml += `<div></div>`;
        }
        navHtml += `</div>`;
        
        html += navHtml;

        // جلب اسم السورة لتحديث عنوان المودال
        let surahName = `السورة ${suraNo}`;
        const surahSelect = document.getElementById('surahSelect');
        if (surahSelect) {
            const opt = surahSelect.querySelector(`option[value="${suraNo}"]`);
            if (opt) {
                surahName = opt.textContent.replace(/^\d+\.\s*/, '').trim();
            }
        }

        TagsAndContext.openApiModal(`سورة ${surahName}`, html);
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
        // حفظ الصفحة للرجوع إليها لاحقاً
        localStorage.setItem('last_quran_page', page);
        
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
                    AudioPlayer.scheduleBackgroundPreload(this.currentReading, page);
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

    _showUpdateBanner(remoteBuild) {
        if (typeof IS_CAPACITOR_NATIVE !== 'undefined' && IS_CAPACITOR_NATIVE) return;
        const bar = document.getElementById('appUpdateBar');
        if (!bar) return;
        const label = bar.querySelector('.app-update-text');
        if (label && remoteBuild) {
            label.textContent = 'يتوفر تحديث (' + remoteBuild + ') — اضغط للتطبيق';
        }
        bar.hidden = false;
    },

    _applyPendingUpdate() {
        // إخفاء شريط التحديث فوراً
        const bar = document.getElementById('appUpdateBar');
        if (bar) bar.hidden = true;

        if (this._swRegistration && this._swRegistration.waiting) {
            this._swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        let reloaded = false;
        const reload = () => {
            if (reloaded) return;
            reloaded = true;
            window.location.reload();
        };
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
        }
        setTimeout(reload, 800);
    },

    _onSwUpdateReady() {
        this._checkRemoteVersion();
    },

    _watchSwRegistration(reg) {
        if (!reg) return;
        if (reg.waiting && navigator.serviceWorker.controller) {
            this._onSwUpdateReady();
        }
        reg.addEventListener('updatefound', () => {
            const worker = reg.installing;
            if (!worker) return;
            worker.addEventListener('statechange', () => {
                if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                    this._onSwUpdateReady();
                }
            });
        });
    },

    async _initServiceWorker() {
        if (typeof IS_CAPACITOR_NATIVE !== 'undefined' && IS_CAPACITOR_NATIVE) return;
        if (!('serviceWorker' in navigator)) return;

        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'APP_UPDATE_READY') {
                this._onSwUpdateReady();
            }
        });

        try {
            const reg = await navigator.serviceWorker.register('./sw.js?v=5.9');
            this._swRegistration = reg;
            this._watchSwRegistration(reg);
            await reg.update();
            this._watchSwRegistration(reg);
            setInterval(() => reg.update().catch(() => {}), 3 * 60 * 1000);
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

window.copyCurrentApiTabContent = function(btnElement) {
    const activeTab = document.querySelector('.api-tab-content.active') || document.querySelector('.api-tab-content[style*="display: block"]');
    if (!activeTab) return;
    
    // نستخرج النص فقط لتجنب نسخ الأزرار والعناصر المخفية
    // نقوم أولاً بنسخ العنصر لنزيل منه ما لا نريد نسخه
    const clone = activeTab.cloneNode(true);
    const navButtons = clone.querySelectorAll('button, .footnote-section');
    navButtons.forEach(btn => btn.remove());
    
    // Add to DOM temporarily so innerText computes line breaks properly
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    document.body.appendChild(clone);
    
    const textToCopy = clone.innerText.trim();
    
    document.body.removeChild(clone);
    
    if (!textToCopy) return;

    const originalHtml = btnElement.innerHTML;
    navigator.clipboard.writeText(textToCopy).then(() => {
        btnElement.innerHTML = '<i class="fas fa-check"></i> تم';
        btnElement.style.opacity = '1';
        setTimeout(() => {
            btnElement.innerHTML = originalHtml;
            btnElement.style.opacity = '';
        }, 1200);
    }).catch(e => console.error('Failed to copy', e));
};

