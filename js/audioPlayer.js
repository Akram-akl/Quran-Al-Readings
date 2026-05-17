/**
 * audioPlayer.js - محرك الصوت الموحد للتشغيل المدمج والمتتابع
 */
const AudioPlayer = {
    audio: new Audio(),
    isPlaying: false,
    currentAyah: null,
    isRepeat: false,
    currentlyHighlighted: null,
    groupedThresholds: [],

    audioQueue: [],
    groupedAyahs: [], // الآيات المجمعة التي تتشارك نفس الملف الصوتي
    
    playlist: [],          // قائمة الآيات المجدولة للاستماع المتتابع
    playlistIndex: -1,     // الفهرس الحالي بقائمة الاستماع
    playlistReadingKey: "",// رواية قائمة الاستماع
    
    init() {
        // ربط حدث انتهاء الصوت
        this.audio.onended = () => {
            const config = READINGS_CONFIG[App.currentReading];
            
            // تحقق من وجود قائمة استماع نشطة
            if (this.playlist && this.playlist.length > 0 && this.playlistIndex >= 0) {
                if (config.isMonolithic) {
                    // في التشغيل المدمج، يتم الانتقال بواسطة توقيت المزامنة بداخل ontimeupdate
                    // لذا لا داعي لفعل شيء هنا إلا إذا انتهى السرفر من الملف بالكامل بالخطأ
                    this.playlistIndex++;
                    this._playCurrentTrack();
                } else {
                    if (this.audioQueue.length > 0) {
                        this.audio.src = this.audioQueue.shift();
                        this.audio.play();
                    } else {
                        // الانتقال للآية التالية في قائمة الاستماع
                        this.playlistIndex++;
                        this._playCurrentTrack();
                    }
                }
            } else {
                // التشغيل العادي الفردي للآيات
                if (config.isMonolithic) {
                    this.stop();
                    this._updateBtn(false);
                } else {
                    if (this.audioQueue.length > 0) {
                        this.audio.src = this.audioQueue.shift();
                        this.audio.play();
                    } else {
                        this.next();
                    }
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
                        this.currentAyah = DataHandler.cache[App.currentReading].find(a => a.aya_no === activeAyaNo && a.sura_no === App.currentSurah);
                        this._highlightSingle(activeAyaNo);
                    }
                    
                    // منطق التكرار التلقائي للآية في قائمة الاستماع
                    if (this.playlist && this.playlist.length > 0 && this.playlistIndex >= 0) {
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
                            this.playlistIndex++;
                            this._playCurrentTrack();
                        }
                    }
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
                        this._highlightSingle(activeAya);
                    }
                }
            }
        };

        this.audio.onplay = () => this._updateBtn(true);
        this.audio.onpause = () => this._updateBtn(false);

        const repeatBtn = document.getElementById('repeatBtn');
        if (repeatBtn) repeatBtn.onclick = () => this.toggleRepeat();
    },

    stop() {
        this.audio.pause();
        this.audio.src = "";
        this.audioQueue = []; // مسح قائمة الملفات الصوتية عند الإيقاف
    },

    buildPlaylistFromRange(readingKey, ayahs) {
        this.stop();
        this.playlist = ayahs;
        this.playlistIndex = 0;
        this.playlistReadingKey = readingKey;
    },

    async _playCurrentTrack() {
        if (!this.playlist || this.playlist.length === 0 || this.playlistIndex < 0) {
            this.stop();
            return;
        }
        if (this.playlistIndex >= this.playlist.length) {
            console.log("Playlist finished!");
            this.stop();
            const statusEl = document.getElementById('lsStatus');
            if (statusEl) statusEl.textContent = '✅ انتهى تشغيل قائمة الاستماع';
            return;
        }

        const track = this.playlist[this.playlistIndex];
        const targetPage = track.page;
        
        // تحديث الرواية النشطة لتطابق الرواية المطلوبة بالاستماع
        if (this.playlistReadingKey && App.currentReading !== this.playlistReadingKey) {
            App.currentReading = this.playlistReadingKey;
            const rSel = document.getElementById('readingSelect');
            if (rSel) rSel.value = this.playlistReadingKey;
        }

        // إذا كانت الآية تقع في صفحة مختلفة، نقوم بالانتقال للصفحة أولاً
        if (App.currentPage !== targetPage) {
            UI.showLoader();
            await App.loadPage(targetPage, true);
        }

        // تشغيل الآية المطلوبة بداخل قائمة الاستماع دون مسح القائمة
        await this._playPlaylistAyah(track.aya_no, track.sura_no);
    },

    async _playPlaylistAyah(ayahNo, suraNo) {
        const config = READINGS_CONFIG[App.currentReading];
        const ayahs = DataHandler.cache[App.currentReading];
        const ayah = ayahs.find(a => a.aya_no === ayahNo && a.sura_no === suraNo);

        if (!ayah) return;

        this.currentAyah = ayah;
        App.currentSurah = suraNo;
        
        const title = document.getElementById('currentSurahTitle');
        if (title) title.textContent = `سورة ${ayah.sura_name_ar}`;
        const sSel = document.getElementById('surahSelect');
        if (sSel) sSel.value = suraNo;

        // --- تشغيل مدمج بداخل قائمة الاستماع ---
        if (config.isMonolithic) {
            this.groupedAyahs = [ayahNo];
            
            const timingUrl = config.getTimingPath(suraNo);
            if (this.currentTimingSurah !== suraNo) {
                try {
                    const res = await fetch(timingUrl);
                    this.currentTimingData = await res.json();
                    this.currentTimingSurah = suraNo;
                } catch (e) {
                    console.error("Failed to load timing data:", e);
                    return;
                }
            }

            const ayahTiming = this.currentTimingData.find(t => t.ayah === ayahNo);
            if (!ayahTiming) {
                console.log("Ayah timing not found for target:", ayahNo);
                return;
            }

            const audioUrl = config.getAudioPath(suraNo);
            if (!this.audio.src.endsWith(audioUrl)) {
                this.audio.src = audioUrl;
            }

            const seekAndPlay = () => {
                this.audio.currentTime = Math.max(0, (ayahTiming.start_time / 1000) + (config.timeOffset || 0));
                this.audio.play();
            };

            if (this.audio.readyState >= 1) {
                seekAndPlay();
            } else {
                this.audio.addEventListener('loadedmetadata', seekAndPlay, { once: true });
            }

            this.currentlyHighlighted = ayahNo;
            this._highlightSingle(ayahNo);
            return;
        }

        // --- تشغيل عادي بداخل قائمة الاستماع ---
        let mappedHafsAyahs = [ayahNo];
        this.groupedAyahs = [ayahNo];

        if (typeof AUDIO_MAP !== 'undefined') {
            const readingKey = App.currentReading.toLowerCase(); 
            if (AUDIO_MAP[readingKey]) {
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

        this.audio.src = this.audioQueue.shift();
        this.audio.play();

        if (this.groupedAyahs.length > 1) {
            this.currentlyHighlighted = this.groupedAyahs[0];
            this._highlightSingle(this.groupedAyahs[0]);
        } else {
            this.currentlyHighlighted = ayahNo;
            this._highlightGroup(this.groupedAyahs);
        }
    },

    async playAyah(ayahNo) {
        // مسح وتصفير قائمة الاستماع عند الضغط الفردي المباشر على الآية
        this.playlist = [];
        this.playlistIndex = -1;
        this.playlistReadingKey = "";

        this.stop();
        const config = READINGS_CONFIG[App.currentReading];
        const ayahs = DataHandler.cache[App.currentReading];
        const ayah = ayahs.find(a => a.aya_no === ayahNo && a.sura_no === App.currentSurah);

        if (!ayah) return;

        this.currentAyah = ayah;
        
        // --- الهيكل الهجين: نظام السورة المدمجة (Monolithic) ---
        if (config.isMonolithic) {
            this.groupedAyahs = [ayahNo];
            
            const timingUrl = config.getTimingPath(App.currentSurah);
            if (this.currentTimingSurah !== App.currentSurah) {
                try {
                    const res = await fetch(timingUrl);
                    this.currentTimingData = await res.json();
                    this.currentTimingSurah = App.currentSurah;
                } catch (e) {
                    console.error("Failed to load timing data:", e);
                    return;
                }
            }

            const ayahTiming = this.currentTimingData.find(t => t.ayah === ayahNo);
            
            if (!ayahTiming) {
                console.log("Ayah timing not found for target:", ayahNo);
                return;
            }

            const audioUrl = config.getAudioPath(App.currentSurah);
            if (!this.audio.src.endsWith(audioUrl)) {
                this.audio.src = audioUrl;
            }

            // منع تشغيل الآيات المخفية في وضع الاختبار
            if (typeof App !== 'undefined' && App.TestingMode && App.TestingMode.isActive) {
                const el = document.querySelector(`.ayah-container[data-no="${ayahNo}"]`);
                if (el && el.classList.contains('hidden-ayah')) {
                    this._updateBtn(false);
                    return;
                }
            }

            // الحل السحري لتأخير الـ Seek لحين جاهزية المتصفح loadedmetadata
            const seekAndPlay = () => {
                this.audio.currentTime = Math.max(0, (ayahTiming.start_time / 1000) + (config.timeOffset || 0));
                this.audio.play();
            };

            if (this.audio.readyState >= 1) {
                seekAndPlay();
            } else {
                this.audio.addEventListener('loadedmetadata', seekAndPlay, { once: true });
            }

            this.currentlyHighlighted = ayahNo;
            this._highlightSingle(ayahNo);
            return;
        }
        // --- نهاية النظام المدمج ---

        // 1. Check if mapping exists
        let mappedHafsAyahs = [ayahNo]; // Fallback (1:1)
        this.groupedAyahs = [ayahNo]; // Default to single ayah
        
        if (typeof AUDIO_MAP !== 'undefined') {
            const readingKey = App.currentReading.toLowerCase(); 
            if (AUDIO_MAP[readingKey]) {
                const suraMap = AUDIO_MAP[readingKey][App.currentSurah];
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
                            const aObj = ayahs.find(a => a.aya_no === aya && a.sura_no === App.currentSurah);
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
                sura_no: ayah.sura_no,
                aya_no: hafsAyaNo,
                jozz: ayah.jozz
            });
        });

        // 3. Play the first file in queue
        this.audio.src = this.audioQueue.shift();
        
        // منع تشغيل الآيات المخفية في وضع الاختبار
        if (typeof App !== 'undefined' && App.TestingMode && App.TestingMode.isActive) {
            const el = document.querySelector(`.ayah-container[data-no="${ayahNo}"]`);
            if (el && el.classList.contains('hidden-ayah')) {
                this._updateBtn(false);
                return;
            }
        }

        this.audio.play();
        
        if (this.groupedAyahs.length > 1) {
            this.currentlyHighlighted = this.groupedAyahs[0];
            this._highlightSingle(this.groupedAyahs[0]);
        } else {
            this.currentlyHighlighted = ayahNo;
            this._highlightGroup(this.groupedAyahs);
        }
    },

    playIstiazah() {
        this.stop();
        this.audio.src = READINGS_CONFIG[App.currentReading].getIstiazahPath();
        this.audio.play();
    },

    playBasmalah() {
        this.stop();
        this.audio.src = READINGS_CONFIG[App.currentReading].getBasmalahPath();
        this.audio.play();
    },

    togglePlayPause() {
        if (this.audio.src && this.audio.src !== window.location.href) {
            if (this.audio.paused) this.audio.play();
            else this.audio.pause();
        } else {
            this.playAyah(1);
        }
    },

    next() {
        if (!this.currentAyah) return;
        if (this.isRepeat) {
            this.playAyah(this.currentAyah.aya_no);
        } else {
            const maxAyahInGroup = Math.max(...this.groupedAyahs);
            this.playAyah(maxAyahInGroup + 1);
        }
    },

    prev() {
        if (this.currentAyah) this.playAyah(Math.max(1, this.currentAyah.aya_no - 1));
    },

    toggleRepeat() {
        this.isRepeat = !this.isRepeat;
        const btn = document.getElementById('repeatBtn');
        if (btn) {
            btn.style.color = this.isRepeat ? 'var(--primary)' : '';
        }
    },

    _updateBtn(playing) {
        const btn = document.getElementById('playPauseBtn');
        if (btn) btn.innerHTML = playing ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    },

    _highlight(no) {
        this._highlightGroup([no]);
    },

    _highlightSingle(no) {
        document.querySelectorAll('.ayah-container').forEach(el => {
            const elNo = parseInt(el.dataset.ayah) || parseInt(el.dataset.no);
            el.classList.toggle('active', elNo === no);
        });
        const active = document.querySelector('.ayah-container.active');
        if (active) active.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    _highlightGroup(ayahNumbers) {
        document.querySelectorAll('.ayah-container').forEach(el => {
            const elNo = parseInt(el.dataset.ayah) || parseInt(el.dataset.no);
            el.classList.toggle('active', ayahNumbers.includes(elNo));
        });
        const active = document.querySelector('.ayah-container.active');
        if (active) active.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
};
