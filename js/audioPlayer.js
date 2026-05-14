/**
 * audioPlayer.js - محرك الصوت الموحد
 */
const AudioPlayer = {
    audio: new Audio(),
    isPlaying: false,
    currentAyah: null,
    isRepeat: false,

    audioQueue: [],
    
    init() {
        this.audio.onended = () => {
            if (this.audioQueue.length > 0) {
                // Play next mapped audio file for the SAME ayah
                this.audio.src = this.audioQueue.shift();
                this.audio.play();
            } else {
                // Done with all audio files for this ayah, move to next
                this.next();
            }
        };
        this.audio.ontimeupdate = () => {
            const seek = document.getElementById('audioSeek');
            if (this.audio.duration && seek) {
                seek.value = (this.audio.currentTime / this.audio.duration) * 100;
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

    playAyah(ayahNo) {
        this.stop();
        const config = READINGS_CONFIG[App.currentReading];
        const ayahs = DataHandler.cache[App.currentReading];
        const ayah = ayahs.find(a => a.aya_no === ayahNo && a.sura_no === App.currentSurah);

        if (!ayah) return;

        this.currentAyah = ayah;
        
        // 1. Check if mapping exists
        let mappedHafsAyahs = [ayahNo]; // Fallback (1:1)
        if (typeof AUDIO_MAP !== 'undefined') {
            const readingKey = App.currentReading.toLowerCase(); 
            if (AUDIO_MAP[readingKey]) {
                const suraMap = AUDIO_MAP[readingKey][App.currentSurah];
                if (suraMap && suraMap[ayahNo]) {
                    mappedHafsAyahs = suraMap[ayahNo];
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
        this._highlight(ayahNo);
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
        if (this.audio.src) {
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
            this.playAyah(this.currentAyah.aya_no + 1);
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
        document.querySelectorAll('.ayah-container').forEach(el => {
            el.classList.toggle('active', parseInt(el.dataset.ayah) === no);
        });
        const active = document.querySelector('.ayah-container.active');
        if (active) active.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
};
