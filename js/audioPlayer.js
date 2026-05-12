/**
 * audioPlayer.js - إدارة تشغيل الصوت
 * يضمن عدم تداخل الأصوات والتحكم الكامل في المشغل
 */
const AudioPlayer = {
    audio: new Audio(),
    isPlaying: false,
    currentAyah: null,
    playlist: [],
    currentIndex: 0,
    repeat: false,

    init() {
        this.audio.addEventListener('ended', () => this._handleEnded());
        this.audio.addEventListener('timeupdate', () => this._updateProgress());
        this.audio.addEventListener('play', () => this._updateUIState(true));
        this.audio.addEventListener('pause', () => this._updateUIState(false));
        this.audio.addEventListener('error', (e) => {
            console.error("Audio error:", e);
            this._handleError();
        });
    },

    /**
     * إيقاف أي صوت حالي تماماً قبل البدء بجديد
     */
    stop() {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.audio.src = "";
        this.isPlaying = false;
        this._updateUIState(false);
    },

    playAyah(ayahNo, autoNext = true) {
        this.stop(); // إيقاف أي صوت سابق لمنع التداخل

        const readingKey = App.currentReading;
        const config = READINGS_CONFIG[readingKey];
        const ayahs = DataHandler.cache[readingKey];
        const ayah = ayahs.find(a => a.aya_no === ayahNo && a.sura_no === App.currentSurah);

        if (!ayah) return;

        this.currentAyah = ayah;
        const audioUrl = config.getAudioPath(ayah.sura_no, ayah.aya_no);
        
        console.log(`Playing: Surah ${ayah.sura_no}, Ayah ${ayah.aya_no} from ${audioUrl}`);
        
        this.audio.src = audioUrl;
        this.audio.play().catch(err => {
            console.warn("Autoplay blocked or file missing, trying alternative...", err);
            // إذا فشل الملف المحلي (في EXE) نحاول رابط الويب كاحتياط
            if (audioUrl.startsWith('..')) {
                const webUrl = `https://everyayah.com/data/Alafasy_128kbps/${String(ayah.sura_no).padStart(3,'0')}${String(ayah.aya_no).padStart(3,'0')}.mp3`;
                this.audio.src = webUrl;
                this.audio.play();
            }
        });

        this.isPlaying = true;
        this._highlightAyah(ayahNo);
        this._updateAyahInfo(ayah);
    },

    playIstiazah() {
        this.stop();
        const config = READINGS_CONFIG[App.currentReading];
        this.audio.src = config.getIstiazahPath();
        this.audio.play();
    },

    playBasmalah(surahNo) {
        this.stop();
        const config = READINGS_CONFIG[App.currentReading];
        this.audio.src = config.getBasmalahPath(surahNo);
        this.audio.play();
    },

    togglePlayPause() {
        if (this.audio.src) {
            if (this.isPlaying) this.audio.pause();
            else this.audio.play();
        } else {
            // إذا لم يكن هناك صوت محمل، نبدأ من أول آية في الصفحة
            const firstAyah = document.querySelector('.ayah-container');
            if (firstAyah) this.playAyah(parseInt(firstAyah.dataset.ayah));
        }
    },

    next() {
        const nextAyah = this.currentAyah ? this.currentAyah.aya_no + 1 : 1;
        this.playAyah(nextAyah);
    },

    prev() {
        const prevAyah = this.currentAyah ? Math.max(1, this.currentAyah.aya_no - 1) : 1;
        this.playAyah(prevAyah);
    },

    toggleRepeat() {
        this.repeat = !this.repeat;
        document.getElementById('repeatBtn').classList.toggle('active', this.repeat);
    },

    seek(value) {
        if (this.audio.duration) {
            this.audio.currentTime = (value / 100) * this.audio.duration;
        }
    },

    _handleEnded() {
        if (this.repeat) {
            this.audio.currentTime = 0;
            this.audio.play();
        } else {
            this.next();
        }
    },

    _updateProgress() {
        const progress = document.getElementById('audioSeek');
        if (this.audio.duration) {
            const val = (this.audio.currentTime / this.audio.duration) * 100;
            progress.value = val;
            progress.style.setProperty('--val', val + '%');
        }
    },

    _updateUIState(playing) {
        this.isPlaying = playing;
        const btn = document.getElementById('playPauseBtn');
        btn.innerHTML = playing ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        btn.classList.toggle('playing', playing);
    },

    _highlightAyah(ayahNo) {
        document.querySelectorAll('.ayah-container').forEach(el => {
            el.classList.toggle('active', parseInt(el.dataset.ayah) === ayahNo);
        });
        
        const active = document.querySelector('.ayah-container.active');
        if (active) {
            active.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    },

    _updateAyahInfo(ayah) {
        document.getElementById('currentAyahInfo').textContent = `سورة ${ayah.sura_name_ar} - آية ${ayah.aya_no}`;
    },

    _handleError() {
        this.isPlaying = false;
        this._updateUIState(false);
        // لا نظهر تنبيهات مزعجة، فقط نسجل الخطأ في الكونسول
    }
};
