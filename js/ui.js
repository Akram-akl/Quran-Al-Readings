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

    renderAyahs(ayahs, reading) {
        const area = document.getElementById('readingArea');
        if (!area || !ayahs.length) return;
        
        area.innerHTML = '';
        const config = READINGS_CONFIG[reading];

        const sortedAyahs = ayahs.sort((a, b) => a.aya_no - b.aya_no);
        this.currentPageAyahs = sortedAyahs; 

        // 1. تحديد أقصى سطر في الصفحة ديناميكياً
        let maxLine = 0;
        sortedAyahs.forEach(a => {
            if (a.line_end > maxLine) maxLine = a.line_end;
        });
        if (maxLine === 0) maxLine = 15;

        // 2. إنشاء حاويات السطور بدقة
        const lineElements = {};
        for(let i = 1; i <= maxLine; i++) {
            const lineDiv = document.createElement('div');
            lineDiv.className = 'quran-line';
            lineDiv.style.textAlign = 'justify';
            lineDiv.style.textAlignLast = 'justify'; // مط الكلمات لملء السطر تماماً كالمصحف
            lineDiv.style.width = '100%';
            lineDiv.style.display = 'block';
            lineElements[i] = lineDiv;
        }

        const suraGroups = {};
        sortedAyahs.forEach(a => {
            if (!suraGroups[a.sura_no]) suraGroups[a.sura_no] = [];
            suraGroups[a.sura_no].push(a);
        });

        let isFirstSurahOnPage = true;

        for (const [suraNo, groupAyahs] of Object.entries(suraGroups)) {
            const currentSuraNo = parseInt(suraNo);
            const firstAyah = groupAyahs[0];
            const lastAyah = groupAyahs[groupAyahs.length - 1];

            // 3. وضع الترويسة والبسملة في سطورها المخصصة
            if (firstAyah.aya_no === 1) {
                let headerLineNum = (firstAyah.line_start || 2) - 2;
                let bismillahLineNum = (firstAyah.line_start || 2) - 1;
                
                if (headerLineNum < 1) headerLineNum = 1;
                if (bismillahLineNum < 1) bismillahLineNum = 1;

                if (isFirstSurahOnPage && headerLineNum > 1) {
                    const ist = document.createElement('div');
                    ist.className = 'istiazah';
                    ist.textContent = 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ';
                    ist.onclick = () => AudioPlayer.playIstiazah();
                    if (lineElements[headerLineNum - 1] || lineElements[1]) {
                        (lineElements[headerLineNum - 1] || lineElements[1]).appendChild(ist);
                        (lineElements[headerLineNum - 1] || lineElements[1]).style.textAlignLast = 'center';
                    }
                }

                const header = document.createElement('div');
                header.className = 'surah-header-inline';
                header.textContent = 'سورة ' + firstAyah.sura_name_ar;
                if (lineElements[headerLineNum]) {
                    lineElements[headerLineNum].appendChild(header);
                    lineElements[headerLineNum].style.textAlignLast = 'center';
                }

                if (currentSuraNo !== 9 && !this._isBismillah(firstAyah)) {
                    const bas = document.createElement('div');
                    bas.className = 'bismillah';
                    bas.textContent = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';
                    bas.onclick = () => AudioPlayer.playBasmalah();
                    if (lineElements[bismillahLineNum]) {
                        lineElements[bismillahLineNum].appendChild(bas);
                        lineElements[bismillahLineNum].style.textAlignLast = 'center';
                    }
                }
            }

            // 4. توزيع الآيات على السطور
            groupAyahs.forEach(a => {
                const isB = this._isBismillah(a);
                let text = a.aya_text;
                
                if (typeof a.page === 'string' && a.page.includes('-')) {
                    const [startPage, endPage] = a.page.split('-').map(Number);
                    const baseReading = reading.replace(/Hussary|Minshawi|Jazairi|Dossari|Huthaify/g, '');
                    const splitRules = typeof SPANNING_AYAH_SPLITS !== 'undefined' ? SPANNING_AYAH_SPLITS[baseReading] : null;
                    const ruleKey = a.sura_no + ':' + a.aya_no;
                    if (splitRules && splitRules[ruleKey]) {
                        const rule = splitRules[ruleKey];
                        if (App.currentPage === startPage) {
                            text = this.splitAyahText(text, rule.lastWord, rule.nextWord, 1);
                        } else if (App.currentPage === endPage) {
                            text = this.splitAyahText(text, rule.lastWord, rule.nextWord, 2);
                        }
                    }
                }

                const startLine = a.line_start || 1;
                const endLine = a.line_end || startLine;

                if (startLine === endLine) {
                    const span = this._createAyahSpan(a, text, isB);
                    if (lineElements[startLine]) lineElements[startLine].appendChild(span);
                } else {
                    // تقسيم ذكي للكلمات لتوزيعها على السطور
                    const words = text.trim().split(/\s+/);
                    const spanned = endLine - startLine + 1;
                    const wordsPerLine = Math.ceil(words.length / spanned);

                    for (let i = 0; i < spanned; i++) {
                        const chunk = words.slice(i * wordsPerLine, (i + 1) * wordsPerLine).join(' ');
                        if (chunk.length > 0) {
                            const span = this._createAyahSpan(a, chunk, isB); 
                            if (lineElements[startLine + i]) {
                                lineElements[startLine + i].appendChild(span);
                            }
                        }
                    }
                }
            });
            isFirstSurahOnPage = false;
        }

        // تطبيق خوارزمية التوسيط والمحاذاة الانسيابية لكل سطر بشكل ديناميكي
        for (let i = 1; i <= maxLine; i++) {
            const lineDiv = lineElements[i];
            if (!lineDiv) continue;

            const textContent = lineDiv.textContent.trim();
            const words = textContent.split(/\s+/).filter(w => w.length > 0);

            if (words.length === 0) {
                lineDiv.style.textAlign = 'center';
                lineDiv.style.textAlignLast = 'center';
                continue;
            }

            const hasHeaderOrBismillah = lineDiv.querySelector('.surah-header-inline') || lineDiv.querySelector('.bismillah') || lineDiv.querySelector('.istiazah');
            
            // تحديد ما إذا كان السطر هو نهاية سورة
            let isLastLineOfSurah = (i === maxLine);
            if (!isLastLineOfSurah && lineElements[i + 1]) {
                const nextLineHasHeader = lineElements[i + 1].querySelector('.surah-header-inline') || lineElements[i + 1].querySelector('.bismillah') || lineElements[i + 1].querySelector('.istiazah');
                if (nextLineHasHeader) {
                    isLastLineOfSurah = true;
                }
            }

            // إذا كان السطر قصيراً جداً (4 كلمات أو أقل)، أو يحتوي ترويسة/بسملة، أو هو السطر الأخير للسورة -> يتم توسيطه انسيابياً
            if (hasHeaderOrBismillah || isLastLineOfSurah || words.length <= 4) {
                lineDiv.style.textAlign = 'center';
                lineDiv.style.textAlignLast = 'center';
            } else {
                lineDiv.style.textAlign = 'justify';
                lineDiv.style.textAlignLast = 'justify';
            }
        }

        const pageContainer = document.createElement('div');
        pageContainer.className = 'quran-text-block mushaf-page-container';
        pageContainer.style.fontFamily = config.fontFamily;
        pageContainer.style.textAlign = 'right';

        for(let i = 1; i <= maxLine; i++) {
            pageContainer.appendChild(lineElements[i]);
        }

        area.appendChild(pageContainer);
        area.scrollTop = 0;
        const title = document.getElementById('currentSurahTitle');
        if (title) title.textContent = 'سورة ' + ayahs[0].sura_name_ar;
    },

    _createAyahSpan(a, text, isB) {
        const span = document.createElement('span');
        span.className = isB ? 'bismillah' : 'ayah-container';
        span.setAttribute('data-ayah', a.aya_no);
        span.setAttribute('data-no', a.aya_no);
        span.setAttribute('data-surah', a.sura_no);
        
        if (typeof App !== 'undefined' && App.TestingMode && App.TestingMode.isActive && !isB) {
            span.classList.add('hidden-ayah');
            span.innerHTML = `<span class="ayah-text" style="filter: blur(7px); user-select: none; cursor: pointer;" onclick="
                if (this.parentElement.classList.contains('hidden-ayah')) {
                    this.parentElement.classList.remove('hidden-ayah');
                    this.style.filter = 'none';
                } else {
                    AudioPlayer.playAyah(${a.aya_no}, ${a.sura_no});
                }
            ">${text}</span> `;
        } else {
            span.innerHTML = `<span class="ayah-text" onclick="AudioPlayer.playAyah(${a.aya_no}, ${a.sura_no})">${text}</span> `;
        }
        return span;
    },
    _isBismillah(a) {
        return a.aya_no === 1 && (a.aya_text_emlaey || a.aya_text || '').includes('بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ');
    },

    showLoader() {
        const area = document.getElementById('readingArea');
        if (area) area.innerHTML = '<div class="loader">جاري التحميل...</div>';
    }
};
