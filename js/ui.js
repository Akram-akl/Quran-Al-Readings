/**
 * ui.js - تحسين التباعد ودقة الآيات
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
        // استرجاع الإعداد من المتصفح
        if (localStorage.getItem('theme') === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            if (btn) btn.innerHTML = '<i class="fas fa-sun"></i>';
        }
        if (btn) btn.onclick = () => {
            const isDark = document.documentElement.hasAttribute('data-theme');
            if (isDark) {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                btn.innerHTML = '<i class="fas fa-moon"></i>';
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                btn.innerHTML = '<i class="fas fa-sun"></i>';
            }
        };
    },

    _initPlayerControls() {
        const playBtn = document.getElementById('playPauseBtn');
        if (playBtn) playBtn.onclick = () => AudioPlayer.togglePlayPause();
        const nextBtn = document.getElementById('nextAyahBtn');
        if (nextBtn) nextBtn.onclick = () => AudioPlayer.next();
        const prevBtn = document.getElementById('prevAyahBtn');
        if (prevBtn) prevBtn.onclick = () => AudioPlayer.prev();
        
        const searchOpen = document.getElementById('searchOpenBtn');
        if (searchOpen) searchOpen.onclick = () => document.getElementById('searchModal').classList.add('active');
        
        document.querySelectorAll('.close-modal').forEach(b => {
            b.onclick = () => b.closest('.modal').classList.remove('active');
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
        if (sel) sel.innerHTML = surahs.map(s => `<option value="${s.number}">${s.number}. ${s.nameAr}</option>`).join('');
    },

    populateJozzList(jozz) {
        const sel = document.getElementById('jozzSelect');
        if (sel) sel.innerHTML = '<option value="">-- اختر جزءاً --</option>' + jozz.map(j => `<option value="${j}">الجزء ${j}</option>`).join('');
    },

    updatePageInfo(page) {
        this.currentPage = page;
        const input = document.getElementById('pageInput');
        if (input) input.value = page;
    },

    renderAyahs(ayahs, reading) {
        const area = document.getElementById('readingArea');
        if (!area || !ayahs.length) return;
        
        area.innerHTML = '';
        const config = READINGS_CONFIG[reading];
        const block = document.createElement('div');
        block.className = 'quran-text-block';
        block.style.fontFamily = config.fontFamily;

        let lastS = null;

        // فرز الآيات لضمان الترتيب الصحيح حسب aya_no
        const sortedAyahs = ayahs.sort((a, b) => a.aya_no - b.aya_no);

        sortedAyahs.forEach(a => {
            if (a.sura_no !== lastS) {
                lastS = a.sura_no;
                const h = document.createElement('div');
                h.className = 'surah-header-inline';
                h.textContent = `سورة ${a.sura_name_ar}`;
                block.appendChild(h);
                
                // الاستعاذة والبسملة قبل الآية الأولى
                if (a.aya_no === 1) {
                    const ist = document.createElement('div');
                    ist.className = 'istiazah';
                    ist.textContent = 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ';
                    ist.onclick = () => AudioPlayer.playIstiazah();
                    block.appendChild(ist);
                    
                    if (a.sura_no !== 9 && !this._isBismillah(a)) {
                        const bas = document.createElement('div');
                        bas.className = 'bismillah';
                        bas.textContent = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';
                        bas.onclick = () => AudioPlayer.playBasmalah();
                        block.appendChild(bas);
                    }
                }
            }

            const isB = this._isBismillah(a);
            const span = document.createElement('span');
            span.className = isB ? 'bismillah' : 'ayah-container';
            // إزالة display: block للبسملة إذا كانت جزء من الآيات لتقليل الفراغات
            if (isB && a.sura_no !== 1) span.style.display = 'block'; 

            span.setAttribute('data-ayah', a.aya_no);
            span.setAttribute('data-no', a.aya_no);
            span.setAttribute('data-surah', a.sura_no);
            
            // تطبيق وضع الاختبار
            if (typeof App !== 'undefined' && App.TestingMode && App.TestingMode.isActive && !isB) {
                span.classList.add('hidden-ayah');
                span.innerHTML = `<span class="ayah-text" style="filter: blur(7px); user-select: none; cursor: pointer;" onclick="this.parentElement.classList.remove('hidden-ayah'); this.style.filter='none'; AudioPlayer.playAyah(${a.aya_no});">${a.aya_text}</span> `;
            } else {
                span.innerHTML = `<span class="ayah-text" onclick="AudioPlayer.playAyah(${a.aya_no})">${a.aya_text}</span> `;
            }
            block.appendChild(span);
        });

        area.appendChild(block);
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
