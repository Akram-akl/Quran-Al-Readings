/**
 * search.js - محرك البحث الشامل والمقارن بين الروايات مع دعم فروق الآيات والتطابق اللغوي
 */
const Search = {
    init() {
        const input = document.getElementById('searchInput');
        const btn = document.getElementById('searchBtn');

        // Bindings are now handled in ui.js depending on the button clicked
    },

    normalizeArabic(text) {
        if (!text) return "";
        return text
            .replace(/\u0670/g, "ا")             // تحويل الألف الخنجرية لألف عادية أولاً لضمان التمييز
            .replace(/[\u064B-\u065F]/g, "")     // إزالة باقي الحركات والتنوين والشدة والمدة
            .replace(/[أإآٱ]/g, "ا")             // توحيد الألف
            .replace(/ة/g, "ه")                  // توحيد التاء المربوطة والهاء
            .replace(/[ىي]/g, "ي")                  // توحيد الألف المقصورة والياء
            .replace(/ؤ/g, "و")                  // توحيد الواو
            .replace(/[^\u0621-\u064A\s]/g, "")  // إزالة علامات الوقف والرموز الخاصة مع إبقاء المسافة
            .replace(/\s+/g, " ")                // دمج المسافات
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

    getHafsAyaNo(readingKey, suraNo, ayaNo) {
        let base = readingKey.toLowerCase();
        if (base.startsWith('hafs')) return ayaNo;
        if (base.startsWith('shubah')) return ayaNo;
        if (base.startsWith('warsh')) base = 'warsh';
        if (base.startsWith('qaloun')) base = 'qaloun';
        if (base.startsWith('duri')) base = 'duri';
        if (base.startsWith('susi')) base = 'susi';

        if (typeof AUDIO_MAP !== 'undefined' && AUDIO_MAP[base]) {
            const suraMap = AUDIO_MAP[base][suraNo];
            if (suraMap && suraMap[ayaNo]) {
                return suraMap[ayaNo][0] || ayaNo;
            }
        }
        return ayaNo;
    },

    async performSearch(query, currentReadingOnly = false) {
        if (!query || query.trim().length < 2) return;

        const resultsArea = document.getElementById('searchResults');
        if (resultsArea) resultsArea.innerHTML = currentReadingOnly 
            ? '<div class="loader"><i class="fas fa-spinner fa-spin"></i> جاري البحث في الرواية الحالية...</div>'
            : '<div class="loader"><i class="fas fa-spinner fa-spin"></i> جاري البحث مقارنة بين الروايات الستة...</div>';
        
        const modal = document.getElementById('searchModal');
        if (modal) {
            const titleEl = modal.querySelector('h2');
            if (titleEl) {
                titleEl.textContent = currentReadingOnly ? 'بحث في الرواية الحالية' : 'بحث في جميع القراءات';
            }
            modal.classList.add('active');
        }

        const normQuery = this.normalizeArabic(query);
        const grouped = {};

        // البحث بالاعتماد على النسخة المحددة والنشطة للمستخدم
        const activeHafs = App.currentReading.startsWith('Hafs') ? App.currentReading : 'HafsHussary';
        const activeWarsh = App.currentReading.startsWith('Warsh') ? App.currentReading : 'WarshHussary';
        const activeQaloun = App.currentReading.startsWith('Qaloun') ? App.currentReading : 'Qaloun';
        let readings = [activeHafs, activeWarsh, activeQaloun, 'Duri', 'Susi', 'Shubah'];
        
        if (currentReadingOnly) {
            readings = [App.currentReading];
        }

        // البحث المتوازي عبر كافة القراءات المتوفرة
        for (const key of readings) {
            try {
                const data = await DataHandler.loadReading(key);
                const matches = data.filter(a => {
                    const normEmlaey = this.normalizeArabic(a.aya_text_emlaey);
                    const normText = this.normalizeArabic(a.aya_text);
                    return this.isWordMatch(normEmlaey, normQuery) || this.isWordMatch(normText, normQuery);
                });

                matches.forEach(m => {
                    // ترجمة رقم الآية لرقم حفص الموحد وتجميعهم بناءً عليه
                    const hafsAya = this.getHafsAyaNo(key, m.sura_no, m.aya_no);
                    const mapKey = `${m.sura_no}:${hafsAya}`;

                    if (!grouped[mapKey]) {
                        grouped[mapKey] = {
                            sura_no: m.sura_no,
                            sura_name_ar: m.sura_name_ar,
                            variants: []
                        };
                    }

                    // إضافة الرواية كصيغة متوفرة لهذه الآية
                    grouped[mapKey].variants.push({
                        readingKey: key,
                        readingName: READINGS_CONFIG[key].name,
                        aya_no: m.aya_no,
                        aya_text: m.aya_text,
                        page: m.page
                    });
                });
            } catch (e) { 
                console.error("Search error in " + key, e); 
            }
        }

        // تحويل المجموعات لمصفوفة مرتبة حسب ترتيب السور
        const resultsArray = Object.values(grouped).sort((a, b) => {
            return a.sura_no - b.sura_no;
        });

        this.renderResults(resultsArray, !currentReadingOnly);
    },

    renderResults(results, isComparative) {
        const area = document.getElementById('searchResults');
        if (!area) return;
        area.innerHTML = '';

        if (results.length === 0) {
            area.innerHTML = '<div class="search-empty" style="text-align: center; padding: 20px; color: var(--text-secondary);">لم يتم العثور على نتائج تطابق هذا البحث</div>';
            return;
        }

        results.forEach(item => {
            const card = document.createElement('div');
            card.className = 'search-item';
            card.style.background = 'var(--bg-glass)';
            card.style.borderRadius = '16px';
            card.style.padding = '20px';
            card.style.marginBottom = '20px';
            card.style.border = '1px solid var(--border)';
            card.style.backdropFilter = 'blur(10px)';
            card.style.boxShadow = '0 8px 32px 0 rgba(31, 38, 135, 0.04)';

            // عنوان السورة
            const metaHeader = document.createElement('div');
            metaHeader.className = 'search-item-meta';
            metaHeader.style.fontWeight = 'bold';
            metaHeader.style.fontSize = '1.1rem';
            metaHeader.style.color = 'var(--primary)';
            metaHeader.style.borderBottom = '1px solid var(--border)';
            metaHeader.style.paddingBottom = '10px';
            metaHeader.style.marginBottom = '15px';
            metaHeader.style.direction = 'rtl';
            metaHeader.textContent = `سورة ${item.sura_name_ar}`;
            card.appendChild(metaHeader);

            // عرض الصيغ المتوفرة جنباً إلى جنب بداخل نفس الكارت
            item.variants.forEach((v, vIdx) => {
                const variantDiv = document.createElement('div');
                variantDiv.className = 'search-variant';
                variantDiv.style.display = 'flex';
                variantDiv.style.alignItems = 'center';
                variantDiv.style.justifyContent = 'space-between';
                variantDiv.style.gap = '15px';
                variantDiv.style.paddingBottom = '12px';
                variantDiv.style.marginBottom = '12px';
                variantDiv.style.direction = 'rtl';
                variantDiv.style.flexDirection = 'column';
                variantDiv.style.alignItems = 'stretch';
                // إضافة فاصل مرئي بين كل آية والتي تليها
                if (vIdx < item.variants.length - 1) {
                    variantDiv.style.borderBottom = '1px solid var(--border)';
                }
                
                if (isComparative) {
                    variantDiv.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; gap: 8px; flex-wrap: wrap;">
                            <span style="font-size: 0.8rem; background: var(--primary); color: white; padding: 4px 10px; border-radius: 8px; font-weight: bold; flex-shrink: 0;">
                                ${v.readingName} (آية ${v.aya_no})
                            </span>
                        <button class="btn btn-primary btn-sm" style="padding: 6px 16px; font-size: 0.85rem; border-radius: 8px; cursor: pointer; border: none; background: var(--primary); color: white; font-weight: bold; flex-shrink: 0;" onclick="Search.goTo('${v.readingKey}', ${v.page}, ${v.aya_no}, ${item.sura_no})">
                            <i class="fas fa-location-arrow"></i> انتقال
                        </button>
                        </div>
                        <div class="search-variant-text" style="font-size: 1.35rem; font-family: ${READINGS_CONFIG[v.readingKey].fontFamily}; color: var(--text);">
                            ${v.aya_text}
                        </div>
                    `;
                } else {
                    variantDiv.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; gap: 8px; flex-wrap: wrap;">
                            <span style="font-size: 0.8rem; background: var(--secondary); color: white; padding: 4px 10px; border-radius: 8px; font-weight: bold; flex-shrink: 0;">
                                آية ${v.aya_no}
                            </span>
                            <button class="btn btn-secondary btn-sm" style="padding: 6px 16px; font-size: 0.85rem; border-radius: 8px; cursor: pointer; border: none; font-weight: bold; flex-shrink: 0;" onclick="Search.goTo('${v.readingKey}', ${v.page}, ${v.aya_no}, ${item.sura_no})">
                                <i class="fas fa-location-arrow"></i> انتقال
                            </button>
                        </div>
                        <div class="search-variant-text" style="font-size: 1.35rem; font-family: ${READINGS_CONFIG[v.readingKey].fontFamily}; color: var(--text);">
                            ${v.aya_text}
                        </div>
                    `;
                }
                card.appendChild(variantDiv);
            });

            area.appendChild(card);
        });
    },

    goTo(reading, page, ayah, suraNo) {
        const modal = document.getElementById('searchModal');
        if (modal) modal.classList.remove('active');
        
        // الحفاظ على اختيار المستخدم للقارئ المفضل للرواية النشطة عند الانتقال
        let targetReading = reading;
        const current = App.currentReading;
        if (reading.startsWith('Hafs') && current.startsWith('Hafs')) {
            targetReading = current;
        } else if (reading.startsWith('Warsh') && current.startsWith('Warsh')) {
            targetReading = current;
        } else if (reading.startsWith('Qaloun') && current.startsWith('Qaloun')) {
            targetReading = current;
        }
        
        const readingSelect = document.getElementById('readingSelect');
        if (readingSelect) readingSelect.value = targetReading;
        
        App.currentReading = targetReading;
        App.loadPage(page).then(() => {
            setTimeout(() => {
                const targetSpan = document.querySelector(`.ayah-container[data-ayah="${ayah}"][data-surah="${suraNo}"]`);
                if (targetSpan) {
                    targetSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    targetSpan.style.transition = 'background-color 0.5s';
                    targetSpan.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
                    setTimeout(() => targetSpan.style.backgroundColor = 'transparent', 2500);
                }
            }, 500);
        });
    }
};
