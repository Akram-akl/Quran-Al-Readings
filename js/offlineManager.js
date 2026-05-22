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
        if (dlSurahBtn) dlSurahBtn.addEventListener('click', () => this.startDownload(false));
        
        const dlAllBtn = document.getElementById('offlineDlAllBtn');
        if (dlAllBtn) dlAllBtn.addEventListener('click', () => this.startDownload(true));
        
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
        
        const confirmYes = document.getElementById('offlineConfirmYesBtn');
        if (confirmYes) confirmYes.addEventListener('click', () => this.executeDownloadAll());
        
        const confirmNo = document.getElementById('offlineConfirmNoBtn');
        if (confirmNo) confirmNo.addEventListener('click', () => {
            document.getElementById('offlineConfirmBox').style.display = 'none';
        });

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
        document.getElementById('offlineConfirmBox').style.display = 'none';
        
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

    async startDownload(allSurahs) {
        if (this.isDownloading) return;
        
        const alertBox = document.getElementById('offlineAlertBox');
        if (alertBox) alertBox.style.display = 'none';

        if (allSurahs) {
            document.getElementById('offlineConfirmBox').style.display = 'block';
            return;
        }

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
    
    async executeDownloadAll() {
        document.getElementById('offlineConfirmBox').style.display = 'none';
        let data = DataHandler.cache[this.currentReading];
        if (!data) data = await DataHandler.loadReading(this.currentReading);
        if (!data) return;
        const all = [...new Set(DataHandler.getSurahs(data).map(s => s.number))];
        const existing = this._getStoredDownloads()[this.currentReading] || [];
        const surahsToDownload = all.filter(s => !existing.includes(s));
        if (surahsToDownload.length === 0) {
            const alertBox = document.getElementById('offlineAlertBox');
            if (alertBox) {
                alertBox.textContent = 'كل السور محمّلة مسبقاً لهذا القارئ.';
                alertBox.style.display = 'block';
            }
            return;
        }
        await this._startProcess(surahsToDownload);
    },

    async _startProcess(surahsToDownload) {
        let data = DataHandler.cache[this.currentReading];
        if (!data) data = await DataHandler.loadReading(this.currentReading);
        if (!data) return;

        this.downloadQueue = [];
        this._downloadingSurahs = surahsToDownload;
        
        const config = READINGS_CONFIG[this.currentReading];
        if (!config) return;

        for (const sNo of surahsToDownload) {
            const ayahs = data.filter(a => parseInt(a.sura_no) === sNo && parseInt(a.aya_no) > 0);
            for (const ayah of ayahs) {
                const tafsirUrl = `https://dev.surahapp.com/api/v1/aya/tafsir-mokhtasar/${sNo}/${ayah.aya_no}`;
                this.downloadQueue.push({ type: 'api', url: tafsirUrl, sura: sNo });
            }
            
            this.downloadQueue.push({ type: 'api', url: `https://dev.surahapp.com/api/v1/sura/asmaa-sowar/${sNo}`, sura: sNo });
            this.downloadQueue.push({ type: 'api', url: `https://dev.surahapp.com/api/v1/sura/fadael-sowar/${sNo}`, sura: sNo });

            if (config.isMonolithic) {
                const audioUrl = config.getAudioPath(sNo);
                if (audioUrl) this.downloadQueue.push({ type: 'audio', url: audioUrl, sura: sNo });
                
                const timingUrl = config.getTimingPath(sNo);
                if (timingUrl) this.downloadQueue.push({ type: 'json', url: timingUrl, sura: sNo });
            } else {
                for (const ayah of ayahs) {
                    let mappedHafsAyahs = [ayah.aya_no];
                    if (typeof AUDIO_MAP !== 'undefined') {
                        const rKey = config.audioMapKey || this.currentReading;
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
                        if (audioUrl) {
                            this.downloadQueue.push({ type: 'audio', url: audioUrl, sura: sNo });
                        }
                    }
                }
            }
        }

        if (this.downloadQueue.length === 0) return;

        this.isDownloading = true;
        this.isPaused = false;
        this.cancelRequested = false;
        this.totalItems = this.downloadQueue.length;
        this.downloadedItems = 0;

        this.updateUIStatus('start');
        await this.processQueue();
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
            
            try {
                const match = await cache.match(item.url);
                if (!match) {
                    const res = await fetch(item.url, { mode: 'cors', cache: 'no-store' });
                    if (res.ok) {
                        await cache.put(item.url, res);
                    }
                }
            } catch (e) {
                console.error(`Failed to download ${item.url}:`, e);
            }
            
            this.downloadedItems++;
            this.updateUIProgress();
        }

        if (this.cancelRequested) {
            this.updateUIStatus('stop');
        } else {
            const downloaded = this._getStoredDownloads();
            if (!downloaded[this.currentReading]) downloaded[this.currentReading] = [];
            
            this._downloadingSurahs.forEach(suraNo => {
                if (!downloaded[this.currentReading].includes(suraNo)) {
                    downloaded[this.currentReading].push(suraNo);
                }
            });
            this._saveStoredDownloads(downloaded);
            
            this.updateUIStatus('done');
            await this.populateSurahs();
            await this.updateDownloadedList();
        }

        this.isDownloading = false;
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

    deleteSurah(readingKey, suraNo) {
        const downloaded = this._getStoredDownloads();
        if (!downloaded[readingKey]) return;
        downloaded[readingKey] = downloaded[readingKey].filter(s => s !== suraNo);
        if (downloaded[readingKey].length === 0) delete downloaded[readingKey];
        this._saveStoredDownloads(downloaded);
        this.updateDownloadedList();
        if (readingKey === this.currentReading) this.populateSurahs();
    },

    updateUIStatus(state) {
        const progressC = document.getElementById('offlineProgressContainer');
        const dlBtns = document.getElementById('offlineDlBtns');
        const pauseBtn = document.getElementById('offlinePauseBtn');
        const stopBtn = document.getElementById('offlineStopBtn');

        if (state === 'start') {
            if (progressC) progressC.style.display = 'block';
            if (dlBtns) dlBtns.style.display = 'none';
            if (pauseBtn) pauseBtn.style.display = 'inline-block';
            if (stopBtn) stopBtn.style.display = 'inline-block';
        } else {
            if (progressC) progressC.style.display = 'none';
            if (dlBtns) dlBtns.style.display = 'flex';
            if (pauseBtn) pauseBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'none';
        }
    },

    updateUIProgress() {
        const percent = Math.round((this.downloadedItems / this.totalItems) * 100);
        const bar = document.getElementById('offlineProgressBar');
        const text = document.getElementById('offlineProgressPercent');
        const status = document.getElementById('offlineProgressText');
        const cfg = READINGS_CONFIG[this.currentReading] || {};

        if (bar) bar.style.width = percent + '%';
        if (text) text.textContent = percent + '%';
        if (status) status.textContent = `جاري التحميل (${cfg.reader || cfg.name})...`;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    OfflineManager.init();
});
