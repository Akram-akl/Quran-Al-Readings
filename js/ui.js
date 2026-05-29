/**
 * ui.js - تحسين هيكلة الصفحات وتنسيق السور المشتركة ووضع الاختبار
 */
const UI = {
    currentPage: 1,
    totalPages: 604,
    currentPageAyahs: [], // تخزين آيات الصفحة النشطة للربط المباشر بطلب الاستماع

    init() {
        this._initSidebar();
        this._initAppCredit();
        this._initTheme();
        this._initPlayerControls();
        this._initPageNav();
        if (typeof Search !== 'undefined') Search.init();
        if (typeof ListenRange !== 'undefined') ListenRange.init();
        if (typeof DownloadManager !== 'undefined') DownloadManager.init();

        // Handle hardware back button in Android (Capacitor)
        if (window.Capacitor && window.Capacitor.Plugins.App) {
            window.Capacitor.Plugins.App.addListener('backButton', ({ canGoBack }) => {
                const activeModal = document.querySelector('.modal.active');
                if (activeModal) {
                    activeModal.classList.remove('active');
                    return;
                }
                const sidebar = document.getElementById('sidebar');
                if (sidebar && sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                    return;
                }
                // If nothing is open, we can exit or go back in history
                if (!canGoBack) {
                    window.Capacitor.Plugins.App.exitApp();
                } else {
                    window.history.back();
                }
            });
        }
    },

    _initSidebar() {
        const sidebar = document.getElementById('sidebar');
        const openBtn = document.getElementById('openSidebarBtn');
        const closeBtn = document.getElementById('closeSidebarBtn');
        if (openBtn && sidebar) openBtn.onclick = () => sidebar.classList.add('open');
        if (closeBtn && sidebar) closeBtn.onclick = () => sidebar.classList.remove('open');
    },

    _initAppCredit() {
        const badge = document.getElementById('appCreditBadge');
        const text = document.getElementById('appCreditText');
        if (!badge || !text) return;

        const close = () => {
            text.hidden = true;
            badge.classList.remove('is-open');
            badge.setAttribute('aria-expanded', 'false');
        };

        badge.onclick = (e) => {
            e.stopPropagation();
            const willOpen = text.hidden;
            if (willOpen) {
                text.hidden = false;
                badge.classList.add('is-open');
                badge.setAttribute('aria-expanded', 'true');
            } else {
                close();
            }
        };

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.sidebar-footer')) {
                close();
            }
        });
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
        if (searchOpen) searchOpen.onclick = () => {
            const modal = document.getElementById('searchModal');
            modal.querySelector('h2').textContent = 'بحث في جميع القراءات';
            document.getElementById('searchInput').value = '';
            document.getElementById('searchResults').innerHTML = '';
            const btn = document.getElementById('searchBtn');
            btn.onclick = () => Search.performSearch(document.getElementById('searchInput').value, false);
            document.getElementById('searchInput').onkeypress = (e) => { if (e.key === 'Enter') Search.performSearch(e.target.value, false); };
            modal.classList.add('active');
        };
        
        const searchCurrentBtn = document.getElementById('searchCurrentReadingBtn');
        if (searchCurrentBtn) searchCurrentBtn.onclick = () => {
            const modal = document.getElementById('searchModal');
            modal.querySelector('h2').textContent = 'بحث في الرواية الحالية';
            document.getElementById('searchInput').value = '';
            document.getElementById('searchResults').innerHTML = '';
            const btn = document.getElementById('searchBtn');
            btn.onclick = () => Search.performSearch(document.getElementById('searchInput').value, true);
            document.getElementById('searchInput').onkeypress = (e) => { if (e.key === 'Enter') Search.performSearch(e.target.value, true); };
            modal.classList.add('active');
        };
        
        document.querySelectorAll('.close-modal').forEach(b => {
            b.onclick = () => b.closest('.modal').classList.remove('active');
        });
    },

    _initPageNav() {
        const prev = document.getElementById('prevPageBtn');
        const next = document.getElementById('nextPageBtn');
        const input = document.getElementById('pageInput');
        if (prev) prev.onclick = () => { if (App.currentPage > 1) App.loadPage(App.currentPage - 1); };
        if (next) next.onclick = () => { if (App.currentPage < this.totalPages) App.loadPage(App.currentPage + 1); };
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

    splitAyahText(ayahText, lastWordOfPart1, firstWordOfPart2, returnPart) {
        if (!ayahText) return "";
        const words = ayahText.trim().split(/\s+/);
        
        // مساعدة لإزالة التشكيل بهدف المقارنة فقط
        const normalize = (w) => w.replace(/[\u064B-\u065F\u0670\u0654\u0655\u0656\u200C\u06D6-\u06ED]/g, "")
                                  .replace(/[أإآٱ]/g, "ا")
                                  .replace(/ة/g, "ه")
                                  .replace(/ى/g, "ي")
                                  .replace(/ؤ/g, "و");
                                  
        const normLast = normalize(lastWordOfPart1);
        const normNext = normalize(firstWordOfPart2);
        
        let splitIndex = -1;
        for (let i = 0; i < words.length - 1; i++) {
            if (normalize(words[i]) === normLast && normalize(words[i + 1]) === normNext) {
                splitIndex = i;
                break;
            }
        }
        
        if (splitIndex === -1) return ayahText; // في حالة عدم التطابق، نعيد النص كاملاً
        
        if (returnPart === 1) {
            return words.slice(0, splitIndex + 1).join(" ");
        } else {
            return words.slice(splitIndex + 1).join(" ");
        }
    },

    toArabicNumerals(n) {
        const d = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
        return String(n).replace(/\d/g, x => d[x]);
    },

    renderAyahs(ayahs, reading) {
        const area = document.getElementById('readingArea');
        if (!area || !ayahs.length) return;
        
        area.innerHTML = '';
        const config = READINGS_CONFIG[reading];

        // فرز الآيات لضمان الترتيب الصحيح حسب aya_no
        const sortedAyahs = ayahs.slice().sort((a, b) => a.aya_no - b.aya_no);
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
        let lastHizbMarkerText = null;

        // حساب عدد علامات ۞ قبل الصفحة الحالية (للروايات غير حفص/شعبة)
        const baseReadingForHizb = (reading || '').replace(/Hussary|Minshawi|Jazairi|Dossari|Huthaify/g, '');
        if (baseReadingForHizb !== 'Hafs' && baseReadingForHizb !== 'Shubah') {
            const allData = DataHandler.cache[reading];
            const currentPage = App.currentPage;
            if (allData && currentPage) {
                let count = 0;
                for (const d of allData) {
                    const dPage = typeof d.page === 'string' && d.page.includes('-') ? parseInt(d.page.split('-')[0]) : parseInt(d.page);
                    if (dPage >= currentPage) break;
                    if ((d.aya_text || '').includes('۞')) count++;
                }
                this._hizbMarkerCount = count;
            } else {
                this._hizbMarkerCount = 0;
            }
        }

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
                // الاستعاذة تُكتب فقط في سورة الفاتحة بناءً على طلب المستخدم
                if (currentSuraNo === 1) {
                    const ist = document.createElement('div');
                    ist.className = 'istiazah';
                    ist.textContent = 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ';
                    surahSection.appendChild(ist);
                }
                
                // البسملة لجميع السور عدا سورة التوبة (بشرط ألا تكون البسملة مدمجة بالآية كالفاتحة)
                if (currentSuraNo !== 9 && !this._isBismillah(firstAyahInGroup)) {
                    const bas = document.createElement('div');
                    bas.className = 'bismillah';
                    bas.setAttribute('data-surah', currentSuraNo);
                    const basWords = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ'.split(/\s+/);
                    bas.innerHTML = basWords.map((w, i) => `<span class="q_word" data-word-idx="${i + 1}">${w}</span>`).join(' ');
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
                
                let finalAyahText = a.aya_text;
                
                // معالجة القص للآيات الممتدة بين صفحتين (إذا توفرت القاعدة للرواية الحالية)
                if (typeof a.page === 'string' && a.page.includes('-')) {
                    const [startPage, endPage] = a.page.split('-').map(Number);
                    const baseReading = reading.replace(/Hussary|Minshawi|Jazairi|Dossari|Huthaify/g, '');
                    const splitRules = typeof SPANNING_AYAH_SPLITS !== 'undefined' ? SPANNING_AYAH_SPLITS[baseReading] : null;
                    const ruleKey = `${a.sura_no}:${a.aya_no}`;
                    
                    if (splitRules && splitRules[ruleKey]) {
                        const rule = splitRules[ruleKey];
                        if (App.currentPage === startPage) {
                            finalAyahText = this.splitAyahText(finalAyahText, rule.lastWord, rule.nextWord, 1);
                        } else if (App.currentPage === endPage) {
                            finalAyahText = this.splitAyahText(finalAyahText, rule.lastWord, rule.nextWord, 2);
                        }
                    }
                }

                // إضافة ملحوظة الحزب حسب الرواية الحالية
                // حفص وشعبة: يستخدمان QURAN_QUARTERS (أرباع)
                // الروايات الأخرى: يستخدمن عدّ علامة ۞ تصاعدياً (أثمان)
                const baseReading = (App.currentReading || '').replace(/Hussary|Minshawi|Jazairi|Dossari|Huthaify/g, '');
                let hizbText = null;

                if ((baseReading === 'Hafs' || baseReading === 'Shubah') && typeof QURAN_QUARTERS !== 'undefined') {
                    // --- حفص وشعبة: نظام الأرباع (كل حزب = 4 علامات) ---
                    const quarterIdx = QURAN_QUARTERS.findIndex(q => q.surah === a.sura_no && q.ayah === a.aya_no);
                    if (quarterIdx !== -1) {
                        const hizbNum = Math.floor(quarterIdx / 4) + 1;
                        const part = quarterIdx % 4;
                        if (part === 0) {
                            hizbText = `الحزب ${this.toArabicNumerals(hizbNum)}`;
                            if (quarterIdx % 8 === 0) {
                                const juzNum = Math.floor(quarterIdx / 8) + 1;
                                hizbText = `الجزء ${this.toArabicNumerals(juzNum)} - ${hizbText}`;
                            }
                        }
                        else if (part === 1) hizbText = `ربع الحزب ${this.toArabicNumerals(hizbNum)}`;
                        else if (part === 2) hizbText = `نصف الحزب ${this.toArabicNumerals(hizbNum)}`;
                        else if (part === 3) hizbText = `ثلاثة أرباع الحزب ${this.toArabicNumerals(hizbNum)}`;
                    }
                } else if (finalAyahText.includes('۞')) {
                    // --- الروايات غير حفص/شعبة: عدّ ۞ تصاعدياً ---
                    if (!this._hizbMarkerCount) this._hizbMarkerCount = 0;
                    this._hizbMarkerCount++;
                    const idx = this._hizbMarkerCount; // الترتيب التصاعدي من بداية المصحف
                    const posInHizb = ((idx - 1) % 8) + 1; // 1..8
                    const hizbNum = Math.floor((idx - 1) / 8) + 1;

                    if (baseReading === 'Warsh') {
                        // ورش: ثمن، ربع، ثمن، نصف الحزب، ثمن، ربع، ثمن، الحزب (+ أجزاء)
                        // Use Arabic numerals for thumn numbers (ثمن٢, ثمن٣, ...)
                        let warshLabel = '';
                        if (posInHizb % 2 === 1) { // positions 1,3,5,7 are thumn
                            const thumnOrdinal = Math.floor((posInHizb + 1) / 2);
                            warshLabel = `ثمن${this.toArabicNumerals(thumnOrdinal)}`;
                        } else if (posInHizb === 2 || posInHizb === 6) {
                            warshLabel = 'ربع';
                        } else if (posInHizb === 4) {
                            warshLabel = 'نصف الحزب';
                        } else if (posInHizb === 8) {
                            warshLabel = `الحزب${this.toArabicNumerals(hizbNum)}`;
                        }
                        hizbText = warshLabel;
                        if (posInHizb === 8 && idx % 16 === 0) {
                            const juzNum = Math.floor((idx - 1) / 16) + 1;
                            hizbText = `الجزء${this.toArabicNumerals(juzNum)}-${hizbText}`;
                        } else if (baseReading === 'Qaloun') {
                        // قالون: مثل ورش لكن بدون أجزاء
                        const qalounLabels = ['ثمن', 'ربع', 'ثمن', 'نصف', 'ثمن', 'ربع', 'ثمن', `الحزب ${this.toArabicNumerals(hizbNum)}`];
                        hizbText = qalounLabels[posInHizb - 1];
                    } else if (baseReading === 'Duri' || baseReading === 'Susi') {
                        // الدوري والسوسي: ثمن2، ثمن3 ... ثمن8، الحزب
                        if (posInHizb === 8) {
                            hizbText = `الحزب${this.toArabicNumerals(hizbNum)}`;
                            if (idx % 16 === 0) {
                                const juzNum = Math.floor((idx - 1) / 16) + 1;
                                hizbText = `الجزء${this.toArabicNumerals(juzNum)}-${hizbText}`;
                            }
                        } else {
                            // ثمن positions start from 2
                            const thumnOrdinal = posInHizb + 1; // posInHizb 1->2, 2->3, ...,7->8
                            hizbText = `ثمن${this.toArabicNumerals(thumnOrdinal)}`;
                        }
                    } else {
                        // أي رواية أخرى: نظام أثمان عام
                        hizbText = posInHizb === 8 ? `الحزب ${this.toArabicNumerals(hizbNum)}` : `ثمن ${this.toArabicNumerals(posInHizb)}`;
                    }
                }

                if (hizbText) {
                    lastHizbMarkerText = hizbText;
                }

                span.className = 'ayah-container';
                
                span.setAttribute('data-ayah', a.aya_no);
                span.setAttribute('data-no', a.aya_no);
                span.setAttribute('data-surah', a.sura_no);
                
                // تغليف كل كلمة قرآنية بـ span (تصفية الفراغات لتجنب مسافات عريضة بين الكلمات)
                const words = finalAyahText.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
                let ayahNumberWord = '';
                let formattedWords = '';
                let formattedNumber = '';

                if (words.length > 0) {
                    ayahNumberWord = words.pop();
                    formattedWords = words.map((w, i) => {
                        return `<span class="q_word" data-word-idx="${i + 1}">${w}</span>`;
                    }).join(' ');
                    formattedNumber = `<span class="q_word" data-word-idx="${words.length + 1}" data-is-ayah-number="true">${ayahNumberWord}</span>`;
                }

                // تطبيق وضع الاختبار التفاعلي (النقرة الأولى للكشف، الثانية للتشغيل)
                if (typeof App !== 'undefined' && App.TestingMode && App.TestingMode.isActive && !isB) {
                    span.classList.add('hidden-ayah');
                    span.innerHTML = `<span class="ayah-text" style="user-select: none; cursor: pointer;" onclick="
                        if (this.parentElement.classList.contains('hidden-ayah')) {
                            this.parentElement.classList.remove('hidden-ayah');
                            const hiddenSpan = this.querySelector('.ayah-words-hidden');
                            if (hiddenSpan) hiddenSpan.style.filter = 'none';
                        }
                    "><span class="ayah-words-hidden" style="filter: blur(7px);">${formattedWords}</span> ${formattedNumber}</span> `;
                } else {
                    span.innerHTML = `<span class="ayah-text">${formattedWords} ${formattedNumber}</span> `;
                }
                textBlock.appendChild(span);
            });

            surahSection.appendChild(textBlock);
            area.appendChild(surahSection);
            
            isFirstSurahOnPage = false;
        }

        if (lastHizbMarkerText) {
            const footerMarker = document.createElement('div');
            footerMarker.className = 'page-hizb-footer';
            footerMarker.innerHTML = `<i class="fas fa-bookmark" style="color:var(--primary); margin-left:5px; font-size:1.1em;"></i> ${lastHizbMarkerText}`;
            area.appendChild(footerMarker);
        }

        area.scrollTop = 0;
        const title = document.getElementById('currentSurahTitle');
        if (title) title.textContent = `سورة ${ayahs[0].sura_name_ar}`;
        const jozzText = document.getElementById('currentJozzText');
        if (jozzText && ayahs[0].jozz) jozzText.textContent = `الجزء ${ayahs[0].jozz}`;
    },

    _isBismillah(a) {
        if (a.aya_no !== 1) return false;
        const raw = (a.aya_text_emlaey || a.aya_text || '');
        const text = raw
            .replace(/[\u064B-\u065F\u0670\u0654\u0655\u0656\u200C\u06D6-\u06ED]/g, '')
            .replace(/[أإآٱ]/g, 'ا')
            .replace(/ة/g, 'ه')
            .replace(/ى/g, 'ي')
            .replace(/\s+/g, ' ')
            .trim();
        return text.includes('بسم الله الرحمن الرحيم');
    },

    showLoader() {
        const area = document.getElementById('readingArea');
        if (area) area.innerHTML = '<div class="loader">جاري التحميل...</div>';
    }
};
