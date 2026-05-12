/**
 * ui.js - إدارة واجهة المستخدم
 * تم تعديل المنطق ليتوافق مع ملاحظات PWA Notes الصارمة
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

        if (openBtn) openBtn.onclick = () => sidebar.classList.add('open');
        if (closeBtn) closeBtn.onclick = () => sidebar.classList.remove('open');
    },

    _initTheme() {
        const btn = document.getElementById('themeToggleBtn');
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
        document.getElementById('playPauseBtn').onclick = () => AudioPlayer.togglePlayPause();
        document.getElementById('nextAyahBtn').onclick = () => AudioPlayer.next();
        document.getElementById('prevAyahBtn').onclick = () => AudioPlayer.prev();
        document.getElementById('repeatBtn').onclick = () => AudioPlayer.toggleRepeat();
        
        document.querySelectorAll('.close-modal').forEach(b => {
            b.onclick = () => b.closest('.modal').classList.remove('active');
        });
        
        document.getElementById('searchOpenBtn').onclick = () => document.getElementById('searchModal').classList.add('active');
    },

    _initPageNav() {
        document.getElementById('prevPageBtn').onclick = () => {
            if (this.currentPage > 1) App.loadPage(this.currentPage - 1);
        };
        document.getElementById('nextPageBtn').onclick = () => {
            if (this.currentPage < this.totalPages) App.loadPage(this.currentPage + 1);
        };
        document.getElementById('pageInput').onchange = (e) => {
            const p = parseInt(e.target.value);
            if (p >= 1 && p <= this.totalPages) App.loadPage(p);
        };
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
    },

    /**
     * كشف هل الآية 1 هي البسملة
     */
    _isBismillahAyah(ayah) {
        if (ayah.aya_no !== 1) return false;
        const text = ayah.aya_text_emlaey || ayah.aya_text || '';
        return text.includes('بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ');
    },

    renderAyahs(ayahs, readingKey) {
        const area = document.getElementById('readingArea');
        const config = READINGS_CONFIG[readingKey];
        area.innerHTML = '';

        const textBlock = document.createElement('div');
        textBlock.className = 'quran-text-block';
        textBlock.style.fontFamily = `'${config.fontFamily}', serif`;

        let lastSurahNo = null;
        let isFirstInPage = true;

        ayahs.forEach(ayah => {
            // عند بداية سورة جديدة
            if (ayah.sura_no !== lastSurahNo) {
                lastSurahNo = ayah.sura_no;

                const header = document.createElement('div');
                header.className = 'surah-header-inline';
                header.textContent = `سورة ${ayah.sura_name_ar}`;
                textBlock.appendChild(header);

                // إضافة الاستعاذة والبسملة كإضافات (الملاحظة 16 و 22)
                if (ayah.aya_no === 1) {
                    // الاستعاذة
                    const istiazah = document.createElement('div');
                    istiazah.className = 'istiazah';
                    istiazah.textContent = 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ';
                    istiazah.onclick = () => AudioPlayer.playIstiazah();
                    textBlock.appendChild(istiazah);

                    // البسملة (إلا إذا كانت هي الآية 1 أصلاً لمنع التكرار)
                    if (!this._isBismillahAyah(ayah) && !NO_BASMALAH_SURAHS.includes(ayah.sura_no)) {
                        const bismillah = document.createElement('div');
                        bismillah.className = 'bismillah';
                        bismillah.textContent = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';
                        bismillah.onclick = () => AudioPlayer.playBasmalah(ayah.sura_no);
                        textBlock.appendChild(bismillah);
                    }
                }
            }

            // عرض الآية (الملاحظة 22: جميع الآيات يجب أن تظهر)
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
        document.getElementById('currentSurahTitle').textContent = `سورة ${ayahs[0].sura_name_ar}`;
    }
};
