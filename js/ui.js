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
     * كشف ما إذا كانت الآية الأولى في البيانات هي البسملة
     * حفص وشعبة: الآية 1 = البسملة (تعتبر آية)
     * ورش، قالون، الدوري، السوسي: الآية 1 = الحمد لله (البسملة ليست آية)
     */
    _isBismillahInData(readingKey) {
        const data = DataHandler.cache[readingKey];
        if (!data) return false;
        const firstAyah = data.find(a => a.sura_no === 1 && a.aya_no === 1);
        if (!firstAyah) return false;
        // إذا كانت الآية 1 تحتوي على "بسم" فالبسملة جزء من البيانات
        const text = firstAyah.aya_text_emlaey || firstAyah.aya_text || '';
        return text.includes('بسم');
    },

    /**
     * عرض آيات صفحة كاملة
     * القواعد:
     * - أرقام الآيات موجودة في aya_text (لا نضيفها)
     * - الاستعاذة: تظهر مرة واحدة فقط قبل أول سورة في الصفحة
     * - البسملة: تظهر قبل أول آية من كل سورة (عدا التوبة)
     *   لكن في حفص/شعبة الآية 1 هي البسملة (لا نكررها)
     *   وفي ورش/قالون/الدوري/السوسي الآية 1 = "الحمد لله" (نضيف بسملة)
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

        // كشف هل البسملة جزء من بيانات الآيات (حفص/شعبة) أم لا
        const bismillahInData = this._isBismillahInData(readingKey);

        // تتبع السورة الحالية
        let lastSurahNo = null;
        let isFirstSurahInPage = true;

        ayahs.forEach(ayah => {
            // عند بداية سورة جديدة في الصفحة
            if (ayah.sura_no !== lastSurahNo) {
                lastSurahNo = ayah.sura_no;

                // عنوان السورة
                const surahHeader = document.createElement('div');
                surahHeader.className = 'surah-header-inline';
                surahHeader.textContent = `سورة ${ayah.sura_name_ar}`;
                textBlock.appendChild(surahHeader);

                // الاستعاذة: فقط قبل أول سورة في الصفحة
                if (isFirstSurahInPage && ayah.aya_no === 1) {
                    const istiazah = document.createElement('div');
                    istiazah.className = 'istiazah';
                    istiazah.style.cursor = 'pointer';
                    istiazah.textContent = 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ';
                    istiazah.onclick = () => AudioPlayer.playIstiazah();
                    textBlock.appendChild(istiazah);
                }

                // البسملة: قبل أول آية من كل سورة
                if (ayah.aya_no === 1 && !NO_BASMALAH_SURAHS.includes(ayah.sura_no)) {
                    if (!bismillahInData) {
                        // ورش/قالون/الدوري/السوسي: البسملة ليست آية - نضيفها كرأس موضوع
                        const bismillah = document.createElement('div');
                        bismillah.className = 'bismillah';
                        bismillah.style.cursor = 'pointer';
                        bismillah.textContent = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';
                        bismillah.onclick = () => AudioPlayer.playBasmalah(ayah.sura_no);
                        textBlock.appendChild(bismillah);
                    } else if (ayah.sura_no !== 1) {
                        // حفص/شعبة في السور غير الفاتحة: الآية 1 ليست هي البسملة
                        // لذا نحتاج إضافة البسملة كرأس موضوع (حتى لو كانت مسجلة مع الآية 1 في بعض المصاحف، هنا نفصلها للعرض الجمالي)
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

            // إذا كانت الآية 1 هي البسملة (كما في فاتحة حفص)
            // نتحقق إذا كان النص هو البسملة فقط لتمييزها بصرياً
            const isBismillahAyah = bismillahInData && ayah.sura_no === 1 && ayah.aya_no === 1;

            const span = document.createElement('span');
            span.className = isBismillahAyah ? 'bismillah' : 'ayah-container';
            if (isBismillahAyah) span.style.display = 'block'; // جعل بسملة الفاتحة في سطر منفصل

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
