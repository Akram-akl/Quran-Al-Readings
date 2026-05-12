/**
 * ui.js - إدارة واجهة المستخدم
 * عرض صفحات القرآن حسب الرواية
 */
const UI = {
    currentPage: 1,
    totalPages: 604,

    init() {
        this._initSidebar();
        this._initTheme();
        this._initPlayerControls();
        this._initPageNav();
    },

    _initSidebar() {
        const sidebar = document.getElementById('sidebar');
        const openBtn = document.getElementById('openSidebarBtn');
        const closeBtn = document.getElementById('closeSidebarBtn');

        openBtn.addEventListener('click', () => sidebar.classList.add('open'));
        closeBtn.addEventListener('click', () => sidebar.classList.remove('open'));

        document.querySelector('.main-content').addEventListener('click', () => {
            if (window.innerWidth <= 768) sidebar.classList.remove('open');
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
        document.getElementById('pageInput').max = totalPages;
        document.getElementById('totalPages').textContent = totalPages;
    },

    /**
     * عرض آيات صفحة كاملة
     * ملاحظات:
     * - أرقام الآيات موجودة في aya_text، لا نضيفها
     * - الفاتحة: الآية 1 هي البسملة (لا نضيف بسملة منفصلة)
     * - باقي السور: نضيف البسملة قبل أول آية
     * - لا نحذف أي آية أبداً
     */
    renderAyahs(ayahs, readingKey, surahNo) {
        const area = document.getElementById('readingArea');
        const config = READINGS_CONFIG[readingKey];
        area.innerHTML = '';

        if (!ayahs || ayahs.length === 0) {
            area.innerHTML = '<div class="loader">لا توجد آيات</div>';
            return;
        }

        const textBlock = document.createElement('div');
        textBlock.className = 'quran-text-block';
        textBlock.style.fontFamily = `'${config.fontFamily}', serif`;

        // تتبع السورة الحالية لإضافة العناوين والبسملة
        let lastSurahNo = null;

        ayahs.forEach(ayah => {
            // عند بداية سورة جديدة في الصفحة
            if (ayah.sura_no !== lastSurahNo) {
                lastSurahNo = ayah.sura_no;

                // عنوان السورة
                const surahHeader = document.createElement('div');
                surahHeader.className = 'surah-header-inline';
                surahHeader.textContent = `سورة ${ayah.sura_name_ar}`;
                textBlock.appendChild(surahHeader);

                // الاستعاذة قبل أول آية فقط إذا كانت الآية الأولى
                if (ayah.aya_no === 1) {
                    const istiazah = document.createElement('div');
                    istiazah.className = 'istiazah';
                    istiazah.textContent = 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ';
                    textBlock.appendChild(istiazah);

                    // البسملة لغير الفاتحة وغير التوبة
                    if (ayah.sura_no !== 1 && !NO_BASMALAH_SURAHS.includes(ayah.sura_no)) {
                        const bismillah = document.createElement('div');
                        bismillah.className = 'bismillah';
                        bismillah.textContent = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';
                        textBlock.appendChild(bismillah);
                    }
                }
            }

            // عرض الآية - جميع الآيات بدون استثناء
            const span = document.createElement('span');
            span.className = 'ayah-container';
            span.setAttribute('data-ayah', ayah.aya_no);
            span.setAttribute('data-surah', ayah.sura_no);

            const textSpan = document.createElement('span');
            textSpan.className = 'ayah-text';
            textSpan.textContent = ayah.aya_text + ' ';

            textSpan.addEventListener('click', () => {
                AudioPlayer.playAyah(ayah.aya_no);
            });

            span.appendChild(textSpan);
            textBlock.appendChild(span);
        });

        area.appendChild(textBlock);
        area.scrollTop = 0;

        // تحديث العنوان
        const firstAyah = ayahs[0];
        document.getElementById('currentSurahTitle').textContent = `سورة ${firstAyah.sura_name_ar}`;
    },

    showLoader() {
        document.getElementById('readingArea').innerHTML = '<div class="loader"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</div>';
    }
};
