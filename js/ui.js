/**
 * ui.js - إدارة واجهة المستخدم
 * تم تحديث المنطق لضمان مزامنة القوائم والتنقل الصحيح
 */
const UI = {
    currentPage: 1,
    totalPages: 604,

    init() {
        this._initSidebar();
        this._initTheme();
        this._initPlayerControls();
        this._initPageNav();
        Search.init();
    },

    _initSidebar() {
        const sidebar = document.getElementById('sidebar');
        const openBtn = document.getElementById('openSidebarBtn');
        const closeBtn = document.getElementById('closeSidebarBtn');

        openBtn.addEventListener('click', () => sidebar.classList.add('open'));
        closeBtn.addEventListener('click', () => sidebar.classList.remove('open'));

        document.querySelector('.main-content').addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && !sidebar.contains(e.target) && e.target !== openBtn) {
                sidebar.classList.remove('open');
            }
        });
    },

    _initTheme() {
        const btn = document.getElementById('themeToggleBtn');
        const saved = localStorage.getItem('quran-theme');
        if (saved === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            btn.querySelector('i').className = 'fas fa-sun';
        }
        btn.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            if (isDark) {
                document.documentElement.removeAttribute('data-theme');
                btn.querySelector('i').className = 'fas fa-moon';
                localStorage.setItem('quran-theme', 'light');
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                btn.querySelector('i').className = 'fas fa-sun';
                localStorage.setItem('quran-theme', 'dark');
            }
        });
    },

    _initPlayerControls() {
        document.getElementById('playPauseBtn').addEventListener('click', () => AudioPlayer.togglePlayPause());
        document.getElementById('nextAyahBtn').addEventListener('click', () => AudioPlayer.next());
        document.getElementById('prevAyahBtn').addEventListener('click', () => AudioPlayer.prev());
        document.getElementById('repeatBtn').addEventListener('click', () => AudioPlayer.toggleRepeat());
        document.getElementById('audioSeek').addEventListener('input', (e) => AudioPlayer.seek(e.target.value));
        
        // إغلاق المودالات عند الضغط خارجها
        window.onclick = (event) => {
            if (event.target.classList.contains('modal')) {
                event.target.classList.remove('active');
            }
        };
    },

    _initPageNav() {
        document.getElementById('prevPageBtn').addEventListener('click', () => {
            if (this.currentPage > 1) App.loadPage(this.currentPage - 1);
        });
        document.getElementById('nextPageBtn').addEventListener('click', () => {
            if (this.currentPage < this.totalPages) App.loadPage(this.currentPage + 1);
        });
        document.getElementById('pageInput').addEventListener('change', (e) => {
            const p = parseInt(e.target.value);
            if (p >= 1 && p <= this.totalPages) App.loadPage(p);
        });
    },

    populateSurahs(surahs) {
        const sel = document.getElementById('surahSelect');
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
        document.getElementById('pageInput').value = page;
        document.getElementById('totalPages').textContent = totalPages;
        
        // تحديث الجزء تلقائياً
        const jozz = PAGE_TO_JOZZ[page];
        if (jozz) document.getElementById('jozzSelect').value = jozz;
    },

    _isBismillahInData(readingKey) {
        const data = DataHandler.cache[readingKey];
        if (!data) return false;
        const fatihah1 = data.find(a => a.sura_no === 1 && a.aya_no === 1);
        return fatihah1 && (fatihah1.aya_text_emlaey || fatihah1.aya_text || '').includes('بسم');
    },

    renderAyahs(ayahs, readingKey, surahNo) {
        const area = document.getElementById('readingArea');
        const config = READINGS_CONFIG[readingKey];
        area.innerHTML = '';

        const textBlock = document.createElement('div');
        textBlock.className = 'quran-text-block';
        textBlock.style.fontFamily = `'${config.fontFamily}', serif`;

        const bismillahInData = this._isBismillahInData(readingKey);
        let lastSurahNo = null;
        let isFirstSurahInPage = true;

        ayahs.forEach(ayah => {
            if (ayah.sura_no !== lastSurahNo) {
                lastSurahNo = ayah.sura_no;

                const surahHeader = document.createElement('div');
                surahHeader.className = 'surah-header-inline';
                surahHeader.textContent = `سورة ${ayah.sura_name_ar}`;
                textBlock.appendChild(surahHeader);

                // الاستعاذة: فقط في أول سورة في الصفحة إذا كانت صفحة 1 أو بداية سورة
                if (isFirstSurahInPage && ayah.aya_no === 1) {
                    const istiazah = document.createElement('div');
                    istiazah.className = 'istiazah';
                    istiazah.style.cursor = 'pointer';
                    istiazah.textContent = 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ';
                    istiazah.onclick = () => AudioPlayer.playIstiazah();
                    textBlock.appendChild(istiazah);
                }

                // البسملة
                if (ayah.aya_no === 1 && !NO_BASMALAH_SURAHS.includes(ayah.sura_no)) {
                    if (!bismillahInData || ayah.sura_no !== 1) {
                        const bismillah = document.createElement('div');
                        bismillah.className = 'bismillah';
                        bismillah.style.cursor = 'pointer';
                        bismillah.textContent = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';
                        bismillah.onclick = () => AudioPlayer.playBasmalah(ayah.sura_no);
                        textBlock.appendChild(bismillah);
                    }
                }
                isFirstSurahInPage = false;
            }

            const isBismillahAyah = bismillahInData && ayah.sura_no === 1 && ayah.aya_no === 1;
            const span = document.createElement('span');
            span.className = isBismillahAyah ? 'bismillah' : 'ayah-container';
            if (isBismillahAyah) span.style.display = 'block';

            span.setAttribute('data-ayah', ayah.aya_no);
            span.setAttribute('data-surah', ayah.sura_no);

            const textSpan = document.createElement('span');
            textSpan.className = 'ayah-text';
            textSpan.textContent = ayah.aya_text + ' ';
            textSpan.onclick = () => AudioPlayer.playAyah(ayah.aya_no);

            span.appendChild(textSpan);
            textBlock.appendChild(span);
        });

        area.appendChild(textBlock);
        area.scrollTop = 0;
        document.getElementById('currentSurahTitle').textContent = `سورة ${ayahs[0].sura_name_ar}`;
    },

    showLoader() {
        document.getElementById('readingArea').innerHTML = '<div class="loader"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</div>';
    }
};
