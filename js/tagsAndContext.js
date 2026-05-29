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
            const istiazahEl = e.target.closest('.istiazah');
            const bismillahEl = e.target.closest('.bismillah');
            if (containerEl || istiazahEl || bismillahEl) {
                e.preventDefault();
                this._showMenu(e.clientX, e.clientY, containerEl, wordEl, istiazahEl, bismillahEl);
            }
        });


        // 2. الضغطة المطولة (Mobile)
        let touchStartX = 0;
        let touchStartY = 0;
        let touchCurrentX = 0;
        let touchCurrentY = 0;
        
        area.addEventListener('touchstart', (e) => {
            const wordEl = e.target.closest('.q_word');
            const containerEl = e.target.closest('.ayah-container');
            const istiazahEl = e.target.closest('.istiazah');
            const bismillahEl = e.target.closest('.bismillah');
            if (containerEl || istiazahEl || bismillahEl) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                touchCurrentX = touchStartX;
                touchCurrentY = touchStartY;
                
                this.longPressTimer = setTimeout(() => {
                    const moveDist = Math.hypot(touchCurrentX - touchStartX, touchCurrentY - touchStartY);
                    if (moveDist < 15) {
                        this._showMenu(touchStartX, touchStartY, containerEl, wordEl, istiazahEl, bismillahEl);
                    }
                }, 700); // 700ms ضغطة مطولة لتجنب التداخل مع التمرير
            }
        }, { passive: true });

        area.addEventListener('touchend', () => {
            clearTimeout(this.longPressTimer);
        });

        area.addEventListener('touchmove', (e) => {
            touchCurrentX = e.touches[0].clientX;
            touchCurrentY = e.touches[0].clientY;
            const moveDist = Math.hypot(touchCurrentX - touchStartX, touchCurrentY - touchStartY);
            if (moveDist > 15) {
                clearTimeout(this.longPressTimer);
            }
        });

        // إغلاق القائمة عند النقر في أي مكان آخر
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#ayahContextMenu')) {
                this._hideMenu();
            }
        });
    },

    _showMenu(x, y, containerEl, wordEl, istiazahEl, bismillahEl) {
        const menu = document.getElementById('ayahContextMenu');
        if (!menu) return;

        const ctxPlay = document.getElementById('ctxPlay');
        const ctxSearch = document.getElementById('ctxSearch');
        const ctxTag = document.getElementById('ctxTag');
        const ctxWordQeraat = document.getElementById('ctxWordQeraat');
        const ctxWordMeaning = document.getElementById('ctxWordMeaning');
        const ctxAyahTafsir = document.getElementById('ctxAyahTafsir');
        const ctxCopyAya = document.getElementById('ctxCopyAya');

        // إعادة عرض الأزرار كالعادة
        if (ctxPlay) ctxPlay.style.display = 'flex';
        if (ctxSearch) ctxSearch.style.display = 'flex';
        if (ctxTag) ctxTag.style.display = 'flex';
        if (ctxCopyAya) ctxCopyAya.style.display = 'flex';
        if (ctxWordQeraat) ctxWordQeraat.style.display = 'none';
        if (ctxWordMeaning) ctxWordMeaning.style.display = 'none';
        if (ctxAyahTafsir) ctxAyahTafsir.style.display = 'none';

        if (istiazahEl) {
            this.selectedAyah = null;
            this.selectedWord = "";
            this.selectedWordNo = null;
            this.contextType = "istiazah";
            this.isAyahNumWord = false;
            if (ctxSearch) ctxSearch.style.display = 'none';
            if (ctxTag) ctxTag.style.display = 'none';
            if (ctxCopyAya) ctxCopyAya.style.display = 'none';
            if (ctxPlay) ctxPlay.innerHTML = '<i class="fas fa-play"></i> استماع للاستعاذة';
        } else if (bismillahEl) {
            const fullList = DataHandler.cache[App.currentReading];
            const basAyah = fullList ? fullList.find(a => a.sura_no === 1 && a.aya_no === 1) : null;
            this.selectedAyah = basAyah;
            this.selectedWord = wordEl ? wordEl.textContent.trim().replace(/[ۖۚۛۗۘ]/g, "") : "";
            this.selectedWordNo = wordEl ? parseInt(wordEl.dataset.wordIdx) : null;
            this.contextType = "bismillah";
            this.isAyahNumWord = false;
            if (ctxSearch) ctxSearch.style.display = 'none';
            if (ctxTag) ctxTag.style.display = 'none';
            if (ctxCopyAya) ctxCopyAya.style.display = 'none';
            if (ctxPlay) ctxPlay.innerHTML = '<i class="fas fa-play"></i> استماع للبسملة';
            if (wordEl && basAyah) {
                if (ctxWordQeraat) ctxWordQeraat.style.display = 'flex';
                const isHafs = App.currentReading && (App.currentReading.toLowerCase().includes('hafs') || App.currentReading.toLowerCase().includes('shubah'));
                if (isHafs && ctxWordMeaning) ctxWordMeaning.style.display = 'flex';
            }
        } else if (containerEl) {
            const suraNo = parseInt(containerEl.dataset.surah);
            const ayaNo = parseInt(containerEl.dataset.ayah || containerEl.dataset.no);
            const fullList = DataHandler.cache[App.currentReading];
            const ayah = fullList ? fullList.find(a => a.sura_no === suraNo && a.aya_no === ayaNo) : null;
            if (!ayah) return;

            this.selectedAyah = ayah;
            this.selectedWord = wordEl ? wordEl.textContent.trim().replace(/[ۖۚۛۗۘ]/g, "") : "";
            this.selectedWordNo = wordEl ? parseInt(wordEl.dataset.wordIdx) : null;
            this.contextType = "ayah";

            if (ctxPlay) ctxPlay.innerHTML = `<i class="fas fa-play"></i> استماع للآية ${ayaNo}`;
            if (!wordEl && ctxSearch) ctxSearch.style.display = 'none';
            
            // API Features - Hide them if clicking on the ayah number glyph/badge
            const isAyahNumWord = wordEl && wordEl.dataset.isAyahNumber === "true";
            this.isAyahNumWord = isAyahNumWord;
            if (isAyahNumWord) {
                if (ctxAyahTafsir) ctxAyahTafsir.style.display = 'none';
                if (ctxWordQeraat) ctxWordQeraat.style.display = 'none';
                if (ctxWordMeaning) ctxWordMeaning.style.display = 'none';
            } else {
                if (ctxAyahTafsir) ctxAyahTafsir.style.display = 'flex';
                if (wordEl) {
                    if (ctxWordQeraat) ctxWordQeraat.style.display = 'flex';
                    const isHafs = App.currentReading && (App.currentReading.toLowerCase().includes('hafs') || App.currentReading.toLowerCase().includes('shubah'));
                    if (isHafs && ctxWordMeaning) ctxWordMeaning.style.display = 'flex';
                }
            }
        } else {
            return;
        }

        // موضع القائمة — تظهر قرب الإصبع/المؤشر وتُقلَب للأعلى عند قرب أسفل الشاشة
        menu.style.display = 'block';
        const rect = menu.getBoundingClientRect();
        const menuWidth = rect.width || 180;
        const menuHeight = rect.height || 250;
        const pad = 10;
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        let posX = x;
        let posY = y;

        if (posX + menuWidth > screenWidth - pad) posX = screenWidth - menuWidth - pad;
        if (posX < pad) posX = pad;

        if (posY + menuHeight > screenHeight - pad) {
            posY = y - menuHeight;
        }

        if (posY < pad) posY = pad;

        const maxMenuHeight = screenHeight - (pad * 2);
        if (menuHeight > maxMenuHeight) {
            menu.style.height = `${maxMenuHeight}px`;
            menu.style.overflowY = 'auto';
        } else {
            menu.style.height = 'auto';
            menu.style.overflowY = 'visible';
            if (posY + menuHeight > screenHeight - pad) {
                posY = screenHeight - menuHeight - pad;
            }
        }

        menu.style.left = `${posX}px`;
        menu.style.top = `${posY}px`;

        this._menuOpenedAt = Date.now();
        this._isMenuJustOpened = true;
        setTimeout(() => {
            this._isMenuJustOpened = false;
        }, 700);
    },

    _hideMenu() {
        const menu = document.getElementById('ayahContextMenu');
        if (menu) menu.style.display = 'none';
    },

    _bindModalActions() {
        // زر تشغيل الصوت من القائمة المنبثقة
        const btnPlay = document.getElementById('ctxPlay');
        if (btnPlay) {
            btnPlay.onclick = (e) => {
                if (this._isMenuJustOpened) { e.preventDefault(); return; }
                if (typeof AudioPlayer !== 'undefined' && AudioPlayer.isAudioFetching()) {
                    AudioPlayer.stop();
                    this._hideMenu();
                    return;
                }
                this._hideMenu();
                if (this.contextType === "istiazah") {
                    AudioPlayer.playIstiazah();
                } else if (this.contextType === "bismillah") {
                    AudioPlayer.playBasmalah();
                } else if (this.contextType === "ayah" && this.selectedAyah) {
                    AudioPlayer.playAyah(this.selectedAyah.aya_no, this.selectedAyah.sura_no);
                }
            };
        }

        // زر نسخ الآية
        const ctxCopyAya = document.getElementById('ctxCopyAya');
        if (ctxCopyAya) {
            ctxCopyAya.onclick = (e) => {
                if (this._isMenuJustOpened) { e.preventDefault(); return; }
                this._hideMenu();
                if (this.selectedAyah) {
                    const text = this.selectedAyah.aya_text_emlaey || this.selectedAyah.aya_text;
                    navigator.clipboard.writeText(text).then(() => {
                        const originalHtml = ctxCopyAya.innerHTML;
                        ctxCopyAya.innerHTML = '<i class="fas fa-check"></i> تم النسخ!';
                        ctxCopyAya.style.color = '#10b981';
                        ctxCopyAya.style.display = 'flex';
                        const menu = document.getElementById('ayahContextMenu');
                        if (menu) menu.style.display = 'block';
                        setTimeout(() => {
                            ctxCopyAya.innerHTML = originalHtml;
                            ctxCopyAya.style.color = '';
                            this._hideMenu();
                        }, 1000);
                    }).catch(e => console.error('Copy failed', e));
                }
            };
        }

        // زر بحث المتشابهات من القائمة المنبثقة
        const btnSearch = document.getElementById('ctxSearch');
        if (btnSearch) {
            btnSearch.onclick = (e) => {
                if (this._isMenuJustOpened) { e.preventDefault(); return; }
                this._hideMenu();
                this.promptSearchOptions();
            };
        }

        // زر وسم علامة خاصة من القائمة المنبثقة
        const btnTag = document.getElementById('ctxTag');
        if (btnTag) {
            btnTag.onclick = (e) => {
                if (this._isMenuJustOpened) { e.preventDefault(); return; }
                this._hideMenu();
                this.populateTagModalDropdown();
                const modal = document.getElementById('tagInputModal');
                if (modal) modal.classList.add('active');
            };
        }

        // حفظ العلامة المرجعية
        const saveBtn = document.getElementById('saveTagBtn');
        if (saveBtn) {
            saveBtn.onclick = () => {
                const select = document.getElementById('existingTagsSelect');
                let tagName = "";
                if (select && select.value !== 'new') {
                    tagName = select.value.trim();
                } else {
                    const textInput = document.getElementById('tagText');
                    tagName = textInput ? textInput.value.trim() : "";
                }

                if (!tagName) return;

                this.addTag(tagName);
                const modal = document.getElementById('tagInputModal');
                if (modal) modal.classList.remove('active');
            };
        }

        // إغلاق نافذة API
        const modal = document.getElementById('apiInfoModal');
        if (modal) {
            const closeBtn = modal.querySelector('.close-modal');
            if (closeBtn) {
                closeBtn.onclick = () => modal.classList.remove('active');
            }
        }

        // أزرار API
        const ctxWordQeraat = document.getElementById('ctxWordQeraat');
        if (ctxWordQeraat) {
            ctxWordQeraat.onclick = (e) => {
                if (this._isMenuJustOpened) { e.preventDefault(); return; }
                this._hideMenu();
                if (this.selectedAyah && this.selectedWordNo) {
                    this.showWordQeraat(this.selectedAyah.sura_no, this.selectedAyah.aya_no, this.selectedWordNo);
                }
            };
        }

        const ctxWordMeaning = document.getElementById('ctxWordMeaning');
        if (ctxWordMeaning) {
            ctxWordMeaning.onclick = (e) => {
                if (this._isMenuJustOpened) { e.preventDefault(); return; }
                this._hideMenu();
                if (this.selectedAyah && this.selectedWordNo) {
                    this.showWordMeaningAndEerab(this.selectedAyah.sura_no, this.selectedAyah.aya_no, this.selectedWordNo);
                }
            };
        }

        const ctxAyahTafsir = document.getElementById('ctxAyahTafsir');
        if (ctxAyahTafsir) {
            ctxAyahTafsir.onclick = (e) => {
                if (this._isMenuJustOpened) { e.preventDefault(); return; }
                this._hideMenu();
                if (this.selectedAyah) {
                    this.showAyahTafsir(this.selectedAyah.sura_no, this.selectedAyah.aya_no);
                }
            };
        }
    },

    openApiModal(title, htmlContent, showWarning = false) {
        const modal = document.getElementById('apiInfoModal');
        const titleEl = document.getElementById('apiInfoTitle');
        const contentEl = document.getElementById('apiInfoContent');
        const warningEl = document.getElementById('apiInfoWarning');
        
        if (!modal || !titleEl || !contentEl) return;

        titleEl.textContent = title;
        contentEl.innerHTML = htmlContent;
        if (warningEl) {
            warningEl.style.display = showWarning ? 'block' : 'none';
        }

        modal.classList.add('active');
    },

    async showWordQeraat(suraNo, ayaNo, wordNo) {
        this.openApiModal('اختلافات القراءات للكلمة', '<div class="loader">جاري جلب القراءات...</div>');
        const data = await SurahAPI.getWordQeraat(suraNo, ayaNo, wordNo);
        if (data.error || !data.content) {
            this.openApiModal('اختلافات القراءات للكلمة', '<p>لم يرد في هذه الكلمة خلاف بين القراء.</p>');
            return;
        }
        
        let qeraatHtml = '';
        if (data.content.includes('@')) {
            const parts = data.content.split('@').filter(p => p.trim() !== '');
            qeraatHtml = parts.map(item => {
                const [reader, desc] = item.split('/');
                return `
                <div style="margin-bottom: 15px; padding: 10px; background: rgba(6,78,59,0.05); border-radius: 8px; border-right: 4px solid var(--primary);">
                    <strong style="color: var(--primary);">${reader}:</strong>
                    <p style="margin: 5px 0 0 0;">${desc ? desc.replace(/\n/g, '<br>') : ''}</p>
                </div>
                `;
            }).join('');
        } else {
            qeraatHtml = `<div style="margin-bottom: 15px; padding: 10px; background: rgba(6,78,59,0.05); border-radius: 8px; border-right: 4px solid var(--primary);"><p>${data.content.replace(/\n/g, '<br>')}</p></div>`;
        }

        this.openApiModal('اختلافات القراءات للكلمة', qeraatHtml);
    },

    _formatContentWithFootnotes(text) {
        if (!text) return '';
        const footnotes = [];
        let html = text.replace(/\n/g, '<br>');
        
        const scopeId = Math.random().toString(36).substring(2, 7);
        
        // Match references inside brackets, or native API footnote symbols (¬ ... ¥), or as sentences ending with a period
        const regex = /(?:¬[^¥]*¥|\([^)]*(?:[أا]خرجه|[اأ]نظر|رواه|متفق)[^)]*\)|\[[^\]]*(?:[أا]خرجه|[اأ]نظر|رواه|متفق)[^\]]*\]|(?:[أا]خرجه|[اأ]نظر|رواه|متفق)[^.؛<]*(?:[.؛]|$))/g;
        html = html.replace(regex, (match) => {
            footnotes.push(match.replace(/<br>/g, ' '));
            const fnIdx = footnotes.length;
            return `<sup id="fn-ref-${scopeId}-${fnIdx}" onclick="document.getElementById('fn-text-${scopeId}-${fnIdx}').scrollIntoView({behavior: 'smooth', block: 'center'})" style="color:var(--primary);cursor:pointer;font-weight:bold;margin:0 2px; text-decoration: underline;" title="${match.replace(/"/g, '&quot;')}">[${fnIdx}]</sup>`;
        });
        
        if (footnotes.length > 0) {
            html += `<div class="footnote-section" style="margin-top: 15px; padding-top: 10px; border-top: 1px dashed #ccc; font-size: 0.85rem; display: flex; flex-wrap: wrap; gap: 8px;">`;
            footnotes.forEach((fn, idx) => {
                // Remove ¬ and ¥ from the final displayed text
                const cleanFn = fn.replace(/[¬¥]/g, '');
                html += `<div id="fn-text-${scopeId}-${idx + 1}" class="footnote-item"><span style="color:var(--primary); font-weight:bold;">[${idx + 1}]</span> ${cleanFn}</div>`;
            });
            html += `</div>`;
        }
        return html;
    },

    async showWordMeaningAndEerab(suraNo, ayaNo, wordNo) {
        const wordText = this.selectedWord || '';
        const headerHtml = wordText ? `<blockquote class="quran-text" style="border-right: 4px solid var(--primary); padding-right: 15px; margin: 0 0 15px 0; background: rgba(16, 185, 129, 0.05); padding: 15px; font-size: 1.8rem; text-align: center; color: var(--primary);">"${wordText}"</blockquote>` : '';
        const loaderHtml = headerHtml + '<div style="text-align:center;padding:20px;"><div class="inline-loader"></div> جاري جلب المعلومات...</div>';

        
        this.openApiModal('معنى وإعراب الكلمة', loaderHtml, true);
        
        const [meaning, eerab, tasreef] = await Promise.all([
            SurahAPI.getWordMeaningOld(suraNo, ayaNo, wordNo),
            SurahAPI.getWordEerab(suraNo, ayaNo, wordNo),
            SurahAPI.getWordTasreef(suraNo, ayaNo, wordNo)
        ]);

        const tabs = [
            { id: 'w_meaning', label: 'المعنى', content: this._formatContentWithFootnotes(meaning?.content) },
            { id: 'w_eerab', label: 'الإعراب', content: this._formatContentWithFootnotes(eerab?.content) },
            { id: 'w_tasreef', label: 'التصريف', content: this._formatContentWithFootnotes(tasreef?.content) }
        ];

        let tabsHtml = `<div class="api-tabs" style="display:flex; gap:10px; overflow-x:auto; padding-bottom:10px; margin-bottom:15px;">`;
        tabs.forEach((t, i) => {
            tabsHtml += `<button class="api-tab-btn ${i===0?'active':''}" onclick="switchApiTab('${t.id}', this)">${t.label}</button>`;
        });
        tabsHtml += `</div>`;
        
        let contentHtml = '';
        tabs.forEach((t, i) => {
            contentHtml += `<div id="${t.id}" class="api-tab-content" style="display:${i===0?'block':'none'}">
                ${t.content || '<p>المعلومات غير متوفرة لهذه الكلمة.</p>'}
            </div>`;
        });

        // أزرار التنقل بين الكلمات
        let navHtml = `<div style="display: flex; justify-content: space-between; margin-top: 20px; border-top: 1px solid var(--border); padding-top: 15px;">`;
        navHtml += `<button class="btn btn-secondary btn-sm" onclick="TagsAndContext.navigateWordApi('prev', ${suraNo}, ${ayaNo}, ${wordNo})"><i class="fas fa-chevron-right"></i> الكلمة السابقة</button>`;
        navHtml += `<button class="btn btn-secondary btn-sm" onclick="TagsAndContext.navigateWordApi('next', ${suraNo}, ${ayaNo}, ${wordNo})">الكلمة التالية <i class="fas fa-chevron-left"></i></button>`;
        navHtml += `</div>`;

        this.openApiModal('معنى وإعراب الكلمة', headerHtml + tabsHtml + contentHtml + navHtml, true);
    },

    navigateWordApi(dir, suraNo, ayaNo, wordNo) {
        let newWordNo = wordNo;
        let newAyaNo = ayaNo;
        let newSuraNo = suraNo;
        
        const allData = DataHandler.cache[App.currentReading];
        if (!allData) return;
        const currentAyaObj = allData.find(a => a.sura_no === suraNo && a.aya_no === ayaNo);
        if (!currentAyaObj) return;

        const maxWords = currentAyaObj.aya_text.trim().split(/\s+/).length;

        if (dir === 'next') {
            if (wordNo < maxWords) {
                newWordNo = wordNo + 1;
            } else {
                this.navigateAyahTafsir('next', suraNo, ayaNo);
                return;
            }
        } else {
            if (wordNo > 1) {
                newWordNo = wordNo - 1;
            } else {
                this.navigateAyahTafsir('prev', suraNo, ayaNo);
                return;
            }
        }
        
        // استنتاج نص الكلمة الجديدة
        const wordsArr = currentAyaObj.aya_text.trim().split(/\s+/);
        this.selectedWord = wordsArr[newWordNo - 1]?.replace(/[ۖۚۛۗۘ]/g, "") || "";
        this.selectedWordNo = newWordNo;
        
        this.showWordMeaningAndEerab(newSuraNo, newAyaNo, newWordNo);
    },

    async showAyahTafsir(suraNo, ayaNo) {
        const ayahObj = this.selectedAyah;
        const config = READINGS_CONFIG[App.currentReading] || { fontFamily: 'UthmanicHafs' };
        // Use the native text and native Uthmani font. We no longer strip characters because we preloaded the fonts.
        const ayahTextHtml = ayahObj ? `<blockquote class="quran-text" style="border-right: 4px solid var(--primary); padding-right: 15px; margin: 0 0 15px 0; background: rgba(16, 185, 129, 0.05); padding: 15px; font-size: 1.8rem; line-height: 2; font-family: ${config.fontFamily};">${ayahObj.aya_text} <span class="aya-number" style="color:#064e3b; font-size: 1.6rem;">﴿${ayahObj.aya_no}﴾</span></blockquote>` : '';
        const loaderHtml = ayahTextHtml + '<div style="text-align:center;padding:20px;"><div class="inline-loader"></div> جاري جلب التفاسير...</div>';
        
        this.openApiModal(`تفاسير الآية ${ayaNo}`, loaderHtml, true);
        
        const isHafs = App.currentReading && (App.currentReading.toLowerCase().includes('hafs') || App.currentReading.toLowerCase().includes('shubah'));
        
        let tafsirAyaNo = ayaNo;
        if (parseInt(suraNo) === 1 && !isHafs) {
            const aNo = parseInt(ayaNo);
            if (aNo >= 1 && aNo <= 5) tafsirAyaNo = aNo + 1;
            else if (aNo === 6 || aNo === 7) tafsirAyaNo = 7;
        }
        
        const promises = [
            SurahAPI.getAyaTafsirMokhtasar(suraNo, tafsirAyaNo),
            SurahAPI.fetchWithCache(`/aya/tafsir-katheer/${suraNo}/${tafsirAyaNo}`),
            SurahAPI.fetchWithCache(`/aya/tafsir-saadi/${suraNo}/${tafsirAyaNo}`),
            SurahAPI.fetchWithCache(`/aya/tafsir-tabary/${suraNo}/${tafsirAyaNo}`),
            SurahAPI.fetchWithCache(`/aya/tafsir-baghawy/${suraNo}/${tafsirAyaNo}`)
        ];
        
        if (isHafs) {
            promises.push(SurahAPI.getAyaTajweed(suraNo, ayaNo));
            promises.push(SurahAPI.getAyaEerab(suraNo, ayaNo));
        }

        const results = await Promise.all(promises);
        
        const tabs = [
            { id: 't_mokhtasar', label: 'التفسير الميسر', content: this._formatContentWithFootnotes(results[0]?.content) },
            { id: 't_saadi', label: 'السعدي', content: this._formatContentWithFootnotes(results[2]?.content) },
            { id: 't_katheer', label: 'ابن كثير', content: this._formatContentWithFootnotes(results[1]?.content) },
            { id: 't_tabary', label: 'الطبري', content: this._formatContentWithFootnotes(results[3]?.content) },
            { id: 't_baghawy', label: 'البغوي', content: this._formatContentWithFootnotes(results[4]?.content) }
        ];
        
        if (isHafs) {
            tabs.push({ id: 't_tajweed', label: 'التجويد', content: this._formatContentWithFootnotes(results[5]?.content) });
            tabs.push({ id: 't_eerab', label: 'الإعراب', content: this._formatContentWithFootnotes(results[6]?.content) });
        }

        let tabsHtml = `<div class="api-tabs" style="display:flex; gap:10px; overflow-x:auto; padding-bottom:10px; margin-bottom:15px; white-space:nowrap;">`;
        tabs.forEach((t, i) => {
            tabsHtml += `<button class="api-tab-btn ${i===0?'active':''}" onclick="switchApiTab('${t.id}', this)">${t.label}</button>`;
        });
        tabsHtml += `</div>`;
        
        let contentHtml = '';
        tabs.forEach((t, i) => {
            contentHtml += `<div id="${t.id}" class="api-tab-content" style="display:${i===0?'block':'none'}">
                ${t.content || '<p>المعلومات غير متوفرة لهذا التفسير.</p>'}
            </div>`;
        });

        // أزرار التنقل بين الآيات
        let navHtml = `<div style="display: flex; justify-content: space-between; margin-top: 20px; border-top: 1px solid var(--border); padding-top: 15px;">`;
        navHtml += `<button class="btn btn-secondary btn-sm" onclick="TagsAndContext.navigateAyahTafsir('prev', ${suraNo}, ${ayaNo})"><i class="fas fa-chevron-right"></i> الآية السابقة</button>`;
        navHtml += `<button class="btn btn-secondary btn-sm" onclick="TagsAndContext.navigateAyahTafsir('next', ${suraNo}, ${ayaNo})">الآية التالية <i class="fas fa-chevron-left"></i></button>`;
        navHtml += `</div>`;

        this.openApiModal(`تفاسير الآية ${ayaNo}`, ayahTextHtml + tabsHtml + contentHtml + navHtml, true);
    },

    navigateAyahTafsir(dir, suraNo, ayaNo) {
        let newSura = suraNo;
        let newAya = ayaNo;
        const allData = DataHandler.cache[App.currentReading];
        if (!allData) return;
        
        if (dir === 'next') {
            const next = allData.find(a => (a.sura_no === suraNo && a.aya_no === ayaNo + 1) || (a.sura_no === suraNo + 1 && a.aya_no === 1));
            if (next) { newSura = next.sura_no; newAya = next.aya_no; this.selectedAyah = next; }
        } else {
            if (ayaNo > 1) {
                const prev = allData.find(a => a.sura_no === suraNo && a.aya_no === ayaNo - 1);
                if (prev) { newSura = prev.sura_no; newAya = prev.aya_no; this.selectedAyah = prev; }
            } else if (suraNo > 1) {
                const prevSuraAyahs = allData.filter(a => a.sura_no === suraNo - 1);
                if (prevSuraAyahs.length > 0) {
                    const lastAya = prevSuraAyahs[prevSuraAyahs.length - 1];
                    newSura = lastAya.sura_no; newAya = lastAya.aya_no; this.selectedAyah = lastAya;
                }
            }
        }
        if (newSura !== suraNo || newAya !== ayaNo) {
            this.showAyahTafsir(newSura, newAya);
        }
    },

    populateTagModalDropdown() {
        const select = document.getElementById('existingTagsSelect');
        const wrapper = document.getElementById('newTagInputWrapper');
        const textInput = document.getElementById('tagText');
        if (!select) return;

        // تفريغ المدخلات
        if (textInput) textInput.value = '';
        if (wrapper) wrapper.style.display = 'block';

        // قراءة كافة العلامات الفريدة المخزنة
        const tags = this.getTags();
        const uniqueNames = [...new Set(tags.map(t => t.tagName))].filter(Boolean);

        select.innerHTML = '<option value="new">--- كتابة علامة جديدة ---</option>';
        uniqueNames.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            select.appendChild(opt);
        });

        select.onchange = () => {
            if (select.value === 'new') {
                if (wrapper) wrapper.style.display = 'block';
            } else {
                if (wrapper) wrapper.style.display = 'none';
            }
        };
    },

    // تنظيف رقم الآية من نهاية النص لضمان تطابق المتشابهات بين السور والقراءات
    stripAyahNumber(text) {
        if (!text) return "";
        const words = text.trim().split(/\s+/);
        if (words.length > 1) {
            words.pop(); // حذف الكلمة الأخيرة التي تمثل رقم الآية بالخط العثماني
        }
        return words.join(" ");
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

        const showWordSearch = word && !this.isAyahNumWord;

        meta.innerHTML = `البحث عن مواضع التكرار والمتشابهات`;
        list.innerHTML = `
            <div class="d-flex flex-column gap-2">
                ${showWordSearch ? `<button id="searchWordBtn" class="btn btn-primary w-100"><i class="fas fa-font"></i> بحث عن كلمة "${word}"</button>` : ''}
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
                    // تنظيف النص من رقم الآية العثماني للحصول على الكلمات فقط
                    const strippedText = this.stripAyahNumber(ayah.aya_text);
                    this.executeSearch(strippedText, 'ayah');
                };
            }
        }, 50);
    },

    // تنظيف الحركات والرموز القرآنية
    normalizeText(txt) {
        if (!txt) return "";
        return txt
            .replace(/\u0670/g, "ا")             // تحويل الألف الخنجرية لألف عادية أولاً لضمان التمييز
            .replace(/[^\u0621-\u064A\s]/g, "")
            .replace(/[أإآٱ]/g, "ا")
            .replace(/ة/g, "ه")
            .replace(/[ىي]/g, "ي")
            .replace(/ؤ/g, "و")
            .replace(/\s+/g, " ")
            .trim();
    },

    isWordMatch(cleanText, cleanQuery) {
        if (!cleanText || !cleanQuery) return false;
        const textWords = cleanText.split(' ');
        const queryWords = cleanQuery.split(' ');
        if (queryWords.length === 0) return false;
        
        for (let i = 0; i <= textWords.length - queryWords.length; i++) {
            let match = true;
            for (let j = 0; j < queryWords.length; j++) {
                if (textWords[i + j] !== queryWords[j]) {
                    match = false;
                    break;
                }
            }
            if (match) return true;
        }
        return false;
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
        // البحث فقط بالقراءة المحددة حالياً مع تنظيف الآيات المقارنة من أرقام الآيات لتفادي التداخل
        const matches = allAyahs.filter(a => {
            const strippedText = this.stripAyahNumber(a.aya_text);
            const cleanText = this.normalizeText(strippedText);
            if (mode === 'word') {
                return this.isWordMatch(cleanText, cleanQuery);
            } else {
                return cleanText.includes(cleanQuery);
            }
        });

        meta.innerHTML = `مواضع متشابهات: "${queryText}" (${matches.length} موضع)`;

        if (matches.length === 0) {
            list.innerHTML = `<div class="no-tags-text p-3">لم يتم العثور على مواضع مطابقة.</div>`;
            return;
        }

        const uthmaniFont = READINGS_CONFIG[App.currentReading]?.fontFamily || 'serif';

        list.innerHTML = matches.map(m => {
            const isSelf = m.sura_no === this.selectedAyah.sura_no && m.aya_no === this.selectedAyah.aya_no;
            // الآية تأتي برقمها الأصلي المدمج بالخط العثماني، لا حاجة لإضافة وسم إضافي مكرر
            return `
                <div class="search-item" style="${isSelf ? 'border-right: 3px solid var(--primary); background: rgba(6, 78, 59, 0.04);' : ''}">
                    <p style="font-size: 1.3rem; line-height: 2; direction: rtl; text-align: right; font-family: '${uthmaniFont}', sans-serif;">${m.aya_text}</p>
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
