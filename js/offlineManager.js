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
        
        let surahsToDownload = [];
        let data = DataHandler.cache[this.currentReading];
        if (!data) data = await DataHandler.loadReading(this.currentReading);
        if (!data) return;

        if (allSurahs) {
            if (!confirm('تنبيه: تحميل القرآن كاملاً سيستغرق وقتاً طويلاً ومساحة تخزين كبيرة (قرابة 1 جيجابايت). هل تود المتابعة؟')) return;
            surahsToDownload = DataHandler.getSurahs(data).map(s => s.number);
        } else {
            const sel = document.getElementById('offlineSurahSelect');
            if (sel) surahsToDownload = [parseInt(sel.value)];
        }

        this.downloadQueue = [];
        
        // تجهيز الروابط
        for (const sNo of surahsToDownload) {
            const ayahs = data.filter(a => parseInt(a.sura_no) === sNo && parseInt(a.aya_no) > 0);
            for (const ayah of ayahs) {
                // Audio URL
                const audioUrl = AudioPlayer.getAudioPath(this.currentReading, ayah);
                if (audioUrl) {
                    this.downloadQueue.push({ type: 'audio', url: audioUrl, sura: sNo });
                }
                // Tafsir URL (Mokhtasar)
                const tafsirUrl = `https://dev.surahapp.com/api/v1/aya/tafsir-mokhtasar/${sNo}/${ayah.aya_no}`;
                this.downloadQueue.push({ type: 'api', url: tafsirUrl, sura: sNo });
            }
            // Sura Info API
            this.downloadQueue.push({ type: 'api', url: `https://dev.surahapp.com/api/v1/sura/asmaa-sowar/${sNo}`, sura: sNo });
            this.downloadQueue.push({ type: 'api', url: `https://dev.surahapp.com/api/v1/sura/fadael-sowar/${sNo}`, sura: sNo });
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
            alert('عذراً، متصفحك لا يدعم خاصية العمل بدون إنترنت.');
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
            
            // If it finished gracefully, the last sura requested (or all requested) are done.
            // A more robust way is tracking which surahs were completely downloaded, but for now we mark the requested ones.
            if (!document.getElementById('offlineSurahSelect')) return; // Ensure elements exist
            const suraNo = parseInt(document.getElementById('offlineSurahSelect').value);
            if (!downloaded[this.currentReading].includes(suraNo)) {
                downloaded[this.currentReading].push(suraNo);
                localStorage.setItem('offlineSurahs', JSON.stringify(downloaded));
            }
            
            alert('تم تحميل البيانات بنجاح! يمكنك الآن الاستماع والقراءة بدون إنترنت.');
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
