/**
 * audioPlayer.js - محرك الصوت الموحد للتشغيل المدمج والمتتابع
 */
const AudioPlayer = {
    audio: new Audio(),
    isPlaying: false,
    _audioFetchActive: false,
    currentAyah: null,
    isRepeat: false,
    currentlyHighlighted: null,
    groupedThresholds: [],

    audioQueue: [],
    groupedAyahs: [], // الآيات المجمعة التي تتشارك نفس الملف الصوتي
    
    playlist: [],          // قائمة الآيات المجدولة للاستماع المتتابع
    playlistIndex: -1,     // الفهرس الحالي بقائمة الاستماع
    playlistReadingKey: "",// رواية قائمة الاستماع
    isTransitioning: false,
    currentTimingKey: "",
    playlistRepeatCount: 1, // العداد الحالي لتكرار المقطع
    maxPlaylistRepeats: 1,  // التكرارات المحددة للمقطع بالكامل
    timingCache: {},
    preloadedAudioObjects: [],
    _warmedUrls: new Set(),
    _preloadQueue: [],
    _activePreloads: 0,
    _maxConcurrentPreloads: 1,
    _toastTimer: null,
    stopAtEndOfSura: null,
    keepStopBoundary: false,
    _loadId: 0,
    _playSession: 0,
    _cancelRequested: false,
    _pendingLoadCleanup: null,
    _metadataHandler: null,
    _loadTimeoutId: null,

    _isSessionAlive(session) {
        return session === this._playSession;
    },

    _bumpPlaySession() {
        this._playSession++;
        return this._playSession;
    },

    _guardPlayButtonNoSpinner() {
        const btn = document.getElementById('playPauseBtn');
        if (!btn || btn._spinnerGuard) return;
        btn._spinnerGuard = true;
        const fix = () => {
            if (btn.querySelector('.fa-spinner, .fa-spin')) {
                const playing = this.audio && !this.audio.paused && !!this.audio.src;
                btn.innerHTML = playing ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
            }
            btn.removeAttribute('aria-busy');
        };
        new MutationObserver(fix).observe(btn, { childList: true, subtree: true, attributes: true });
        fix();
    },

    init() {
        this.audio.preload = 'auto';
        this.audio.crossOrigin = 'anonymous';
        this._guardPlayButtonNoSpinner();

        this.audio.addEventListener('waiting', () => {
            if (this._cancelRequested || this.audio.paused || !this.currentAyah) return;
        });
        this.audio.addEventListener('stalled', () => {
            if (this._cancelRequested || this.audio.paused || !this.currentAyah) return;
        });
        this.audio.addEventListener('playing', () => {
            if (this._cancelRequested) return;
            this._audioFetchActive = false;
            this._setPlayerState('playing');
        });
        this.audio.addEventListener('canplay', () => {
            if (this._cancelRequested) return;
            if (!this.audio.paused) {
                this._audioFetchActive = false;
                this._setPlayerState('playing');
            }
        });
        this.audio.addEventListener('error', () => {
            this._audioFetchActive = false;
            this._setPlayerState('paused');
            console.error('Audio playback error:', this.audio.error, this.audio.src);
        });

        // ربط حدث انتهاء الصوت
        this.audio.onended = () => {
            if (this._cancelRequested) return;
            if (this.isMetaAudio) {
                this.isMetaAudio = false;
                this._setPlayerState('paused');
                return;
            }
            const config = READINGS_CONFIG[App.currentReading];
            
            if (this.playlist && this.playlist.length > 0 && this.playlistIndex >= 0) {
                if (this.isTransitioning) return;
                if (this.audioQueue && this.audioQueue.length > 0) {
                    const s = this._playSession;
                    const n = this.audioQueue.shift();
                    const url = typeof n === 'string' ? n : n.url;
                    const start = typeof n === 'string' ? 0 : n.start;
                    this._playAudioUrl(url, start, s).catch(() => {
                        if (this._isSessionAlive(s)) {
                            this.playlistIndex++;
                            this._playCurrentTrack();
                        }
                    });
                } else if (config.isMonolithic) {
                    this.playlistIndex++;
                    this._playCurrentTrack();
                } else {
                    this.playlistIndex++;
                    this._playCurrentTrack();
                }
            } else {
                // التشغيل العادي الفردي للآيات
                if (this.audioQueue && this.audioQueue.length > 0) {
                    const s = this._playSession;
                    const n = this.audioQueue.shift();
                    const url = typeof n === 'string' ? n : n.url;
                    const start = typeof n === 'string' ? 0 : n.start;
                    this._playAudioUrl(url, start, s).catch(() => {
                        if (this._isSessionAlive(s)) this.next();
                    });
                } else if (config.isMonolithic) {
                    if (this.stopAtEndOfSura === App.currentSurah) {
                        this.stop();
                        this._updateBtn(false);
                    } else {
                        const s = this._playSession;
                        this.next().catch(() => {});
                    }
                } else {
                    this.next();
                }
            }
        };

        // ربط حدث تحديث التوقيت
        this.audio.ontimeupdate = () => {
            const seek = document.getElementById('audioSeek');
            if (this.audio.duration && seek) {
                seek.value = (this.audio.currentTime / this.audio.duration) * 100;
            }
            
            const config = READINGS_CONFIG[App.currentReading];
            
            // --- النظام الهجين (تظليل بناءً على التوقيت الزمني) ---
            if (config.isMonolithic && this.currentTimingData) {
                const cTime = this.audio.currentTime * 1000; // تحويل إلى ملي ثانية
                let activeAyaData = null;
                
                // البحث عن الآية التي يتم قراءتها حالياً بناءً على الوقت
                for (let i = 0; i < this.currentTimingData.length; i++) {
                    const t = this.currentTimingData[i];
                    if (cTime >= t.start_time && cTime <= t.end_time) {
                        activeAyaData = t;
                        break;
                    }
                }

                if (activeAyaData) {
                    const activeAyaNo = activeAyaData.ayah;
                    if (this.currentlyHighlighted !== activeAyaNo && this.audio.currentTime > 0.2) {
                        this.currentlyHighlighted = activeAyaNo;
                        const allAyahs = DataHandler.cache[App.currentReading];
                        if (allAyahs) {
                            this.currentAyah = allAyahs.find(a => a.aya_no === activeAyaNo && a.sura_no === App.currentSurah);
                        }
                        this._highlightSingle(activeAyaNo, App.currentSurah);
                    }
                    
                    // منطق التكرار التلقائي للآية في قائمة الاستماع
                    if (this.playlist && this.playlist.length > 0 && this.playlistIndex >= 0) {
                        if (this.isTransitioning) return;
                        const track = this.playlist[this.playlistIndex];
                        if (track.aya_no === activeAyaNo && cTime >= activeAyaData.end_time - 150) {
                            if (this.isRepeat) {
                                this.audio.currentTime = activeAyaData.start_time / 1000;
                            } else {
                                this.playlistIndex++;
                                this._playCurrentTrack();
                            }
                            return;
                        }
                    } else {
                        // منطق التكرار العادي للآية الواحدة
                        if (this.isRepeat && cTime >= activeAyaData.end_time - 150) {
                            this.audio.currentTime = activeAyaData.start_time / 1000;
                        }
                    }
                } else if (this.currentTimingData.length > 0) {
                    const lastAya = this.currentTimingData[this.currentTimingData.length - 1];
                    if (cTime >= lastAya.end_time && !this.isRepeat) {
                        if (this.playlist && this.playlist.length > 0 && this.playlistIndex >= 0) {
                            if (this.isTransitioning) return;
                            this.playlistIndex++;
                            this._playCurrentTrack();
                        }
                    }
                }
                if (this.currentlyHighlighted && !document.querySelector('.ayah-container.active')) {
                    this._highlightSingle(this.currentlyHighlighted, App.currentSurah);
                }
            } else {
                // التظليل النسبي الذكي للآيات المدمجة (النظام القديم)
                if (this.groupedAyahs && this.groupedAyahs.length > 1 && this.audio.duration && this.audio.currentTime > 0.2) {
                    const ratio = this.audio.currentTime / this.audio.duration;
                    let activeAya = this.groupedAyahs[0];
                    for (const t of this.groupedThresholds) {
                        if (ratio <= t.ratio) {
                            activeAya = t.aya;
                            break;
                        }
                    }
                    if (this.currentlyHighlighted !== activeAya) {
                        this.currentlyHighlighted = activeAya;
                        this._highlightSingle(activeAya, App.currentSurah);
                    }
                }
                if (this.currentlyHighlighted && !document.querySelector('.ayah-container.active')) {
                    this._highlightSingle(this.currentlyHighlighted, App.currentSurah);
                }
            }
        };

        this.audio.onpause = () => {
            if (!this._cancelRequested && !this._audioFetchActive) this._setPlayerState('paused');
        };

        const repeatBtn = document.getElementById('repeatBtn');
        if (repeatBtn) repeatBtn.onclick = () => this.toggleRepeat();

        const cancelActiveModeBtn = document.getElementById('cancelActiveModeBtn');
        if (cancelActiveModeBtn) cancelActiveModeBtn.onclick = () => {
            this.stop();
            this.maxPlaylistRepeats = 1;
            cancelActiveModeBtn.style.display = 'none';
            const statusEl = document.getElementById('lsStatus');
            if (statusEl) statusEl.textContent = 'تم الإلغاء.';
            this._showToast('تم إنهاء التشغيل الحالي.');
        };
    },

    _showToast(message) {
        const el = document.getElementById('appToast');
        if (!el) return;
        el.textContent = message;
        el.hidden = false;
        if (this._toastTimer) clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => { el.hidden = true; }, 4500);
    },

    _showPlayError(message) {
        this._showToast(message || 'تعذّر تشغيل الصوت. تحقق من الاتصال أو جرّب لاحقاً.');
    },

    /** تجهيز فوري لآية واحدة — لا يؤخر التشغيل */
    preloadAyahImmediate(readingKey, ayah) {
        if (!readingKey || !ayah || ayah.aya_no <= 0) return;
        const config = READINGS_CONFIG[readingKey];
        if (!config) return;
        if (!this._warmedUrls) this._warmedUrls = new Set();
        this._collectAyahAudioUrls(readingKey, ayah, config).reverse().forEach((u) => this._warmAudioElement(u, true));
        if (config.isMonolithic) this._warmTiming(readingKey, ayah.sura_no, config);
    },

    /** تجهيز الصفحات في الخلفية: الحالية ثم التالية ثم السابقة */
    scheduleBackgroundPreload(readingKey, centerPage) {
        if (!readingKey || !centerPage) return;
        


        const run = async (page) => {
            if (page < 1 || page > 604) return;
            const ayahs = await DataHandler.getPageAyahs(readingKey, page);
            if (ayahs && ayahs.length) this._preloadAyahsIncremental(readingKey, ayahs);
        };
        run(centerPage);
        setTimeout(() => run(centerPage + 1), 80);
        setTimeout(() => run(centerPage - 1), 160);
    },

    _collectAyahAudioUrls(readingKey, ayah, config) {
        const urls = [];
        if (config.isMonolithic) {
            const u = config.getAudioPath(ayah.sura_no);
            if (u) urls.push(u);
            return urls;
        }
        let mappedHafsAyahs = [ayah.aya_no];
        if (typeof AUDIO_MAP !== 'undefined') {
            const rKey = config.audioMapKey || readingKey;
            if (rKey && AUDIO_MAP[rKey] && AUDIO_MAP[rKey][ayah.sura_no] && AUDIO_MAP[rKey][ayah.sura_no][ayah.aya_no]) {
                mappedHafsAyahs = AUDIO_MAP[rKey][ayah.sura_no][ayah.aya_no];
            }
        }
        for (const hafsAya of mappedHafsAyahs) {
            const u = config.getAudioPath({
                sura_no: ayah.sura_no,
                aya_no: hafsAya,
                jozz: ayah.jozz
            });
            if (u) urls.push(u);
        }
        return urls;
    },

    async _warmTiming(readingKey, suraNo, config) {
        if (!config.getTimingPath) return;
        const cacheKey = `${readingKey}_${suraNo}`;
        if (!this.timingCache) this.timingCache = {};
        if (this.timingCache[cacheKey]) return;
        try {
            const res = await fetch(config.getTimingPath(suraNo));
            if (res.ok) this.timingCache[cacheKey] = await res.json();
        } catch (e) { /* ignore */ }
    },

    _warmAudioElement(url, priority = false) {
        if (!url || typeof url !== 'string' || url.startsWith('blob:')) return;
        if (this._warmedUrls.has(url)) return;
        this._warmedUrls.add(url);
        
        if (priority) {
            this._preloadQueue.unshift(url);
        } else {
            this._preloadQueue.push(url);
        }
        this._processPreloadQueue();
    },

    _processPreloadQueue() {
        if (this._activePreloads >= this._maxConcurrentPreloads || this._preloadQueue.length === 0) return;
        


        const url = this._preloadQueue.shift();
        this._activePreloads++;

        const preloadAudio = new Audio();
        preloadAudio.preload = 'auto';
        preloadAudio.src = url;

        const done = () => {
            this._activePreloads--;
            setTimeout(() => this._processPreloadQueue(), 150);
        };

        preloadAudio.addEventListener('canplaythrough', done, { once: true });
        preloadAudio.addEventListener('error', done, { once: true });
        
        // وقت أمان 2.5 ثانية في حال تأخر الاستجابة لتحرير القناة
        setTimeout(() => {
            preloadAudio.removeEventListener('canplaythrough', done);
            preloadAudio.removeEventListener('error', done);
            done();
        }, 2500);

        if (!this.preloadedAudioObjects) this.preloadedAudioObjects = [];
        this.preloadedAudioObjects.push(preloadAudio);
    },

    _preloadAyahsIncremental(readingKey, ayahs) {
        if (!readingKey || !ayahs || ayahs.length === 0) return;
        const config = READINGS_CONFIG[readingKey];
        if (!config) return;
        if (!this.timingCache) this.timingCache = {};
        if (!this.preloadedAudioObjects) this.preloadedAudioObjects = [];
        if (!this._warmedUrls) this._warmedUrls = new Set();

        const surahsForTiming = new Set();
        const isMonolithic = config.isMonolithic;
        let count = 0;
        
        for (const a of ayahs) {
            if (!a || a.aya_no <= 0) continue;
            

            
            this._collectAyahAudioUrls(readingKey, a, config).forEach((u) => this._warmAudioElement(u));
            if (isMonolithic) surahsForTiming.add(a.sura_no);
        }
        surahsForTiming.forEach((suraNo) => this._warmTiming(readingKey, suraNo, config));
    },

    _cancelPendingLoad() {
        if (this._pendingLoadCleanup) {
            this._pendingLoadCleanup();
            this._pendingLoadCleanup = null;
        }
        if (this._metadataHandler) {
            this.audio.removeEventListener('loadedmetadata', this._metadataHandler);
            this._metadataHandler = null;
        }
    },

    _hardStopAudio() {
        this._loadId++;
        this._cancelRequested = true;
        this._cancelPendingLoad();
        if (this._loadTimeoutId) {
            clearTimeout(this._loadTimeoutId);
            this._loadTimeoutId = null;
        }
        this._audioFetchActive = false;
        this.isTransitioning = false;
        
        // تفريغ طابور التحميل المسبق لفتح القنوات فوراً عند طلب تشغيل أو إيقاف
        this._preloadQueue = [];
        this._activePreloads = 0;
        
        try {
            this.audio.pause();
            this.audio.removeAttribute('src');
            this.audio.load();
        } catch (e) { /* ignore */ }
        this._setPlayerState('paused');
    },

    cancelLoad() {
        this._hardStopAudio();
    },

    stop() {
        this._bumpPlaySession();
        this._hardStopAudio();
        this.audioQueue = [];
        this.groupedAyahs = [];
        this.playlist = [];
        this.playlistIndex = -1;
        this.maxPlaylistRepeats = 1;
        const cancelActiveModeBtn = document.getElementById('cancelActiveModeBtn');
        if (cancelActiveModeBtn) cancelActiveModeBtn.style.display = 'none';
    },

    buildPlaylistFromRange(readingKey, ayahs) {
        this.stop();
        this.playlist = ayahs;
        this.playlistIndex = 0;
        this.playlistReadingKey = readingKey;
        this.playlistRepeatCount = 1;
    },

    async _playCurrentTrack() {
        if (this.isTransitioning) return;
        if (!this.playlist || this.playlist.length === 0 || this.playlistIndex < 0) {
            this.stop();
            return;
        }
        if (this.playlistIndex >= this.playlist.length) {
            if (this.playlistRepeatCount < this.maxPlaylistRepeats) {
                this.playlistRepeatCount++;
                this.playlistIndex = 0;
                const statusEl = document.getElementById('lsStatus');
                if (statusEl) statusEl.textContent = `▶ تكرار المقطع (المرة ${this.playlistRepeatCount} من ${this.maxPlaylistRepeats === Infinity ? 'لا محدود' : this.maxPlaylistRepeats})`;
            } else {
                console.log("Playlist finished!");
                this.stop();
                const statusEl = document.getElementById('lsStatus');
                if (statusEl) statusEl.textContent = '✅ انتهى تشغيل المقطع المحدد';
                return;
            }
        }
        
        const cancelActiveModeBtn = document.getElementById('cancelActiveModeBtn');
        if (cancelActiveModeBtn) {
            if (this.maxPlaylistRepeats > 1) {
                cancelActiveModeBtn.style.display = 'inline-block';
            } else {
                cancelActiveModeBtn.style.display = 'none';
            }
        }

        this.isTransitioning = true;
        const track = this.playlist[this.playlistIndex];
        const targetPage = App.resolvePageForAyah(track, App.currentPage);

        try {
            if (this.playlistReadingKey && App.currentReading !== this.playlistReadingKey) {
                App.currentReading = this.playlistReadingKey;
                const rSel = document.getElementById('readingSelect');
                if (rSel) rSel.value = this.playlistReadingKey;
            }

            if (!App.isAyahOnPage(track, App.currentPage)) {
                await App.loadPage(targetPage, true, false, false);
            }

            await this._playPlaylistAyah(track.aya_no, track.sura_no);
        } finally {
            this.isTransitioning = false;
        }
    },

    async _playPlaylistAyah(ayahNo, suraNo) {
        const playSession = this._playSession;
        const config = READINGS_CONFIG[App.currentReading];
        const ayahs = DataHandler.cache[App.currentReading];
        if (!ayahs || !ayahs.length) return;
        const ayah = ayahs.find(a => a.aya_no === ayahNo && a.sura_no === suraNo);

        if (!ayah) return;

        // تجهيز مسبق فوري للآية الحالية لتبدأ فوراً بعد انتهاء البسملة
        this.preloadAyahImmediate(App.currentReading, ayah);



        this.currentAyah = ayah;
        App.currentSurah = suraNo;
        this.currentlyHighlighted = ayahNo;
        this._highlightSingle(ayahNo, suraNo);

        const title = document.getElementById('currentSurahTitle');
        if (title) title.textContent = `سورة ${ayah.sura_name_ar}`;
        const sSel = document.getElementById('surahSelect');
        if (sSel) sSel.value = suraNo;

        const textToCheck = (ayah.aya_text_emlaey || ayah.aya_text || '').replace(/[^\u0621-\u064A\s]/g, '');
        const isAyahItselfBasmalah = (suraNo === 1 && ayahNo === 1 && textToCheck.includes('بسم الله'));
        const needsBasmalah = (ayahNo === 1 && suraNo !== 9 && !isAyahItselfBasmalah);

        // --- تشغيل مدمج بداخل قائمة الاستماع ---
        if (config.isMonolithic) {
            this.groupedAyahs = [ayahNo];
            
            const cacheKey = `${App.currentReading}_${suraNo}`;
            if (this.timingCache && this.timingCache[cacheKey]) {
                this.currentTimingData = this.timingCache[cacheKey];
                this.currentTimingKey = cacheKey;
            } else if (this.currentTimingKey !== cacheKey) {
                try {
                    const timingUrl = config.getTimingPath(suraNo);
                    const res = await fetch(timingUrl);
                    this.currentTimingData = await res.json();
                    this.currentTimingKey = cacheKey;
                    this.timingCache[cacheKey] = this.currentTimingData;
                } catch (e) {
                    console.error("Failed to load timing data:", e);
                    return;
                }
            }
            if (!this._isSessionAlive(playSession)) return;

            const ayahTiming = this.currentTimingData.find(t => t.ayah === ayahNo);
            if (!ayahTiming) {
                console.log("Ayah timing not found for target:", ayahNo);
                return;
            }

            const audioUrl = config.getAudioPath(suraNo);
            let startSec = Math.max(0, (ayahTiming.start_time / 1000) + (config.timeOffset || 0));
            if (needsBasmalah) {
                startSec = 0; // البدء من الصفر تماماً لتشغيل البسملة المدمجة في الملف
            }

            try {
                await this._playAudioUrl(audioUrl, startSec, playSession);
            } catch (e) {
                if (e && e.message === 'aborted') return;
                return;
            }
            if (!this._isSessionAlive(playSession)) return;
            return;
        }

        // --- تشغيل عادي بداخل قائمة الاستماع ---
        let mappedHafsAyahs = [ayahNo];
        this.groupedAyahs = [ayahNo];

        if (typeof AUDIO_MAP !== 'undefined') {
            const cfg = READINGS_CONFIG[App.currentReading];
            const readingKey = cfg ? cfg.audioMapKey : null;
            if (readingKey && AUDIO_MAP[readingKey]) {
                const suraMap = AUDIO_MAP[readingKey][suraNo];
                if (suraMap && suraMap[ayahNo]) {
                    mappedHafsAyahs = suraMap[ayahNo];
                    
                    const sharedAyahs = [];
                    const mappedStr = JSON.stringify(mappedHafsAyahs);
                    for (const [wAya, hAyas] of Object.entries(suraMap)) {
                        if (JSON.stringify(hAyas) === mappedStr) {
                            sharedAyahs.push(parseInt(wAya));
                        }
                    }
                    if (sharedAyahs.length > 0) {
                        this.groupedAyahs = sharedAyahs.sort((a, b) => a - b);
                        
                        let totalChars = 0;
                        const ayahLengths = [];
                        for (const aya of this.groupedAyahs) {
                            const aObj = ayahs.find(a => a.aya_no === aya && a.sura_no === suraNo);
                            const textLen = aObj && aObj.aya_text ? aObj.aya_text.replace(/[^\u0621-\u064A]/g, '').length : 1;
                            totalChars += textLen;
                            ayahLengths.push({ aya, len: textLen });
                        }
                        
                        this.groupedThresholds = [];
                        let cumulative = 0;
                        for (const a of ayahLengths) {
                            cumulative += a.len;
                            this.groupedThresholds.push({ aya: a.aya, ratio: cumulative / totalChars });
                        }
                    }
                }
            }
        }

        this.audioQueue = mappedHafsAyahs.map(hafsAyaNo => {
            return config.getAudioPath({
                sura_no: suraNo,
                aya_no: hafsAyaNo,
                jozz: ayah.jozz
            });
        });

        if (needsBasmalah) {
            this.audioQueue.unshift('assets/fallback_basmalah.mp3');
        }

        const firstUrl = this.audioQueue.shift();
        try {
            await this._playAudioUrl(firstUrl, 0, playSession);
        } catch (e) {
            if (e && e.message === 'aborted') return;
            return;
        }
        if (!this._isSessionAlive(playSession)) return;

        if (this.groupedAyahs.length > 1) {
            this.currentlyHighlighted = this.groupedAyahs[0];
            this._highlightSingle(this.groupedAyahs[0]);
        } else {
            this.currentlyHighlighted = ayahNo;
            this._highlightGroup(this.groupedAyahs);
        }
    },

    _findPrevAyah(currentAyah) {
        const allData = DataHandler.cache[App.currentReading];
        if (!allData || !currentAyah) return null;
        const minInGroup = Math.min(...(this.groupedAyahs && this.groupedAyahs.length ? this.groupedAyahs : [currentAyah.aya_no]));
        const suraAyahs = allData
            .filter(a => a.sura_no === currentAyah.sura_no && a.aya_no > 0)
            .sort((a, b) => a.aya_no - b.aya_no);
        const idx = suraAyahs.findIndex(a => a.aya_no === minInGroup);
        if (idx > 0) return suraAyahs[idx - 1];
        if (currentAyah.sura_no <= 1) return null;
        const prevSura = allData.filter(a => a.sura_no === currentAyah.sura_no - 1 && a.aya_no > 0);
        if (!prevSura.length) return null;
        return prevSura.reduce((best, a) => (a.aya_no > best.aya_no ? a : best), prevSura[0]);
    },

    _findNextAyah(currentAyah) {
        const allData = DataHandler.cache[App.currentReading];
        if (!allData || !currentAyah) return null;
        const maxInGroup = Math.max(...(this.groupedAyahs && this.groupedAyahs.length ? this.groupedAyahs : [currentAyah.aya_no]));
        const suraAyahs = allData
            .filter(a => a.sura_no === currentAyah.sura_no && a.aya_no > 0)
            .sort((a, b) => a.aya_no - b.aya_no);
        const idx = suraAyahs.findIndex(a => a.aya_no === maxInGroup);
        if (idx >= 0 && idx < suraAyahs.length - 1) return suraAyahs[idx + 1];
        if (this.stopAtEndOfSura === currentAyah.sura_no) return null;
        return allData.find(a => a.sura_no === currentAyah.sura_no + 1 && a.aya_no === 1) || null;
    },

    async playAyah(ayahNo, suraNo = App.currentSurah, opts = {}) {
        console.log('playAyah called:', { ayahNo, suraNo, opts });

        if (!this.keepStopBoundary) {
            this.stopAtEndOfSura = null;
        }
        this.keepStopBoundary = false;

        const reuseSession = !!opts.session;
        const playSession = reuseSession ? opts.session : this._bumpPlaySession();

        if (!reuseSession) {
            this.playlist = [];
            this.playlistIndex = -1;
            this.playlistReadingKey = "";
            this.groupedAyahs = [];
            this.audioQueue = [];
            this.maxPlaylistRepeats = 1;
            const cancelActiveModeBtn = document.getElementById('cancelActiveModeBtn');
            if (cancelActiveModeBtn) cancelActiveModeBtn.style.display = 'none';
            this._hardStopAudio();
        }

        const config = READINGS_CONFIG[App.currentReading];
        if (!config) return;

        if (!DataHandler.cache[App.currentReading]) {
            await DataHandler.loadReading(App.currentReading);
        }
        if (!this._isSessionAlive(playSession)) return;

        const ayahs = DataHandler.cache[App.currentReading];
        if (!ayahs || !ayahs.length) return;

        const ayah = ayahs.find(a => a.aya_no === ayahNo && a.sura_no === suraNo);
        if (!ayah) return;

        // الانتقال البصري للصفحة فوراً إذا لم تكن معروضة
        if (!App.isAyahOnPage(ayah, App.currentPage)) {
            const targetPage = App.resolvePageForAyah(ayah, App.currentPage);
            await App.loadPage(targetPage, true, false, false);
            if (!this._isSessionAlive(playSession)) return;
        }

        // تجهيز مسبق فوري للآية المطلوبة لتبدأ فوراً بعد انتهاء البسملة
        this.preloadAyahImmediate(App.currentReading, ayah);



        this.currentAyah = ayah;
        App.currentSurah = suraNo;
        this.currentlyHighlighted = ayahNo;
        this._highlightSingle(ayahNo, suraNo);
        
        const textToCheck = (ayah.aya_text_emlaey || ayah.aya_text || '').replace(/[^\u0621-\u064A\s]/g, '');
        const isAyahItselfBasmalah = (suraNo === 1 && ayahNo === 1 && textToCheck.includes('بسم الله'));
        const needsBasmalah = (ayahNo === 1 && suraNo !== 9 && !isAyahItselfBasmalah) && (!opts || !opts.skipBasmalah);

        // --- الهيكل الهجين: نظام السورة المدمجة (Monolithic) ---
        if (config.isMonolithic) {
            this.groupedAyahs = [ayahNo];
            
            const cacheKey = `${App.currentReading}_${suraNo}`;
            if (this.timingCache && this.timingCache[cacheKey]) {
                this.currentTimingData = this.timingCache[cacheKey];
                this.currentTimingKey = cacheKey;
            } else if (this.currentTimingKey !== cacheKey) {
                try {
                    const timingUrl = config.getTimingPath(suraNo);
                    const res = await fetch(timingUrl);
                    this.currentTimingData = await res.json();
                    this.currentTimingKey = cacheKey;
                    this.timingCache[cacheKey] = this.currentTimingData;
                } catch (e) {
                    console.error("Failed to load timing data:", e);
                    this._showPlayError('تعذّر تحميل توقيت الآية.');
                    return;
                }
            }
            if (!this._isSessionAlive(playSession)) return;

            const ayahTiming = this.currentTimingData.find(t => t.ayah === ayahNo);
            
            if (!ayahTiming) {
                console.log("Ayah timing not found for target:", ayahNo);
                this._showPlayError('توقيت هذه الآية غير متوفر لهذا القارئ.');
                return;
            }

            const audioUrl = config.getAudioPath(suraNo);

            if (typeof App !== 'undefined' && App.TestingMode && App.TestingMode.isActive) {
                const el = document.querySelector(`.ayah-container[data-no="${ayahNo}"][data-surah="${suraNo}"]`);
                if (el && el.classList.contains('hidden-ayah')) {
                    this._setPlayerState('paused');
                    return;
                }
            }

            let startSec = Math.max(0, (ayahTiming.start_time / 1000) + (config.timeOffset || 0));
            
            if (needsBasmalah) {
                startSec = 0; // البدء من الصفر تماماً لتشغيل البسملة المدمجة في الملف
            }

            try {
                await this._playAudioUrl(audioUrl, startSec, playSession);
            } catch (e) {
                if (e && e.message === 'aborted') return;
                if (!this._isSessionAlive(playSession)) return;
                console.error('Monolithic play failed:', e);
                this._showPlayError();
                return;
            }
            if (!this._isSessionAlive(playSession)) return;
            return;
        }
        // --- نهاية النظام المدمج ---

        // 1. Check if mapping exists
        let mappedHafsAyahs = [ayahNo]; // Fallback (1:1)
        this.groupedAyahs = [ayahNo]; // Default to single ayah
        
        if (typeof AUDIO_MAP !== 'undefined') {
            const cfg = READINGS_CONFIG[App.currentReading];
            const readingKey = cfg ? cfg.audioMapKey : null;
            if (readingKey && AUDIO_MAP[readingKey]) {
                const suraMap = AUDIO_MAP[readingKey][suraNo];
                if (suraMap && suraMap[ayahNo]) {
                    mappedHafsAyahs = suraMap[ayahNo];
                    
                    const sharedAyahs = [];
                    const mappedStr = JSON.stringify(mappedHafsAyahs);
                    for (const [wAya, hAyas] of Object.entries(suraMap)) {
                        if (JSON.stringify(hAyas) === mappedStr) {
                            sharedAyahs.push(parseInt(wAya));
                        }
                    }
                    if (sharedAyahs.length > 0) {
                        this.groupedAyahs = sharedAyahs.sort((a, b) => a - b);
                        
                        let totalChars = 0;
                        const ayahLengths = [];
                        for (const aya of this.groupedAyahs) {
                            const aObj = ayahs.find(a => a.aya_no === aya && a.sura_no === suraNo);
                            const textLen = aObj && aObj.aya_text ? aObj.aya_text.replace(/[^\u0621-\u064A]/g, '').length : 1;
                            totalChars += textLen;
                            ayahLengths.push({ aya, len: textLen });
                        }
                        
                        this.groupedThresholds = [];
                        let cumulative = 0;
                        for (const a of ayahLengths) {
                            cumulative += a.len;
                            this.groupedThresholds.push({ aya: a.aya, ratio: cumulative / totalChars });
                        }
                    }
                }
            }
        }
        
        // 2. Generate URLs for the mapped ayahs (they follow Hafs numbering)
        this.audioQueue = mappedHafsAyahs.map(hafsAyaNo => {
            return config.getAudioPath({
                sura_no: suraNo,
                aya_no: hafsAyaNo,
                jozz: ayah.jozz
            });
        });

        if (needsBasmalah) {
            this.audioQueue.unshift('assets/fallback_basmalah.mp3');
        }

        const firstUrl = this.audioQueue.shift();
        if (!firstUrl) {
            this._showPlayError('رابط الصوت غير متوفر لهذه الآية.');
            return;
        }
        
        if (typeof App !== 'undefined' && App.TestingMode && App.TestingMode.isActive) {
            const el = document.querySelector(`.ayah-container[data-no="${ayahNo}"][data-surah="${suraNo}"]`);
            if (el && el.classList.contains('hidden-ayah')) {
                this._setPlayerState('paused');
                return;
            }
        }

        if (!this._isSessionAlive(playSession)) return;

        try {
            await this._playAudioUrl(firstUrl, 0, playSession);
        } catch (e) {
            if (e && e.message === 'aborted') return;
            if (!this._isSessionAlive(playSession)) return;
            console.error('Ayah play failed:', e);
            this._showPlayError();
            return;
        }
        if (!this._isSessionAlive(playSession)) return;
        
        if (this.groupedAyahs.length > 1) {
            this.currentlyHighlighted = this.groupedAyahs[0];
            this._highlightSingle(this.groupedAyahs[0], suraNo);
        } else {
            this._highlightGroup(this.groupedAyahs, suraNo);
        }
    },

    async playIstiazah() {
        const session = this._bumpPlaySession();
        this._hardStopAudio();
        this._removeHighlight();
        this.playlist = [];
        this.playlistIndex = -1;
        this.playlistReadingKey = "";
        this.currentAyah = null;
        this.isMetaAudio = true;
        const config = READINGS_CONFIG[App.currentReading];
        const path = (config && config.getIstiazahPath && typeof config.getIstiazahPath === 'function') 
            ? config.getIstiazahPath() 
            : 'assets/fallback_istiazah.mp3';
        try { await this._playAudioUrl(path, 0, session); } catch (e) {
            if (e && e.message !== 'aborted') console.error(e);
        }
    },

    async playBasmalah() {
        const session = this._bumpPlaySession();
        this._hardStopAudio();
        this._removeHighlight();
        this.playlist = [];
        this.playlistIndex = -1;
        this.playlistReadingKey = "";
        this.currentAyah = null;
        this.isMetaAudio = true;
        const config = READINGS_CONFIG[App.currentReading];
        const path = (config && config.getBasmalahPath && typeof config.getBasmalahPath === 'function')
            ? config.getBasmalahPath()
            : 'assets/fallback_basmalah.mp3';
        try { await this._playAudioUrl(path, 0, session); } catch (e) {
            if (e && e.message !== 'aborted') console.error(e);
        }
    },

    isAudioFetching() {
        return !!this._audioFetchActive;
    },

    togglePlayPause() {
        if (this._audioFetchActive) {
            this.stop();
            return;
        }

        const isCurrentAyahOnPage = this.currentAyah && typeof UI !== 'undefined' && UI.currentPageAyahs && 
            UI.currentPageAyahs.some(a => a.sura_no === this.currentAyah.sura_no && a.aya_no === this.currentAyah.aya_no);

        if (this.audio.src && this.audio.src !== window.location.href && isCurrentAyahOnPage) {
            if (this.audio.paused) this.audio.play();
            else this.audio.pause();
        } else {
            this.startPagePlaybackPrompt();
        }
    },

    startPagePlaybackPrompt() {
        if (typeof UI === 'undefined' || !UI.currentPageAyahs || UI.currentPageAyahs.length === 0) {
            this.playAyah(1, App.currentSurah);
            return;
        }

        const ayahs = UI.currentPageAyahs;
        const surahsOnPage = [];
        const seenSurahs = new Set();
        ayahs.forEach(a => {
            if (!seenSurahs.has(a.sura_no)) {
                seenSurahs.add(a.sura_no);
                surahsOnPage.push({ no: a.sura_no, name: a.sura_name_ar, firstAyah: a.aya_no });
            }
        });

        if (surahsOnPage.length <= 1) {
            this.playAyah(ayahs[0].aya_no, ayahs[0].sura_no);
        } else {
            const modal = document.getElementById('playChoiceModal');
            const container = document.getElementById('playChoiceContainer');
            if (modal && container) {
                container.innerHTML = '';

                // 1. خيار تشغيل الصفحة بالكامل
                const btnFullPage = document.createElement('button');
                btnFullPage.className = 'btn btn-primary w-100 mb-2';
                btnFullPage.innerHTML = `<i class="fas fa-file-alt"></i> بداية الصفحة`;
                btnFullPage.onclick = () => {
                    modal.classList.remove('active');
                    this.keepStopBoundary = false;
                    this.stopAtEndOfSura = null;
                    this.playAyah(ayahs[0].aya_no, ayahs[0].sura_no);
                };
                container.appendChild(btnFullPage);

                // 2. خيارات السور التي تبدأ في هذه الصفحة
                surahsOnPage.filter(s => s.firstAyah === 1).forEach((s) => {
                    const btnSurah = document.createElement('button');
                    btnSurah.className = 'btn btn-success w-100 mb-2';
                    btnSurah.innerHTML = `<i class="fas fa-book-open"></i> بداية سورة ${s.name}`;
                    btnSurah.onclick = () => {
                        modal.classList.remove('active');
                        // Play from this surah's first ayah on this page, and stop at end of this surah
                        this.keepStopBoundary = true;
                        this.stopAtEndOfSura = s.no;
                        this.playAyah(s.firstAyah, s.no);
                    };
                    container.appendChild(btnSurah);
                });

                modal.classList.add('active');
            } else {
                this.playAyah(ayahs[0].aya_no, ayahs[0].sura_no);
            }
        }
    },

    async _continueToAyah(nextAyah, playSession) {
        if (!nextAyah || !this._isSessionAlive(playSession)) return;

        if (!App.isAyahOnPage(nextAyah, App.currentPage)) {
            const targetPage = App.resolvePageForAyah(nextAyah, App.currentPage);
            await App.loadPage(targetPage, true, false, false);
            if (!this._isSessionAlive(playSession)) return;
        }

        await this.playAyah(nextAyah.aya_no, nextAyah.sura_no, { session: playSession, skipBasmalah: false });
    },

    async next() {
        if (!this.currentAyah || this.isTransitioning) return;
        const playSession = this._playSession;
        if (this.isRepeat) {
            await this.playAyah(this.currentAyah.aya_no, this.currentAyah.sura_no, { session: playSession, skipBasmalah: true });
            return;
        }

        const nextAyah = this._findNextAyah(this.currentAyah);
        if (!nextAyah) {
            if (this.stopAtEndOfSura === this.currentAyah.sura_no) {
                this.stopAtEndOfSura = null;
            }
            this.stop();
            this._updateBtn(false);
            return;
        }

        try {
            await this._continueToAyah(nextAyah, playSession);
        } catch (e) {
            console.error('next ayah failed:', e);
            this._setPlayerState('paused');
        }
    },

    async prev() {
        if (!this.currentAyah || this.isTransitioning) return;
        const prevAyah = this._findPrevAyah(this.currentAyah);
        if (!prevAyah) return;
        try {
            if (!App.isAyahOnPage(prevAyah, App.currentPage)) {
                const targetPage = App.resolvePageForAyah(prevAyah, App.currentPage);
                await App.loadPage(targetPage, true, false, false);
            }
            await this.playAyah(prevAyah.aya_no, prevAyah.sura_no);
        } catch (e) {
            console.error('prev ayah failed:', e);
            this._setPlayerState('paused');
        }
    },

    toggleRepeat() {
        this.isRepeat = !this.isRepeat;
        const btn = document.getElementById('repeatBtn');
        if (btn) {
            btn.style.color = this.isRepeat ? 'var(--primary)' : '';
        }
    },

    _setPlayerState(state) {
        const btn = document.getElementById('playPauseBtn');
        if (!btn) return;
        if (state === 'loading') return;
        const playing = state === 'playing';
        this.isPlaying = playing;
        btn.innerHTML = playing ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        btn.removeAttribute('aria-busy');
    },

    _updateBtn(playing) {
        this._setPlayerState(playing ? 'playing' : 'paused');
    },

    async _playAudioUrl(url, startTimeSec = 0, playSession = this._playSession) {
        if (!this._isSessionAlive(playSession)) {
            return Promise.reject(new Error('aborted'));
        }

        let finalUrl = url;
        if (window.Capacitor?.isNativePlatform?.() && 'caches' in window && url.startsWith('http')) {
            try {
                const cacheRes = await caches.match(url, { ignoreSearch: true });
                if (cacheRes) {
                    const blob = await cacheRes.blob();
                    finalUrl = URL.createObjectURL(blob);
                }
            } catch (e) {
                console.warn("Native cache read failed:", e);
            }
        }

        if (!this._isSessionAlive(playSession)) return Promise.reject(new Error('aborted'));

        this._cancelPendingLoad();
        const loadId = ++this._loadId;
        this._cancelRequested = false;
        this._audioFetchActive = true;

        return new Promise((resolve, reject) => {
            const isStale = () => loadId !== this._loadId || !this._isSessionAlive(playSession) || this._cancelRequested;

            const cleanup = () => {
                this._audioFetchActive = false;
                if (this._loadTimeoutId) {
                    clearTimeout(this._loadTimeoutId);
                    this._loadTimeoutId = null;
                }
                this.audio.removeEventListener('canplay', onReady);
                this.audio.removeEventListener('loadeddata', onReady);
                this.audio.removeEventListener('error', onErr);
                if (this._pendingLoadCleanup === cleanup) this._pendingLoadCleanup = null;
            };
            this._pendingLoadCleanup = cleanup;

            let readyHandled = false;
            const onReady = () => {
                if (readyHandled) return;
                readyHandled = true;
                if (isStale()) {
                    cleanup();
                    reject(new Error('aborted'));
                    return;
                }
                cleanup();
                if (startTimeSec > 0) {
                    try {
                        this.audio.currentTime = startTimeSec;
                    } catch (e) { /* ignore seek errors */ }
                }
                this.audio.play().then(() => {
                    if (isStale()) {
                        this.audio.pause();
                        reject(new Error('aborted'));
                        return;
                    }
                    this._setPlayerState('playing');
                    resolve();
                }).catch(err => {
                    if (!isStale()) this._setPlayerState('paused');
                    reject(err);
                });
            };
            const onErr = () => {
                cleanup();
                if (!isStale()) {
                    this._setPlayerState('paused');
                    this._showPlayError();
                }
                reject(new Error('Audio load failed'));
            };

            this._loadTimeoutId = setTimeout(() => {
                cleanup();
                if (!isStale()) {
                    this._setPlayerState('paused');
                    this._showPlayError('انتهت مهلة تحميل الصوت. تحقق من الاتصال.');
                    this._removeHighlight();
                    reject(new Error('Audio load timeout'));
                } else {
                    reject(new Error('aborted'));
                }
            }, 15000);

            this.audio.addEventListener('canplay', onReady, { once: true });
            this.audio.addEventListener('loadeddata', onReady, { once: true });
            this.audio.addEventListener('error', onErr, { once: true });
            this.audio.src = finalUrl;
            this.audio.load();
        });
    },

    _removeHighlight() {
        this.currentlyHighlighted = null;
        document.querySelectorAll('.ayah-container.active').forEach(el => {
            el.classList.remove('active');
        });
    },

    _highlight(no, suraNo = App.currentSurah) {
        this._highlightGroup([no], suraNo);
    },

    _highlightSingle(no, suraNo = App.currentSurah) {
        this._removeHighlight();
        document.querySelectorAll('.ayah-container').forEach(el => {
            const elNo = parseInt(el.dataset.ayah) || parseInt(el.dataset.no);
            const elSurah = parseInt(el.dataset.surah);
            if (elNo === no && elSurah === suraNo) {
                el.classList.add('active');
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    },

    _highlightGroup(ayahNumbers, suraNo = App.currentSurah) {
        this._removeHighlight();
        if (!ayahNumbers || ayahNumbers.length === 0) return;
        const firstNo = ayahNumbers[0];
        document.querySelectorAll('.ayah-container').forEach(el => {
            const elNo = parseInt(el.dataset.ayah) || parseInt(el.dataset.no);
            const elSurah = parseInt(el.dataset.surah);
            if (ayahNumbers.includes(elNo) && elSurah === suraNo) {
                el.classList.add('active');
            }
            if (elNo === firstNo && elSurah === suraNo) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }
};
