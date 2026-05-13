/**
 * audioPlayer.js - محرك الصوت الموحد
 */
const AudioPlayer = {
    audio: new Audio(),
    isPlaying: false,
    currentAyah: null,
    isRepeat: false,

    init() {
        this.audio.onended = () => this.next();
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
    },

    playAyah(ayahNo) {
        this.stop();
        const config = READINGS_CONFIG[App.currentReading];
        const ayahs = DataHandler.cache[App.currentReading];
        const ayah = ayahs.find(a => a.aya_no === ayahNo && a.sura_no === App.currentSurah);

        if (!ayah) return;

        this.currentAyah = ayah;
        // تم التعديل لتمرير كائن الآية بالكامل (للحصول على رقم الجزء)
        this.audio.src = config.getAudioPath(ayah);
        
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
