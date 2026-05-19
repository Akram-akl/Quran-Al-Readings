/**
 * tagsAndContext.js - إدارة الميزات المتقدمة: القائمة المنبثقة، العلامات الخاصة، والبحث عن المتشابهات
 */
const TagsAndContext = {
    selectedAyah: null,
    selectedWord: "",
    longPressTimer: null,

    init() {
        this._bindContextEvents();
        this._bindModalActions();
        this.renderSidebarTags();
    },

    _bindContextEvents() {
        const area = document.getElementById('readingArea');
        if (!area) return;

        // 1. كليك يمين (Desktop)
        area.addEventListener('contextmenu', (e) => {
            const wordEl = e.target.closest('.q_word');
            const containerEl = e.target.closest('.ayah-container');
            if (containerEl) {
                e.preventDefault();
                this._showMenu(e.clientX, e.clientY, containerEl, wordEl);
            }
        });

        // 2. الضغطة المطولة (Mobile)
        let touchStartX = 0;
        let touchStartY = 0;
        area.addEventListener('touchstart', (e) => {
            const wordEl = e.target.closest('.q_word');
            const containerEl = e.target.closest('.ayah-container');
            if (containerEl) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                this.longPressTimer = setTimeout(() => {
                    this._showMenu(touchStartX, touchStartY, containerEl, wordEl);
                }, 400); // 400ms ضغطة مطولة
            }
        }, { passive: true });

        area.addEventListener('touchend', () => {
            clearTimeout(this.longPressTimer);
        });

        area.addEventListener('touchmove', () => {
            clearTimeout(this.longPressTimer);
        });

        // إغلاق القائمة عند النقر في أي مكان آخر
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#ayahContextMenu')) {
                this._hideMenu();
            }
        });
    },

    _showMenu(x, y, containerEl, wordEl) {
        const menu = document.getElementById('ayahContextMenu');
        if (!menu) return;

        const suraNo = parseInt(containerEl.dataset.surah);
        const ayaNo = parseInt(containerEl.dataset.ayah || containerEl.dataset.no);
        const fullList = DataHandler.cache[App.currentReading];
        const ayah = fullList ? fullList.find(a => a.sura_no === suraNo && a.aya_no === ayaNo) : null;

        if (!ayah) return;

        this.selectedAyah = ayah;
        this.selectedWord = wordEl ? wordEl.textContent.trim().replace(/[ۖۚۛۗۘ]/g, "") : "";

        // موضع القائمة
        menu.style.display = 'block';
        
        // التحقق من حدود الشاشة لمنع خروج القائمة
        const menuWidth = 180;
        const menuHeight = 100;
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        let posX = x;
        let posY = y;

        if (x + menuWidth > screenWidth) posX = screenWidth - menuWidth - 10;
        if (y + menuHeight > screenHeight) posY = screenHeight - menuHeight - 10;

        menu.style.left = `${posX}px`;
        menu.style.top = `${posY}px`;
    },

    _hideMenu() {
        const menu = document.getElementById('ayahContextMenu');
        if (menu) menu.style.display = 'none';
    },

    _bindModalActions() {
        // زر بحث المتشابهات من القائمة المنبثقة
        const btnSearch = document.getElementById('ctxSearch');
        if (btnSearch) {
            btnSearch.onclick = () => {
                this._hideMenu();
                this.promptSearchOptions();
            };
        }

        // زر وسم علامة خاصة من القائمة المنبثقة
        const btnTag = document.getElementById('ctxTag');
        if (btnTag) {
            btnTag.onclick = () => {
                this._hideMenu();
                const modal = document.getElementById('tagInputModal');
                const input = document.getElementById('tagText');
                if (input) input.value = '';
                if (modal) modal.classList.add('active');
            };
        }

        // حفظ العلامة المرجعية
        const saveBtn = document.getElementById('saveTagBtn');
        if (saveBtn) {
            saveBtn.onclick = () => {
                const textInput = document.getElementById('tagText');
                const tagName = textInput ? textInput.value.trim() : "";
                if (!tagName) return;

                this.addTag(tagName);
                const modal = document.getElementById('tagInputModal');
                if (modal) modal.classList.remove('active');
            };
        }
    },

    // سؤال المستخدم عن طبيعة البحث (كلمة أم آية)
    promptSearchOptions() {
        const word = this.selectedWord;
        const ayah = this.selectedAyah;
        if (!ayah) return;

        // سنقوم بإنشاء نافذة اختيار مخصصة وأنيقة
        const modal = document.getElementById('mutashabihatModal');
        const meta = document.getElementById('mutashabihatMeta');
        const list = document.getElementById('mutashabihatList');
        if (!modal || !meta || !list) return;

        meta.innerHTML = `البحث عن مواضع التكرار والمتشابهات`;
        list.innerHTML = `
            <div class="d-flex flex-column gap-2">
                ${word ? `<button id="searchWordBtn" class="btn btn-primary w-100"><i class="fas fa-font"></i> بحث عن كلمة "${word}"</button>` : ''}
                <button id="searchAyahBtn" class="btn btn-success w-100"><i class="fas fa-paragraph"></i> بحث عن الآية كاملة</button>
            </div>
        `;

        modal.classList.add('active');

        // ربط أزرار البحث الجديدة
        setTimeout(() => {
            const btnW = document.getElementById('searchWordBtn');
            if (btnW) {
                btnW.onclick = () => {
                    this.executeSearch(word, 'word');
                };
            }
            const btnA = document.getElementById('searchAyahBtn');
            if (btnA) {
                btnA.onclick = () => {
                    this.executeSearch(ayah.aya_text, 'ayah');
                };
            }
        }, 50);
    },

    // تنظيف الحركات والرموز القرآنية
    normalizeText(txt) {
        if (!txt) return "";
        return txt.trim()
            .replace(/[\u064B-\u065F\u0670\u0654\u0655\u0656\u200C\u06D6-\u06ED]/g, "")
            .replace(/[أإآٱ]/g, "ا")
            .replace(/ة/g, "ه")
            .replace(/ى/g, "ي")
            .replace(/ؤ/g, "o")
            .replace(/[ۖۚۛۗۘۖ]/g, "");
    },

    // تنفيذ محرك بحث المتشابهات
    executeSearch(queryText, mode) {
        const modal = document.getElementById('mutashabihatModal');
        const meta = document.getElementById('mutashabihatMeta');
        const list = document.getElementById('mutashabihatList');
        if (!list || !this.selectedAyah) return;

        const cleanQuery = this.normalizeText(queryText);
        if (!cleanQuery) return;

        const allAyahs = DataHandler.cache[App.currentReading] || [];
        // البحث فقط بالقراءة المحددة حالياً
        const matches = allAyahs.filter(a => {
            const cleanText = this.normalizeText(a.aya_text);
            return cleanText.includes(cleanQuery);
        });

        meta.innerHTML = `مواضع متشابهات: "${queryText}" (${matches.length} موضع)`;

        if (matches.length === 0) {
            list.innerHTML = `<div class="no-tags-text p-3">لم يتم العثور على مواضع مطابقة.</div>`;
            return;
        }

        list.innerHTML = matches.map(m => {
            const isSelf = m.sura_no === this.selectedAyah.sura_no && m.aya_no === this.selectedAyah.aya_no;
            return `
                <div class="search-item" style="${isSelf ? 'border-right: 3px solid var(--primary); background: rgba(6, 78, 59, 0.04);' : ''}">
                    <p style="font-size: 1.15rem; line-height: 1.8; direction: rtl; font-family: ${READINGS_CONFIG[App.currentReading].fontFamily || 'sans-serif'}">${m.aya_text}</p>
                    <div class="search-item-meta">
                        <span>سورة ${m.sura_name_ar} (آية ${m.aya_no}) - صفحة ${m.page}</span>
                        <button class="btn btn-xs btn-primary" onclick="TagsAndContext.goToAyah(${m.page}, ${m.aya_no}, ${m.sura_no})">
                            <i class="fas fa-external-link-alt"></i> انتقال
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    // انتقال سريع للآية
    goToAyah(page, ayaNo, suraNo) {
        // إغلاق كل المودالز
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
        
        App.loadPage(page).then(() => {
            setTimeout(() => {
                AudioPlayer._highlightSingle(ayaNo, suraNo);
            }, 300);
        });
    },

    // إضافة وسم علامة
    addTag(tagName) {
        if (!this.selectedAyah) return;
        const tags = this.getTags();
        
        tags.push({
            id: Date.now(),
            tagName: tagName,
            suraNo: this.selectedAyah.sura_no,
            suraName: this.selectedAyah.sura_name_ar,
            ayaNo: this.selectedAyah.aya_no,
            page: parseInt(this.selectedAyah.page),
            reading: App.currentReading
        });

        localStorage.setItem('quran_tags_v1', JSON.stringify(tags));
        this.renderSidebarTags();
    },

    getTags() {
        const stored = localStorage.getItem('quran_tags_v1');
        return stored ? JSON.parse(stored) : [];
    },

    deleteTag(id, e) {
        if (e) e.stopPropagation();
        let tags = this.getTags();
        tags = tags.filter(t => t.id !== id);
        localStorage.setItem('quran_tags_v1', JSON.stringify(tags));
        this.renderSidebarTags();
    },

    // عرض وتجميع العلامات في القائمة الجانبية
    renderSidebarTags() {
        const list = document.getElementById('sidebarTagsList');
        if (!list) return;

        const tags = this.getTags();
        if (tags.length === 0) {
            list.innerHTML = `<span class="no-tags-text">لا توجد علامات مضافة حالياً.</span>`;
            return;
        }

        // تجميع حسب اسم العلامة
        const groups = {};
        tags.forEach(t => {
            if (!groups[t.tagName]) groups[t.tagName] = [];
            groups[t.tagName].push(t);
        });

        list.innerHTML = Object.entries(groups).map(([groupName, items]) => {
            return `
                <div class="tag-group">
                    <div class="tag-group-header" onclick="this.nextElementSibling.classList.toggle('active')">
                        <span><i class="fas fa-folder-open"></i> ${groupName} (${items.length})</span>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="tag-group-items">
                        ${items.map(i => `
                            <div class="tag-item-link" onclick="TagsAndContext.goToAyah(${i.page}, ${i.ayaNo}, ${i.suraNo})">
                                <span>سورة ${i.suraName} (${i.ayaNo})</span>
                                <span class="tag-delete-btn" onclick="TagsAndContext.deleteTag(${i.id}, event)" title="حذف">
                                    <i class="fas fa-trash-alt"></i>
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }
};

// تشغيل وربط نظام العلامات عند جهوزية الملف
document.addEventListener('DOMContentLoaded', () => {
    TagsAndContext.init();
});
