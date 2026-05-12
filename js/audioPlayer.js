/**
 * audioPlayer.js - مشغل الصوت الذكي
 * يدير تشغيل الاستعاذة والبسملة والآيات بالترتيب
 * مع حماية من التخطي السريع
 */
const AudioPlayer = {
    audio: null,
    playlist: [],
    currentIndex: -1,
    currentReading: null,
    currentSurahNo: null,
    isRepeating: false,
    isPlaying: false,
    _retryCount: 0,
    _maxRetries: 2,
    _skipLock: false,       // قفل لمنع التخطي المتسارع
    _skipDelay: 800,        // تأخير بين التخطي (مللي ثانية)
    _consecutiveErrors: 0,  // عداد الأخطاء المتتالية
    _maxConsecutiveErrors: 5, // حد أقصى للأخطاء قبل التوقف

    init() {
        this.audio = document.getElementById('quranAudio');
        this.audio.addEventListener('ended', () => this._onTrackEnded());
        this.audio.addEventListener('timeupdate', () => this._onTimeUpdate());
        this.audio.addEventListener('error', () => this._onError());
        this.audio.addEventListener('canplaythrough', () => {
            this._retryCount = 0;
            this._consecutiveErrors = 0;
        });
        this.audio.addEventListener('playing', () => {
            this.isPlaying = true;
            this._consecutiveErrors = 0;
            this._updatePlayButton();
        });
    },

    buildPlaylist(readingKey, surahNo, ayahs) {
        this.playlist = [];
        this.currentReading = readingKey;
        this.currentSurahNo = surahNo;
        this.currentIndex = -1;
        this._consecutiveErrors = 0;
        const config = READINGS_CONFIG[readingKey];

        // الاستعاذة
        this.playlist.push({
            type: 'istiazah',
            src: config.getIstiazahPath(),
            label: 'الاستعاذة',
            surahNo,
            ayahNo: 0
        });

        // البسملة (ما عدا التوبة)
        if (!NO_BASMALAH_SURAHS.includes(surahNo)) {
            this.playlist.push({
                type: 'basmalah',
                src: config.getBasmalahPath(surahNo),
                label: 'البسملة',
                surahNo,
                ayahNo: 0
            });
        }

        // الآيات
        ayahs.forEach(ayah => {
            if (ayah.aya_no === 0) return;
            this.playlist.push({
                type: 'ayah',
                src: config.getAudioPath(ayah.sura_no, ayah.aya_no),
                label: `آية ${ayah.aya_no}`,
                surahNo: ayah.sura_no,
                ayahNo: ayah.aya_no
            });
        });
    },

    /** بناء قائمة تشغيل من نطاق */
    buildPlaylistFromRange(readingKey, ayahs) {
        this.playlist = [];
        this.currentReading = readingKey;
        this.currentIndex = -1;
        this._consecutiveErrors = 0;
        const config = READINGS_CONFIG[readingKey];

        let lastSurah = null;
        ayahs.forEach(ayah => {
            if (ayah.aya_no === 0) return;
            if (ayah.sura_no !== lastSurah) {
                lastSurah = ayah.sura_no;
                if (this.playlist.length === 0) {
                    this.playlist.push({ type: 'istiazah', src: config.getIstiazahPath(), label: 'الاستعاذة', surahNo: ayah.sura_no, ayahNo: 0 });
                }
                if (!NO_BASMALAH_SURAHS.includes(ayah.sura_no) && ayah.aya_no === 1) {
                    this.playlist.push({ type: 'basmalah', src: config.getBasmalahPath(ayah.sura_no), label: 'البسملة', surahNo: ayah.sura_no, ayahNo: 0 });
                }
            }
            this.playlist.push({ type: 'ayah', src: config.getAudioPath(ayah.sura_no, ayah.aya_no), label: `آية ${ayah.aya_no}`, surahNo: ayah.sura_no, ayahNo: ayah.aya_no });
        });
    },

    /** تشغيل آية واحدة فقط مباشرة (من البحث) */
    playSingleAyah(readingKey, surahNo, ayahNo) {
        const config = READINGS_CONFIG[readingKey];
        this.playlist = [{
            type: 'ayah',
            src: config.getAudioPath(surahNo, ayahNo),
            label: `آية ${ayahNo}`,
            surahNo,
            ayahNo
        }];
        this.currentReading = readingKey;
        this.currentIndex = 0;
        this._consecutiveErrors = 0;
        this._playCurrentTrack();
    },

    playAyah(ayahNo) {
        const idx = this.playlist.findIndex(i => i.type === 'ayah' && i.ayahNo === ayahNo);
        if (idx !== -1) {
            this.currentIndex = ayahNo === 1 ? 0 : idx;
            this._playCurrentTrack();
        }
    },

    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            if (this.currentIndex === -1 && this.playlist.length > 0) {
                this.currentIndex = 0;
                this._playCurrentTrack();
            } else {
                this.resume();
            }
        }
    },

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this._updatePlayButton();
    },

    resume() {
        const p = this.audio.play();
        if (p) p.catch(() => {});
        this.isPlaying = true;
        this._updatePlayButton();
    },

    next() {
        if (this.currentIndex < this.playlist.length - 1) {
            this.currentIndex++;
            this._playCurrentTrack();
        }
    },

    prev() {
        let idx = this.currentIndex - 1;
        while (idx >= 0 && this.playlist[idx].type !== 'ayah') idx--;
        if (idx >= 0) {
            this.currentIndex = idx;
            this._playCurrentTrack();
        }
    },

    toggleRepeat() {
        this.isRepeating = !this.isRepeating;
        const btn = document.getElementById('repeatBtn');
        if (btn) btn.style.color = this.isRepeating ? 'var(--primary)' : '';
    },

    seek(value) {
        if (this.audio.duration) this.audio.currentTime = (value / 100) * this.audio.duration;
    },

    // ---- الدوال الداخلية ----

    _playCurrentTrack() {
        if (this.currentIndex < 0 || this.currentIndex >= this.playlist.length) return;
        const track = this.playlist[this.currentIndex];
        this._retryCount = 0;

        this.audio.src = track.src;
        this.audio.load();

        const playPromise = this.audio.play();
        if (playPromise) {
            playPromise.catch(() => {
                if (track.type !== 'ayah') {
                    this._safeSkipToNext();
                }
            });
        }
        this._updateUI(track);
    },

    /** تخطي آمن مع تأخير لمنع التمرير السريع */
    _safeSkipToNext() {
        if (this._skipLock) return;
        this._skipLock = true;

        this._consecutiveErrors++;
        if (this._consecutiveErrors >= this._maxConsecutiveErrors) {
            console.warn('توقف تلقائي: أخطاء متتالية كثيرة');
            this.isPlaying = false;
            this._updatePlayButton();
            this._skipLock = false;
            this._consecutiveErrors = 0;
            return;
        }

        setTimeout(() => {
            this._skipLock = false;
            if (this.currentIndex < this.playlist.length - 1) {
                this.currentIndex++;
                this._playCurrentTrack();
            } else {
                this.isPlaying = false;
                this._updatePlayButton();
            }
        }, this._skipDelay);
    },

    _onTrackEnded() {
        this._consecutiveErrors = 0;
        if (this.isRepeating && this.playlist[this.currentIndex]?.type === 'ayah') {
            this.audio.currentTime = 0;
            const p = this.audio.play();
            if (p) p.catch(() => {});
            return;
        }
        if (this.currentIndex < this.playlist.length - 1) {
            this.currentIndex++;
            this._playCurrentTrack();
        } else {
            this.isPlaying = false;
            this._updatePlayButton();
        }
    },

    _onTimeUpdate() {
        if (!this.audio.duration || isNaN(this.audio.duration)) return;
        const pct = (this.audio.currentTime / this.audio.duration) * 100;
        const seekBar = document.getElementById('audioSeek');
        if (seekBar) {
            seekBar.value = pct;
            seekBar.style.setProperty('--val', pct + '%');
        }
    },

    _onError() {
        const track = this.playlist[this.currentIndex];
        if (!track) return;
        console.warn('خطأ صوت:', track.src);

        this._retryCount++;
        if (this._retryCount <= this._maxRetries && track.type === 'ayah') {
            setTimeout(() => {
                this.audio.load();
                const p = this.audio.play();
                if (p) p.catch(() => this._safeSkipToNext());
            }, 500);
        } else {
            this._safeSkipToNext();
        }
    },

    _updateUI(track) {
        this._updatePlayButton();
        const surahEl = document.getElementById('playingSurahName');
        const ayahEl = document.getElementById('playingAyahNumber');
        if (surahEl) surahEl.textContent = track.label;
        if (ayahEl) ayahEl.textContent = track.ayahNo || '';

        document.querySelectorAll('.ayah-container.active').forEach(el => el.classList.remove('active'));
        if (track.type === 'ayah') {
            const el = document.querySelector(`[data-ayah="${track.ayahNo}"][data-surah="${track.surahNo}"]`);
            if (el) {
                el.classList.add('active');
                const rect = el.getBoundingClientRect();
                const inView = rect.top >= 0 && rect.bottom <= window.innerHeight;
                if (!inView) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    },

    _updatePlayButton() {
        const btn = document.getElementById('playPauseBtn');
        if (!btn) return;
        const icon = btn.querySelector('i');
        if (this.isPlaying) {
            icon.className = 'fas fa-pause';
            btn.classList.add('playing');
        } else {
            icon.className = 'fas fa-play';
            btn.classList.remove('playing');
        }
    }
};
