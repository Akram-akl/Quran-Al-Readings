/**
 * audioPlayer.js - محرك الصوت الموحد
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
    
    init() {
        this.audio.onended = () => {
            const config = READINGS_CONFIG[App.currentReading];
            if (config.isMonolithic) {
                this.stop();
                this._updateBtn(false);
            } else {
                if (this.audioQueue.length > 0) {
                    // Play next mapped audio file for the SAME ayah
                    this.audio.src = this.audioQueue.shift();
                    this.audio.play();
                } else {
                    // Done with all audio files for this ayah group, move to next
                    this.next();
                }
            }
        };
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
                    const activeAyaNo = activeAyaData.ayah + (config.ayahOffset || 0);
                    if (this.currentlyHighlighted !== activeAyaNo) {
                        this.currentlyHighlighted = activeAyaNo;
                        this.currentAyah = DataHandler.cache[App.currentReading].find(a => a.aya_no === activeAyaNo && a.sura_no === App.currentSurah);
                        this._highlightSingle(activeAyaNo);
                    }
                    
                    // منطق التكرار
                    if (this.isRepeat && cTime >= activeAyaData.end_time - 150) {
                        this.audio.currentTime = activeAyaData.start_time / 1000;
                    }
                } else if (this.currentTimingData.length > 0) {
                    // إذا تخطينا نهاية آخر آية، نوقف المشغل إذا لم يكن هناك تكرار للسورة
                    const lastAya = this.currentTimingData[this.currentTimingData.length - 1];
                    if (cTime >= lastAya.end_time && !this.isRepeat) {
                        // لا ننتقل آلياً للسورة التالية في هذا الإصدار لتجنب تحميل الواجهة
                    }
                }
            } else {
                // التظليل النسبي الذكي للآيات المدمجة (النظام القديم)
                if (this.groupedAyahs && this.groupedAyahs.length > 1 && this.audio.duration) {
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
    },

    stop() {
        this.audio.pause();
        this.audio.src = "";
        this.audioQueue = []; // Clear queue on stop
    },

    async playAyah(ayahNo) {
        this.stop();
        const config = READINGS_CONFIG[App.currentReading];
        const ayahs = DataHandler.cache[App.currentReading];
        const ayah = ayahs.find(a => a.aya_no === ayahNo && a.sura_no === App.currentSurah);

        if (!ayah) return;

        this.currentAyah = ayah;
        
        // --- الهيكل الهجين: نظام السورة المدمجة (Monolithic) ---
        if (config.isMonolithic) {
            this.groupedAyahs = [ayahNo];
            
            // 1. جلب ملف التوقيت إذا لم يكن محملاً للسورة الحالية
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

            // 2. إيجاد بيانات الآية الحالية من ملف التوقيت (مع مراعاة الإزاحة إذا وجدت)
            const offset = config.ayahOffset || 0;
            const targetAyah = Math.max(1, ayahNo - offset);
            const ayahTiming = this.currentTimingData.find(t => t.ayah === targetAyah);
            
            if (!ayahTiming) {
                console.log("Ayah timing not found for target:", targetAyah);
                return;
            }

            // 3. تجهيز الملف الصوتي المدمج
            const audioUrl = config.getAudioPath(App.currentSurah);
            if (!this.audio.src.endsWith(audioUrl)) { // تجنب إعادة تحميل نفس الملف
                this.audio.src = audioUrl;
            }

            // منع تشغيل الآيات المخفية في وضع الاختبار
            if (typeof TestingMode !== 'undefined' && TestingMode.isActive) {
                const el = document.querySelector(`.ayah-container[data-no="${ayahNo}"]`);
                if (el && el.classList.contains('hidden-ayah')) {
                    this._updateBtn(false);
                    return;
                }
            }

            // 4. تعيين وقت البداية وتشغيل الصوت
            this.audio.currentTime = ayahTiming.start_time / 1000;
            this.audio.play();
            
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
                    
                    // البحث عن كل الآيات التي تشترك في نفس ملفات حفص (لمنع التكرار)
                    const sharedAyahs = [];
                    const mappedStr = JSON.stringify(mappedHafsAyahs);
                    for (const [wAya, hAyas] of Object.entries(suraMap)) {
                        if (JSON.stringify(hAyas) === mappedStr) {
                            sharedAyahs.push(parseInt(wAya));
                        }
                    }
                    if (sharedAyahs.length > 0) {
                        this.groupedAyahs = sharedAyahs.sort((a, b) => a - b);
                        
                        // حساب النسب المئوية لطول النص لتظليل دقيق بالتناسب مع الزمن
                        let totalChars = 0;
                        const ayahLengths = [];
                        for (const aya of this.groupedAyahs) {
                            const aObj = ayahs.find(a => a.aya_no === aya && a.sura_no === App.currentSurah);
                            // حساب الحروف الصافية بدون تشكيل لضمان دقة النسبة
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
            // Create a dummy ayah object for config.getAudioPath which expects {sura_no, aya_no, jozz}
            return config.getAudioPath({
                sura_no: ayah.sura_no,
                aya_no: hafsAyaNo,
                jozz: ayah.jozz // Assuming Jozz stays roughly same for path generation
            });
        });

        // 3. Play the first file in queue
        this.audio.src = this.audioQueue.shift();
        
        // منع تشغيل الآيات المخفية في وضع الاختبار
        if (typeof TestingMode !== 'undefined' && TestingMode.isActive) {
            const el = document.querySelector(`.ayah-container[data-no="${ayahNo}"]`);
            if (el && el.classList.contains('hidden-ayah')) {
                this._updateBtn(false);
                return; // لا تقم بتشغيل الصوت إذا كانت مخفية
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
            // القفز بعد كل الآيات المجمعة لتجنب تكرار الصوت
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
