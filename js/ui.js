/**
 * ui.js - واجهة المستخدم
 */
const UI = {
    currentPage: 1,
    totalPages: 604,

    init() {
        this._initSidebar();
        this._initTheme();
        this._initPlayerControls();
        this._initPageNav();
        if (typeof Search !== 'undefined') Search.init();
    },

    _initSidebar() {
        const sidebar = document.getElementById('sidebar');
        const openBtn = document.getElementById('openSidebarBtn');
        const closeBtn = document.getElementById('closeSidebarBtn');

        if (openBtn && sidebar) openBtn.onclick = () => sidebar.classList.add('open');
        if (closeBtn && sidebar) closeBtn.onclick = () => sidebar.classList.remove('open');
    },

    _initTheme() {
        const btn = document.getElementById('themeToggleBtn');
        if (!btn) return;
        
        btn.onclick = () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            if (isDark) {
                document.documentElement.removeAttribute('data-theme');
                btn.innerHTML = '<i class="fas fa-moon"></i>';
                localStorage.setItem('quran-theme', 'light');
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                btn.innerHTML = '<i class="fas fa-sun"></i>';
                localStorage.setItem('quran-theme', 'dark');
            }
        };
    },

    _initPlayerControls() {
        const playBtn = document.getElementById('playPauseBtn');
        const nextBtn = document.getElementById('nextAyahBtn');
        const prevBtn = document.getElementById('prevAyahBtn');
        const repeatBtn = document.getElementById('repeatBtn');
        
        if (playBtn) playBtn.onclick = () => AudioPlayer.togglePlayPause();
        if (nextBtn) nextBtn.onclick = () => AudioPlayer.next();
        if (prevBtn) prevBtn.onclick = () => AudioPlayer.prev();
        if (repeatBtn) repeatBtn.onclick = () => AudioPlayer.toggleRepeat();
        
        document.querySelectorAll('.close-modal').forEach(b => {
            b.onclick = () => {
                const modal = b.closest('.modal');
                if (modal) modal.classList.remove('active');
            };
        });
        
        const searchOpen = document.getElementById('searchOpenBtn');
        if (searchOpen) {
            searchOpen.onclick = () => {
                const modal = document.getElementById('searchModal');
                if (modal) modal.classList.add('active');
            };
        }
    },

    _initPageNav() {
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const pageInput = document.getElementById('pageInput');

        if (prevBtn) {
            prevBtn.onclick = () => {
                if (this.currentPage > 1) App.loadPage(this.currentPage - 1);
            };
        }
        if (nextBtn) {
            nextBtn.onclick = () => {
                if (this.currentPage < this.totalPages) App.loadPage(this.currentPage + 1);
            };
        }
        if (pageInput) {
            pageInput.onchange = (e) => {
                const p = parseInt(e.target.value);
                if (p >= 1 && p <= this.totalPages) App.loadPage(p);
            };
        }
    },

    populateSurahs(surahs) {
        const sel = document.getElementById('surahSelect');
        if (!sel) return;
        sel.innerHTML = '';
        surahs.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.number;
            opt.textContent = `${s.number}. ${s.nameAr}`;
            sel.appendChild(opt);
        });
    },

    populateJozzList(jozzList) {
        const sel = document.getElementById('jozzSelect');
        if (!sel) return;
        sel.innerHTML = '<option value="">-- اختر جزءاً --</option>';
        jozzList.forEach(j => {
            const opt = document.createElement('option');
            opt.value = j;
            opt.textContent = `الجزء ${j}`;
            sel.appendChild(opt);
        });
    },

    updatePageInfo(page, totalPages) {
        this.currentPage = page;
        this.totalPages = totalPages;
        const input = document.getElementById('pageInput');
        if (input) input.value = page;
    },

    _isBismillahAyah(ayah) {
        if (ayah.aya_no !== 1) return false;
        const text = ayah.aya_text_emlaey || ayah.aya_text || '';
        return text.includes('بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ');
    },

    renderAyahs(ayahs, readingKey) {
        const area = document.getElementById('readingArea');
        if (!area) return;
        
        const config = READINGS_CONFIG[readingKey];
        area.innerHTML = '';

        const textBlock = document.createElement('div');
        textBlock.className = 'quran-text-block';
        textBlock.style.fontFamily = `'${config.fontFamily}', serif`;

        let lastSurahNo = null;

        ayahs.forEach(ayah => {
            if (ayah.sura_no !== lastSurahNo) {
                lastSurahNo = ayah.sura_no;
                const header = document.createElement('div');
                header.className = 'surah-header-inline';
                header.textContent = `سورة ${ayah.sura_name_ar}`;
                textBlock.appendChild(header);

                if (ayah.aya_no === 1) {
                    const istiazah = document.createElement('div');
                    istiazah.className = 'istiazah';
                    istiazah.textContent = 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ';
                    istiazah.onclick = () => AudioPlayer.playIstiazah();
                    textBlock.appendChild(istiazah);

                    if (!this._isBismillahAyah(ayah) && !NO_BASMALAH_SURAHS.includes(ayah.sura_no)) {
                        const bismillah = document.createElement('div');
                        bismillah.className = 'bismillah';
                        bismillah.textContent = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';
                        bismillah.onclick = () => AudioPlayer.playBasmalah(ayah.sura_no);
                        textBlock.appendChild(bismillah);
                    }
                }
            }

            const isBismillah = this._isBismillahAyah(ayah);
            const span = document.createElement('span');
            span.className = isBismillah ? 'bismillah' : 'ayah-container';
            if (isBismillah) span.style.display = 'block';

            span.setAttribute('data-ayah', ayah.aya_no);
            span.setAttribute('data-surah', ayah.sura_no);
            span.innerHTML = `<span class="ayah-text" onclick="AudioPlayer.playAyah(${ayah.aya_no})">${ayah.aya_text}</span> `;

            textBlock.appendChild(span);
        });

        area.appendChild(textBlock);
        area.scrollTop = 0;
        const title = document.getElementById('currentSurahTitle');
        if (title) title.textContent = `سورة ${ayahs[0].sura_name_ar}`;
    },

    showLoader() {
        const area = document.getElementById('readingArea');
        if (area) area.innerHTML = '<div class="loader"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</div>';
    }
};
