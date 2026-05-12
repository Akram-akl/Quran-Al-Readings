/**
 * ui.js - النسخة المستقرة (v2.1)
 */
const UI = {
    currentPage: 1,
    totalPages: 604,

    init() {
        console.log("UI Init Start...");
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
        if (btn) {
            btn.onclick = () => {
                const isDark = document.documentElement.hasAttribute('data-theme');
                if (isDark) document.documentElement.removeAttribute('data-theme');
                else document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('quran-theme', isDark ? 'light' : 'dark');
            };
        }
    },

    _initPlayerControls() {
        const ids = {
            'playPauseBtn': () => AudioPlayer.togglePlayPause(),
            'nextAyahBtn': () => AudioPlayer.next(),
            'prevAyahBtn': () => AudioPlayer.prev(),
            'repeatBtn': () => AudioPlayer.toggleRepeat()
        };
        for (const id in ids) {
            const el = document.getElementById(id);
            if (el) el.onclick = ids[id];
        }
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
        if (!sel) return;
        sel.innerHTML = surahs.map(s => `<option value="${s.number}">${s.number}. ${s.nameAr}</option>`).join('');
    },

    populateJozzList(jozz) {
        const sel = document.getElementById('jozzSelect');
        if (!sel) return;
        sel.innerHTML = '<option value="">-- اختر جزءاً --</option>' + jozz.map(j => `<option value="${j}">الجزء ${j}</option>`).join('');
    },

    updatePageInfo(page) {
        this.currentPage = page;
        const input = document.getElementById('pageInput');
        if (input) input.value = page;
    },

    renderAyahs(ayahs, reading) {
        const area = document.getElementById('readingArea');
        if (!area) return;
        area.innerHTML = '';
        const config = READINGS_CONFIG[reading];
        
        const block = document.createElement('div');
        block.className = 'quran-text-block';
        block.style.fontFamily = config.fontFamily;

        let lastS = null;
        ayahs.forEach(a => {
            if (a.sura_no !== lastS) {
                lastS = a.sura_no;
                const h = document.createElement('div');
                h.className = 'surah-header-inline';
                h.textContent = `سورة ${a.sura_name_ar}`;
                block.appendChild(h);
                
                if (a.aya_no === 1) {
                    const ist = document.createElement('div');
                    ist.className = 'istiazah';
                    ist.textContent = 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ';
                    ist.onclick = () => AudioPlayer.playIstiazah();
                    block.appendChild(ist);
                    
                    if (a.sura_no !== 9 && !((a.aya_text_emlaey || a.aya_text).includes('بِسۡمِ ٱللَّهِ'))) {
                        const bas = document.createElement('div');
                        bas.className = 'bismillah';
                        bas.textContent = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';
                        bas.onclick = () => AudioPlayer.playBasmalah();
                        block.appendChild(bas);
                    }
                }
            }
            const span = document.createElement('span');
            span.className = 'ayah-container';
            span.innerHTML = `<span class="ayah-text" onclick="AudioPlayer.playAyah(${a.aya_no})">${a.aya_text}</span> `;
            block.appendChild(span);
        });
        area.appendChild(block);
        document.getElementById('currentSurahTitle').textContent = `سورة ${ayahs[0].sura_name_ar}`;
    },

    showLoader() {
        const area = document.getElementById('readingArea');
        if (area) area.innerHTML = '<div class="loader">جاري التحميل...</div>';
    }
};
