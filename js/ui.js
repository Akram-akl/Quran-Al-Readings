/**
 * ui.js - تحسين هيكلة الصفحات وتنسيق السور المشتركة ووضع الاختبار
 */
const UI = {
    currentPage: 1,
    totalPages: 604,
    currentPageAyahs: [], // تخزين آيات الصفحة النشطة للربط المباشر بطلب الاستماع

    init() {
        this._initSidebar();
        this._initTheme();
        this._initPlayerControls();
        this._initPageNav();
        if (typeof Search !== 'undefined') Search.init();
        if (typeof ListenRange !== 'undefined') ListenRange.init();
        if (typeof DownloadManager !== 'undefined') DownloadManager.init();
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

        // فرز الآيات لضمان الترتيب الصحيح حسب aya_no
        const sortedAyahs = ayahs.sort((a, b) => a.aya_no - b.aya_no);
        this.currentPageAyahs = sortedAyahs; // حفظ آيات الصفحة الحالية للاستماع المتتابع

        // تقسيم آيات الصفحة الحالية إلى مجموعات حسب رقم السورة (دعم تداخل السور وجزء عم)
        const suraGroups = {};
        sortedAyahs.forEach(a => {
            if (!suraGroups[a.sura_no]) {
                suraGroups[a.sura_no] = [];
            }
            suraGroups[a.sura_no].push(a);
        });

        let isFirstSurahOnPage = true;

        for (const [suraNo, groupAyahs] of Object.entries(suraGroups)) {
            const currentSuraNo = parseInt(suraNo);
            const firstAyahInGroup = groupAyahs[0];

            // إنشاء حاوية مخصصة وأنيقة للسورة الحالية
            const surahSection = document.createElement('div');
            surahSection.className = 'surah-section';

            // إضافة ترويسة السورة كعنصر مستقل تماماً
            const header = document.createElement('div');
            header.className = 'surah-header-inline';
            header.textContent = `سورة ${firstAyahInGroup.sura_name_ar}`;
            surahSection.appendChild(header);

            // الاستعاذة والبسملة قبل الآيات عند بداية كل سورة
            if (firstAyahInGroup.aya_no === 1) {
                // الاستعاذة للرأس الأول بالصفحة فقط لمنع التكرار المزعج
                if (isFirstSurahOnPage) {
                    const ist = document.createElement('div');
                    ist.className = 'istiazah';
                    ist.textContent = 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ';
                    ist.onclick = () => AudioPlayer.playIstiazah();
                    surahSection.appendChild(ist);
                }
                
                // البسملة لجميع السور عدا سورة التوبة (بشرط ألا تكون البسملة مدمجة بالآية كالفاتحة)
                if (currentSuraNo !== 9 && !this._isBismillah(firstAyahInGroup)) {
                    const bas = document.createElement('div');
                    bas.className = 'bismillah';
                    bas.textContent = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';
                    bas.onclick = () => AudioPlayer.playBasmalah();
                    surahSection.appendChild(bas);
                }
            }

            // إنشاء كتلة نصية محاذية لآيات هذه السورة
            const textBlock = document.createElement('div');
            textBlock.className = 'quran-text-block';
            textBlock.style.fontFamily = config.fontFamily;

            groupAyahs.forEach(a => {
                const isB = this._isBismillah(a);
                const span = document.createElement('span');
                span.className = isB ? 'bismillah' : 'ayah-container';
                
                // وضع البسملة المدمجة بالآيات في سطر لحالها للتنسيق
                if (isB && currentSuraNo !== 1) span.style.display = 'block'; 

                span.setAttribute('data-ayah', a.aya_no);
                span.setAttribute('data-no', a.aya_no);
                span.setAttribute('data-surah', a.sura_no);
                
                // تطبيق وضع الاختبار التفاعلي (النقرة الأولى للكشف، الثانية للتشغيل)
                if (typeof App !== 'undefined' && App.TestingMode && App.TestingMode.isActive && !isB) {
                    span.classList.add('hidden-ayah');
                    span.innerHTML = `<span class="ayah-text" style="filter: blur(7px); user-select: none; cursor: pointer;" onclick="
                        if (this.parentElement.classList.contains('hidden-ayah')) {
                            this.parentElement.classList.remove('hidden-ayah');
                            this.style.filter = 'none';
                        } else {
                            AudioPlayer.playAyah(${a.aya_no}, ${a.sura_no});
                        }
                    ">${a.aya_text}</span> `;
                } else {
                    span.innerHTML = `<span class="ayah-text" onclick="AudioPlayer.playAyah(${a.aya_no}, ${a.sura_no})">${a.aya_text}</span> `;
                }
                textBlock.appendChild(span);
            });

            surahSection.appendChild(textBlock);
            area.appendChild(surahSection);
            
            isFirstSurahOnPage = false;
        }

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
