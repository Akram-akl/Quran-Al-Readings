/**
 * ui.js - واجهة المستخدم
 */
const UI = {
    currentPage: 1,
    totalPages: 604,

    init() {
        console.log("UI Initializing...");
        try {
            this._initSidebar();
            this._initTheme();
            this._initPlayerControls();
            this._initPageNav();
            if (typeof Search !== 'undefined' && Search.init) Search.init();
        } catch (e) {
            console.warn("UI Init partial failure:", e);
        }
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
            document.documentElement.toggleAttribute('data-theme', !isDark);
            btn.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
            localStorage.setItem('quran-theme', isDark ? 'light' : 'dark');
        };
    },

    _initPlayerControls() {
        const map = {
            'playPauseBtn': () => AudioPlayer.togglePlayPause(),
            'nextAyahBtn': () => AudioPlayer.next(),
            'prevAyahBtn': () => AudioPlayer.prev(),
            'repeatBtn': () => AudioPlayer.toggleRepeat(),
            'searchOpenBtn': () => {
                const m = document.getElementById('searchModal');
                if (m) m.classList.add('active');
            }
        };

        for (const [id, fn] of Object.entries(map)) {
            const el = document.getElementById(id);
            if (el) el.onclick = fn;
        }

        document.querySelectorAll('.close-modal').forEach(b => {
            b.onclick = () => {
                const modal = b.closest('.modal');
                if (modal) modal.classList.remove('active');
            };
        });
    },

    _initPageNav() {
        const prev = document.getElementById('prevPageBtn');
        const next = document.getElementById('nextPageBtn');
        const input = document.getElementById('pageInput');

        if (prev) prev.onclick = () => { if (this.currentPage > 1) App.loadPage(this.currentPage - 1); };
        if (next) next.onclick = () => { if (this.currentPage < this.totalPages) App.loadPage(this.currentPage + 1); };
        if (input) input.onchange = (e) => App.loadPage(parseInt(e.target.value));
    },

    populateSurahs(surahs) {
        const sel = document.getElementById('surahSelect');
        if (!sel || !surahs) return;
        sel.innerHTML = surahs.map(s => `<option value="${s.number}">${s.number}. ${s.nameAr}</option>`).join('');
    },

    populateJozzList(jozzList) {
        const sel = document.getElementById('jozzSelect');
        if (!sel || !jozzList) return;
        sel.innerHTML = '<option value="">-- اختر جزءاً --</option>' + 
                        jozzList.map(j => `<option value="${j}">الجزء ${j}</option>`).join('');
    },

    updatePageInfo(page) {
        this.currentPage = page;
        const input = document.getElementById('pageInput');
        if (input) input.value = page;
    },

    renderAyahs(ayahs, readingKey) {
        const area = document.getElementById('readingArea');
        if (!area || !ayahs.length) return;
        
        const config = READINGS_CONFIG[readingKey];
        area.innerHTML = '';

        const textBlock = document.createElement('div');
        textBlock.className = 'quran-text-block';
        textBlock.style.fontFamily = `'${config.fontFamily}', serif`;

        let lastSura = null;

        ayahs.forEach(a => {
            if (a.sura_no !== lastSura) {
                lastSura = a.sura_no;
                const h = document.createElement('div');
                h.className = 'surah-header-inline';
                h.textContent = `سورة ${a.sura_name_ar}`;
                textBlock.appendChild(h);

                if (a.aya_no === 1) {
                    const ist = document.createElement('div');
                    ist.className = 'istiazah';
                    ist.textContent = 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ';
                    ist.onclick = () => AudioPlayer.playIstiazah();
                    textBlock.appendChild(ist);

                    if (!this._isBismillah(a) && a.sura_no !== 9) {
                        const bas = document.createElement('div');
                        bas.className = 'bismillah';
                        bas.textContent = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';
                        bas.onclick = () => AudioPlayer.playBasmalah();
                        textBlock.appendChild(bas);
                    }
                }
            }

            const isB = this._isBismillah(a);
            const span = document.createElement('span');
            span.className = isB ? 'bismillah' : 'ayah-container';
            if (isB) span.style.display = 'block';
            span.setAttribute('data-ayah', a.aya_no);
            span.innerHTML = `<span class="ayah-text" onclick="AudioPlayer.playAyah(${a.aya_no})">${a.aya_text}</span> `;
            textBlock.appendChild(span);
        });

        area.appendChild(textBlock);
        area.scrollTop = 0;
        const title = document.getElementById('currentSurahTitle');
        if (title) title.textContent = `سورة ${ayahs[0].sura_name_ar}`;
    },

    _isBismillah(a) {
        return a.aya_no === 1 && (a.aya_text_emlaey || a.aya_text || '').includes('بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ');
    },

    showLoader() {
        const area = document.getElementById('readingArea');
        if (area) area.innerHTML = '<div class="loader">جاري التحميل...</div>';
    }
};
