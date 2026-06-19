/**
 * offlineManager.js - إدارة المكتبة المحملة (العمل بدون إنترنت)
 */
const OfflineManager = {
    cacheName: 'quran-offline-v2',
    isDownloading: false,
    isPaused: false,
    cancelRequested: false,
    downloadQueue: [],
    totalItems: 0,
    downloadedItems: 0,
    currentReading: '',
    
    init() {
        const btn = document.getElementById('offlineLibOpenBtn');
        if (btn) btn.addEventListener('click', () => this.openModal());

        const dlSurahBtn = document.getElementById('offlineDlSurahBtn');
        if (dlSurahBtn) dlSurahBtn.addEventListener('click', () => this.startDownload());

        const dlAllBtn = document.getElementById('offlineDlAllBtn');
        if (dlAllBtn) dlAllBtn.addEventListener('click', () => this.startDownloadAll());
        
        const pauseBtn = document.getElementById('offlinePauseBtn');
        if (pauseBtn) pauseBtn.addEventListener('click', () => this.togglePause());
        
        const stopBtn = document.getElementById('offlineStopBtn');
        if (stopBtn) stopBtn.addEventListener('click', () => this.stopDownload());
        
        const rSel = document.getElementById('offlineReadingSelect');
        if (rSel) {
            rSel.addEventListener('change', () => {
                this.currentReading = rSel.value;
                this.populateSurahs();
                this.updateDownloadedList();
            });
        }

        const modal = document.getElementById('offlineLibModal');
        if (modal) {
            const closeBtn = modal.querySelector('.close-modal');
            if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
        }
    },

    _getStoredDownloads() {
        return JSON.parse(localStorage.getItem('offlineSurahs') || '{}');
    },

    _saveStoredDownloads(data) {
        localStorage.setItem('offlineSurahs', JSON.stringify(data));
    },

    _isSurahDownloaded(readingKey, suraNo) {
        const list = this._getStoredDownloads()[readingKey] || [];
        return list.includes(suraNo);
    },

    async openModal() {
        const modal = document.getElementById('offlineLibModal');
        if (modal) modal.classList.add('active');
        this.currentReading = App.currentReading;
        const rSel = document.getElementById('offlineReadingSelect');
        if (rSel) rSel.value = this.currentReading;
        
        document.getElementById('offlineAlertBox').style.display = 'none';
        
        await this.populateSurahs();
        await this.updateDownloadedList();
    },

    closeModal() {
        const modal = document.getElementById('offlineLibModal');
        if (modal) modal.classList.remove('active');
    },

    async populateSurahs() {
        const sel = document.getElementById('offlineSurahSelect');
        if (!sel) return;
        let data = DataHandler.cache[this.currentReading];
        if (!data) data = await DataHandler.loadReading(this.currentReading);
        if (!data) return;
        
        const surahs = DataHandler.getSurahs(data);
        const downloaded = this._getStoredDownloads()[this.currentReading] || [];
        const cfg = READINGS_CONFIG[this.currentReading] || {};

        sel.innerHTML = surahs.map(s => {
            const done = downloaded.includes(s.number);
            const label = `${s.number}. ${s.nameAr}${done ? ' (محمّلة لهذا القارئ)' : ''}`;
            return `<option value="${s.number}">${label}</option>`;
        }).join('');

        if (App.currentSurah) {
            sel.value = App.currentSurah;
        }
    },

    async updateDownloadedList() {
        const listEl = document.getElementById('offlineDownloadedList');
        if (!listEl) return;
        
        const downloaded = this._getStoredDownloads();
        const readingKeys = Object.keys(downloaded).filter(k => (downloaded[k] || []).length > 0);
        
        if (readingKeys.length === 0) {
            listEl.innerHTML = '<p>لا توجد سور محملة بعد.</p>';
            return;
        }
        
        let html = '';
        for (const readingKey of readingKeys.sort()) {
            const cfg = READINGS_CONFIG[readingKey] || { name: readingKey, reader: '' };
            let data = DataHandler.cache[readingKey];
            if (!data) {
                try { data = await DataHandler.loadReading(readingKey); } catch (e) { data = []; }
            }
            const surahs = data ? DataHandler.getSurahs(data) : [];

            html += `<div class="offline-reading-group" style="margin-bottom:12px;">
                <div style="font-weight:bold;color:var(--primary);margin-bottom:6px;">${cfg.name || readingKey}</div>
                <div style="font-size:0.8rem;opacity:0.8;margin-bottom:6px;"><i class="fas fa-user"></i> ${cfg.reader || ''}</div>
                <ul style="list-style:none;padding:0;margin:0;">`;

            downloaded[readingKey].sort((a, b) => a - b).forEach(sNo => {
                const sInfo = surahs.find(s => s.number === sNo);
                const name = sInfo ? sInfo.nameAr : `سورة ${sNo}`;
                html += `<li style="padding:8px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
                    <span><i class="fas fa-check-circle" style="color:var(--primary)"></i> سورة ${name}</span>
                    <button class="btn btn-sm btn-danger" onclick="OfflineManager.deleteSurah('${readingKey}', ${sNo})"><i class="fas fa-trash"></i></button>
                </li>`;
            });
            html += '</ul></div>';
        }
        listEl.innerHTML = html;
    },

    async startDownload() {
        if (this.isDownloading) return;
        
        const alertBox = document.getElementById('offlineAlertBox');
        if (alertBox) alertBox.style.display = 'none';

        const sel = document.getElementById('offlineSurahSelect');
        if (!sel) return;
        const suraNo = parseInt(sel.value, 10);

        if (this._isSurahDownloaded(this.currentReading, suraNo)) {
            const cfg = READINGS_CONFIG[this.currentReading] || {};
            if (alertBox) {
                alertBox.innerHTML = `<i class="fas fa-info-circle"></i> سورة ${suraNo} محمّلة مسبقاً لـ <strong>${cfg.reader || cfg.name}</strong>. يمكنك اختيار <strong>قارئاً آخر</strong> من القائمة وتحميل نفس السورة له.`;
                alertBox.style.display = 'block';
            }
            return;
        }
        
        await this._startProcess([suraNo]);
    },

    async startDownloadAll() {
        if (this.isDownloading) return;
        
        const alertBox = document.getElementById('offlineAlertBox');
        if (alertBox) alertBox.style.display = 'none';

        const cfg = READINGS_CONFIG[this.currentReading] || {};
        if (!confirm(`هل أنت متأكد من تحميل المصحف كاملاً للرواية المختارة (${cfg.name})؟ قد يستهلك هذا أكثر من 1.5 جيجابايت من المساحة.`)) {
            return;
        }

        const downloaded = this._getStoredDownloads()[this.currentReading] || [];
        const allSurahs = Array.from({length: 114}, (_, i) => i + 1);
        const surahsToDownload = allSurahs.filter(s => !downloaded.includes(s));

        if (surahsToDownload.length === 0) {
            if (alertBox) {
                alertBox.innerHTML = `<i class="fas fa-check-circle"></i> جميع سور القرآن محمّلة مسبقاً لـ <strong>${cfg.reader || cfg.name}</strong>.`;
                alertBox.style.display = 'block';
            }
            return;
        }
        
        await this._startProcess(surahsToDownload);
    },

    _queueItemsForSurah(readingKey, sNo, ayahs, config) {
        const items = [];

        // إضافة روابط التفسير الميسر ومعلومات السورة
        const isHafs = readingKey && (readingKey.toLowerCase().includes('hafs') || readingKey.toLowerCase().includes('shubah'));
        for (const ayah of ayahs) {
            let tafsirAyaNo = ayah.aya_no;
            if (parseInt(sNo) === 1 && !isHafs) {
                const aNo = parseInt(ayah.aya_no);
                if (aNo >= 1 && aNo <= 5) tafsirAyaNo = aNo + 1;
                else if (aNo === 6 || aNo === 7) tafsirAyaNo = 7;
            }
            const tafsirUrl = `https://dev.surahapp.com/api/v1/aya/tafsir-mokhtasar/${sNo}/${tafsirAyaNo}`;
            items.push({ type: 'api', url: tafsirUrl, sura: sNo });
        }
        items.push({ type: 'api', url: `https://dev.surahapp.com/api/v1/sura/asmaa-sowar/${sNo}`, sura: sNo });
        items.push({ type: 'api', url: `https://dev.surahapp.com/api/v1/sura/fadael-sowar/${sNo}`, sura: sNo });
        items.push({ type: 'api', url: `https://dev.surahapp.com/api/v1/sura/nozool-sowar/${sNo}`, sura: sNo });
        items.push({ type: 'api', url: `https://dev.surahapp.com/api/v1/sura/adad_ayat-sowar/${sNo}`, sura: sNo });

        if (config.isMonolithic) {
            const audioUrl = config.getAudioPath(sNo);
            if (audioUrl) items.push({ type: 'audio', url: audioUrl, sura: sNo });
            const timingUrl = config.getTimingPath(sNo);
            if (timingUrl) items.push({ type: 'json', url: timingUrl, sura: sNo });
        } else {
            for (const ayah of ayahs) {
                let mappedHafsAyahs = [ayah.aya_no];
                if (typeof AUDIO_MAP !== 'undefined') {
                    const rKey = config.audioMapKey || readingKey;
                    if (rKey && AUDIO_MAP[rKey] && AUDIO_MAP[rKey][sNo] && AUDIO_MAP[rKey][sNo][ayah.aya_no]) {
                        mappedHafsAyahs = AUDIO_MAP[rKey][sNo][ayah.aya_no];
                    }
                }
                for (const hafsAya of mappedHafsAyahs) {
                    const audioUrl = config.getAudioPath({
                        sura_no: sNo,
                        aya_no: hafsAya,
                        jozz: ayah.jozz
                    });
                    if (audioUrl) items.push({ type: 'audio', url: audioUrl, sura: sNo });
                }
            }
        }
        return items;
    },

    async _startProcess(surahsToDownload) {
        let data = DataHandler.cache[this.currentReading];
        if (!data) data = await DataHandler.loadReading(this.currentReading);
        if (!data) return;

        const downloadReadingKey = this.currentReading;
        this._downloadingSurahs = surahsToDownload;
        this._surahItemStats = {};
        
        const config = READINGS_CONFIG[downloadReadingKey];
        if (!config) return;

        this.isDownloading = true;
        this.isPaused = false;
        this.cancelRequested = false;

        this.updateUIStatus('start');

        let totalItemsAll = 0;
        const surahsDataItems = [];
        for (const sNo of surahsToDownload) {
            const ayahs = data.filter(a => parseInt(a.sura_no) === sNo && parseInt(a.aya_no) > 0);
            const items = this._queueItemsForSurah(downloadReadingKey, sNo, ayahs, config);
            surahsDataItems.push({ sNo, items });
            totalItemsAll += items.length;
        }

        if (totalItemsAll === 0) {
            this.isDownloading = false;
            return;
        }

        this.totalItems = totalItemsAll;
        this.downloadedItems = 0;

        const downloaded = this._getStoredDownloads();
        if (!downloaded[downloadReadingKey]) downloaded[downloadReadingKey] = [];
        const incomplete = [];

        // تفعيل وضع الخلفية إذا كان متاحاً
        if (window.cordova && cordova.plugins && cordova.plugins.backgroundMode) {
            cordova.plugins.backgroundMode.enable();
            cordova.plugins.backgroundMode.on('activate', function() {
                cordova.plugins.backgroundMode.disableWebViewOptimizations(); 
            });
        }

        for (const { sNo, items } of surahsDataItems) {
            this.downloadQueue = items;
            this._surahItemStats[sNo] = { total: items.length, failed: 0 };
            
            this.currentDownloadingSurahName = data.find(a => parseInt(a.sura_no) === sNo)?.sura_name_ar || `رقم ${sNo}`;
            
            // تحديث الواجهة فوراً باسم السورة ونسبة 0% قبل بدء المعالجة
            this.updateUIProgress();
            
            await this.processQueue();
            
            if (this.cancelRequested) {
                break; // إيقاف الانتقال للسور التالية إذا تم الإلغاء
            }

            const st = this._surahItemStats[sNo];
            const ok = st && st.failed === 0 && st.total > 0;
            if (ok && !downloaded[downloadReadingKey].includes(sNo)) {
                downloaded[downloadReadingKey].push(sNo);
                this._saveStoredDownloads(downloaded);
                await this.updateDownloadedList();
            } else if (!ok) {
                incomplete.push(sNo);
            }
        }

        // إيقاف وضع الخلفية بعد الانتهاء
        if (window.cordova && cordova.plugins && cordova.plugins.backgroundMode) {
            cordova.plugins.backgroundMode.disable();
        }

        if (this.cancelRequested) {
            this.updateUIStatus('stop');
        } else {
            const alertBox = document.getElementById('offlineAlertBox');
            if (incomplete.length > 0 && alertBox) {
                alertBox.innerHTML = `<i class="fas fa-exclamation-triangle"></i> لم تُكتمل تحميلات السور: ${incomplete.join('، ')}. أعد المحاولة مع اتصال أفضل.`;
                alertBox.style.display = 'block';
            }
            
            this.updateUIStatus('done');
            await this.populateSurahs();
        }

        this.isDownloading = false;
    },

    async processQueue() {
        if (!('caches' in window)) {
            const alertBox = document.getElementById('offlineAlertBox');
            if (alertBox) {
                alertBox.textContent = 'عذراً، متصفحك لا يدعم خاصية العمل بدون إنترنت.';
                alertBox.style.display = 'block';
            }
            this.stopDownload();
            return;
        }
        
        const cache = await caches.open(this.cacheName);

        while (this.downloadQueue.length > 0) {
            if (this.cancelRequested) break;
            if (this.isPaused) {
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }

            const item = this.downloadQueue.shift();
            
            let itemFailed = false;
            try {
                const match = await cache.match(item.url);
                if (!match) {
                    const res = await fetch(item.url, { mode: 'cors', cache: 'no-store' });
                    if (res.ok) {
                        await cache.put(item.url, res);
                    } else {
                        itemFailed = true;
                    }
                }
            } catch (e) {
                itemFailed = true;
                console.error(`Failed to download ${item.url}:`, e);
            }
            if (itemFailed && this._surahItemStats[item.sura]) {
                if (item.type !== 'api') {
                    this._surahItemStats[item.sura].failed++;
                } else {
                    console.warn(`Non-critical API download failed: ${item.url}`);
                }
            }
            
            this.downloadedItems++;
            this.updateUIProgress();
        }
    },

    togglePause() {
        this.isPaused = !this.isPaused;
        const btn = document.getElementById('offlinePauseBtn');
        if (btn) {
            btn.innerHTML = this.isPaused 
                ? '<i class="fas fa-play"></i> استئناف' 
                : '<i class="fas fa-pause"></i> إيقاف مؤقت';
        }
    },

    stopDownload() {
        this.cancelRequested = true;
        this.isDownloading = false;
        this.downloadQueue = [];
        this.updateUIStatus('stop');
    },

    async deleteSurah(readingKey, suraNo) {
        const downloaded = this._getStoredDownloads();
        if (!downloaded[readingKey]) return;
        
        // مسح من localStorage أولاً لضمان الإزالة حتى لو فشل الكاش
        downloaded[readingKey] = downloaded[readingKey].filter(s => s !== suraNo);
        if (downloaded[readingKey].length === 0) delete downloaded[readingKey];
        this._saveStoredDownloads(downloaded);
        
        await this._purgeSurahFromCache(readingKey, suraNo);
        
        await this.updateDownloadedList();
        if (readingKey === this.currentReading) await this.populateSurahs();
    },

    async _purgeSurahFromCache(readingKey, suraNo) {
        if (!('caches' in window)) return;
        let data = DataHandler.cache[readingKey];
        if (!data) {
            try { data = await DataHandler.loadReading(readingKey); } catch (e) { data = []; }
        }
        const config = READINGS_CONFIG[readingKey];
        if (!config || !data) return;
        const ayahs = data.filter(a => parseInt(a.sura_no) === suraNo && parseInt(a.aya_no) > 0);
        const items = this._queueItemsForSurah(readingKey, suraNo, ayahs, config);
        const cache = await caches.open(this.cacheName);
        
        // ignoreSearch لا يعمل مع cache.delete، لذا نستخدم cache.matchAll أو استخراج كل المفاتيح
        const cacheKeys = await cache.keys();
        const itemsUrls = items.map(i => i.url.split('?')[0]); // بدون المعاملات
        
        const deletePromises = cacheKeys.filter(req => {
            const reqUrl = req.url.split('?')[0];
            return itemsUrls.includes(reqUrl);
        }).map(req => cache.delete(req));
        
        await Promise.all(deletePromises);
    },

    updateUIStatus(state) {
        const progressC = document.getElementById('offlineProgressContainer');
        const dlBtns = document.getElementById('offlineDlBtns');
        const pauseBtn = document.getElementById('offlinePauseBtn');
        const stopBtn = document.getElementById('offlineStopBtn');

        if (state === 'start') {
            // تصفير عناصر شريط التقدم فوراً لمسح السور السابقة
            const bar = document.getElementById('offlineProgressBar');
            if (bar) bar.style.width = '0%';
            const percentEl = document.getElementById('offlineProgressPercent');
            if (percentEl) percentEl.textContent = '0%';
            const txt = document.getElementById('offlineProgressText');
            if (txt) txt.textContent = 'جاري البدء...';

            if (progressC) progressC.style.display = 'block';
            if (dlBtns) dlBtns.style.display = 'none';
            if (pauseBtn) pauseBtn.style.display = 'inline-flex';
            if (stopBtn) stopBtn.style.display = 'inline-flex';
        } else {
            if (progressC) progressC.style.display = 'none';
            if (dlBtns) dlBtns.style.display = 'flex';
            if (pauseBtn) pauseBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'none';
        }
    },

    updateUIProgress() {
        if (this.totalItems === 0) return;
        const pct = Math.floor((this.downloadedItems / this.totalItems) * 100);
        const bar = document.getElementById('offlineProgressBar');
        if (bar) bar.style.width = `${pct}%`;
        
        const percentEl = document.getElementById('offlineProgressPercent');
        if (percentEl) percentEl.textContent = `${pct}%`;
        
        const txt = document.getElementById('offlineProgressText');
        if (txt) {
            if (this.currentDownloadingSurahName) {
                txt.textContent = `جاري تحميل سورة ${this.currentDownloadingSurahName}... (${this.downloadedItems}/${this.totalItems})`;
            } else {
                txt.textContent = `جاري التحميل... (${this.downloadedItems}/${this.totalItems})`;
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    OfflineManager.init();
});

window.OfflineManager = OfflineManager;
