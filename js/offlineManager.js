/**
 * offlineManager.js - إدارة المكتبة المحملة (العمل بدون إنترنت)
 */
const OfflineManager = {
    cacheName: 'quran-offline-v1',
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
        sel.innerHTML = surahs.map(s => `<option value="${s.number}">${s.number}. ${s.nameAr}</option>`).join('');
        if (App.currentSurah) {
            sel.value = App.currentSurah;
        }
    },

    async updateDownloadedList() {
        const listEl = document.getElementById('offlineDownloadedList');
        if (!listEl) return;
        
        const downloaded = JSON.parse(localStorage.getItem('offlineSurahs') || '{}');
        const readingDl = downloaded[this.currentReading] || [];
        
        if (readingDl.length === 0) {
            listEl.innerHTML = '<p>لا توجد سور محملة بعد.</p>';
            return;
        }
        
        let data = DataHandler.cache[this.currentReading];
        if (!data) data = await DataHandler.loadReading(this.currentReading);
        const surahs = DataHandler.getSurahs(data);
        
        let html = '<ul style="list-style:none; padding:0; margin:0;">';
        readingDl.sort((a,b)=>a-b).forEach(sNo => {
            const sInfo = surahs.find(s => s.number === sNo);
            if (sInfo) {
                html += `<li style="padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;">
                    <span><i class="fas fa-check-circle" style="color:var(--primary)"></i> سورة ${sInfo.nameAr}</span>
                    <button class="btn btn-sm btn-danger" onclick="OfflineManager.deleteSurah(${sNo})"><i class="fas fa-trash"></i></button>
                </li>`;
            }
        });
        html += '</ul>';
        listEl.innerHTML = html;
    },

    async startDownload(allSurahs) {
        if (this.isDownloading) return;
        
        document.getElementById('offlineAlertBox').style.display = 'none';

        if (allSurahs) {
            document.getElementById('offlineConfirmBox').style.display = 'block';
            return;
        }

        const sel = document.getElementById('offlineSurahSelect');
        if (!sel) return;
        const surahsToDownload = [parseInt(sel.value)];
        
        await this._startProcess(surahsToDownload);
    },
    
    async executeDownloadAll() {
        document.getElementById('offlineConfirmBox').style.display = 'none';
        let data = DataHandler.cache[this.currentReading];
        if (!data) data = await DataHandler.loadReading(this.currentReading);
        if (!data) return;
        const surahsToDownload = DataHandler.getSurahs(data).map(s => s.number);
        await this._startProcess(surahsToDownload);
    },

    async _startProcess(surahsToDownload) {
        let data = DataHandler.cache[this.currentReading];
        if (!data) data = await DataHandler.loadReading(this.currentReading);
        if (!data) return;

        this.downloadQueue = [];
        this._downloadingSurahs = surahsToDownload;
        
        // تجهيز الروابط
        const config = READINGS_CONFIG[this.currentReading];
        if (!config) return;

        for (const sNo of surahsToDownload) {
            // إضافة السورة (البيانات JSON) - Already handled by loadReading caching, but we can queue JSON path explicitly if needed.
            // Tafsir URLs and Surah Info URLs
            const ayahs = data.filter(a => parseInt(a.sura_no) === sNo && parseInt(a.aya_no) > 0);
            for (const ayah of ayahs) {
                // Tafsir URL (Mokhtasar)
                const tafsirUrl = `https://dev.surahapp.com/api/v1/aya/tafsir-mokhtasar/${sNo}/${ayah.aya_no}`;
                this.downloadQueue.push({ type: 'api', url: tafsirUrl, sura: sNo });
            }
            
            // Sura Info API
            this.downloadQueue.push({ type: 'api', url: `https://dev.surahapp.com/api/v1/sura/asmaa-sowar/${sNo}`, sura: sNo });
            this.downloadQueue.push({ type: 'api', url: `https://dev.surahapp.com/api/v1/sura/fadael-sowar/${sNo}`, sura: sNo });

            // Audio URLs
            if (config.isMonolithic) {
                // One file per surah
                const audioUrl = config.getAudioPath(sNo);
                if (audioUrl) this.downloadQueue.push({ type: 'audio', url: audioUrl, sura: sNo });
                
                // Timing file
                const timingUrl = config.getTimingPath(sNo);
                if (timingUrl) this.downloadQueue.push({ type: 'json', url: timingUrl, sura: sNo });
            } else {
                // One file per ayah
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
        let lastSura = null;

        while (this.downloadQueue.length > 0) {
            if (this.cancelRequested) break;
            if (this.isPaused) {
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }

            const item = this.downloadQueue.shift();
            lastSura = item.sura;
            
            try {
                // Check if already cached
                const match = await cache.match(item.url);
                if (!match) {
                    await cache.add(item.url);
                }
            } catch (e) {
                console.error(`Failed to download ${item.url}:`, e);
                // In case of error, put it back or skip. We will skip and retry later if needed.
            }
            
            this.downloadedItems++;
            this.updateUIProgress();
        }

        if (this.cancelRequested) {
            this.updateUIStatus('stop');
        } else {
            // Save to localStorage
            const downloaded = JSON.parse(localStorage.getItem('offlineSurahs') || '{}');
            if (!downloaded[this.currentReading]) downloaded[this.currentReading] = [];
            
            this._downloadingSurahs.forEach(suraNo => {
                if (!downloaded[this.currentReading].includes(suraNo)) {
                    downloaded[this.currentReading].push(suraNo);
                }
            });
            localStorage.setItem('offlineSurahs', JSON.stringify(downloaded));
            
            const alertBox = document.getElementById('offlineAlertBox');
            if (alertBox) {
                alertBox.textContent = 'تم تحميل البيانات بنجاح! يمكنك الآن الاستماع والقراءة بدون إنترنت.';
                alertBox.style.background = '#d4edda';
                alertBox.style.color = '#155724';
                alertBox.style.border = '1px solid #c3e6cb';
                alertBox.style.display = 'block';
            }
            this.updateUIStatus('finish');
            this.updateDownloadedList();
        }
        
        this.isDownloading = false;
    },

    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('offlinePauseBtn');
        if (pauseBtn) {
            pauseBtn.innerHTML = this.isPaused ? '<i class="fas fa-play"></i> استئناف' : '<i class="fas fa-pause"></i> إيقاف مؤقت';
        }
    },

    stopDownload() {
        this.cancelRequested = true;
        this.isDownloading = false;
        this.downloadQueue = [];
        this.updateUIStatus('stop');
    },

    async deleteSurah(suraNo) {
        if (!confirm('هل أنت متأكد من حذف هذه السورة من الذاكرة المؤقتة؟')) return;
        
        const downloaded = JSON.parse(localStorage.getItem('offlineSurahs') || '{}');
        if (downloaded[this.currentReading]) {
            downloaded[this.currentReading] = downloaded[this.currentReading].filter(s => s !== suraNo);
            localStorage.setItem('offlineSurahs', JSON.stringify(downloaded));
        }
        this.updateDownloadedList();
    },

    updateUIStatus(status) {
        const dsBtn = document.getElementById('offlineDlSurahBtn');
        const daBtn = document.getElementById('offlineDlAllBtn');
        const pBtn = document.getElementById('offlinePauseBtn');
        const sBtn = document.getElementById('offlineStopBtn');
        const prog = document.getElementById('offlineProgressContainer');
        const txt = document.getElementById('offlineProgressText');

        if (status === 'start') {
            if (dsBtn) dsBtn.disabled = true;
            if (daBtn) daBtn.disabled = true;
            if (pBtn) pBtn.style.display = 'block';
            if (sBtn) sBtn.style.display = 'block';
            if (prog) prog.style.display = 'block';
            if (txt) txt.textContent = 'جاري التحميل...';
            this.updateUIProgress();
        } else if (status === 'stop' || status === 'finish') {
            if (dsBtn) dsBtn.disabled = false;
            if (daBtn) daBtn.disabled = false;
            if (pBtn) pBtn.style.display = 'none';
            if (sBtn) sBtn.style.display = 'none';
            if (prog) prog.style.display = 'none';
        }
    },

    updateUIProgress() {
        const bar = document.getElementById('offlineProgressBar');
        const pct = document.getElementById('offlineProgressPercent');
        if (!bar || !pct) return;

        const p = Math.floor((this.downloadedItems / this.totalItems) * 100) || 0;
        bar.style.width = p + '%';
        pct.textContent = p + '%';
    }
};

window.addEventListener('DOMContentLoaded', () => {
    OfflineManager.init();
});
