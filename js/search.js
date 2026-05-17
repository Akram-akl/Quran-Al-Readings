/**
 * search.js - محرك البحث الشامل والمقارن بين الروايات
 */
const Search = {
    init() {
        const input = document.getElementById('searchInput');
        const btn = document.getElementById('searchBtn');

        if (btn && input) {
            btn.onclick = () => this.performSearch(input.value);
            input.onkeypress = (e) => {
                if (e.key === 'Enter') this.performSearch(input.value);
            };
        }
    },

    async performSearch(query) {
        if (!query || query.trim().length < 2) return;

        const resultsArea = document.getElementById('searchResults');
        if (resultsArea) resultsArea.innerHTML = '<div class="loader"><i class="fas fa-spinner fa-spin"></i> جاري البحث مقارنة بين الروايات الستة...</div>';
        
        const modal = document.getElementById('searchModal');
        if (modal) modal.classList.add('active');

        const grouped = {};
        // البحث بتمثيل شيخ واحد لكل مصحف (الروايات الستة الفريدة) لمنع التكرار الطفولي للآيات
        const readings = ['HafsHussary', 'WarshHussary', 'Qaloun', 'Duri', 'Susi', 'Shubah'];

        // البحث المتوازي عبر كافة القراءات المتوفرة
        for (const key of readings) {
            try {
                const data = await DataHandler.loadReading(key);
                const matches = data.filter(a => 
                    (a.aya_text_emlaey && a.aya_text_emlaey.includes(query)) || 
                    (a.aya_text && a.aya_text.includes(query))
                );

                matches.forEach(m => {
                    const mapKey = `${m.sura_no}:${m.aya_no}`;
                    if (!grouped[mapKey]) {
                        grouped[mapKey] = {
                            sura_no: m.sura_no,
                            aya_no: m.aya_no,
                            sura_name_ar: m.sura_name_ar,
                            variants: []
                        };
                    }
                    // إضافة الرواية كصيغة متوفرة لهذه الآية لمنع التكرار
                    grouped[mapKey].variants.push({
                        readingKey: key,
                        readingName: READINGS_CONFIG[key].name,
                        aya_text: m.aya_text,
                        page: m.page
                    });
                });
            } catch (e) { 
                console.error("Search error in " + key, e); 
            }
        }

        // تحويل المجموعات لمصفوفة مرتبة حسب ترتيب السور والآيات بالمصحف
        const resultsArray = Object.values(grouped).sort((a, b) => {
            if (a.sura_no !== b.sura_no) return a.sura_no - b.sura_no;
            return a.aya_no - b.aya_no;
        });

        this.renderResults(resultsArray);
    },

    renderResults(results) {
        const area = document.getElementById('searchResults');
        if (!area) return;
        area.innerHTML = '';

        if (results.length === 0) {
            area.innerHTML = '<div class="search-empty" style="text-align: center; padding: 20px;">لم يتم العثور على نتائج تطابق هذا البحث</div>';
            return;
        }

        // رندرة النتائج بطريقة مقارنة عصرية وفاخرة
        results.forEach(item => {
            const card = document.createElement('div');
            card.className = 'search-item';
            card.style.background = 'var(--bg)';
            card.style.borderRadius = '12px';
            card.style.padding = '15px';
            card.style.marginBottom = '15px';
            card.style.border = '1px solid var(--border)';
            card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';

            // عنوان وموقع الآية الموحد
            const metaHeader = document.createElement('div');
            metaHeader.className = 'search-item-meta';
            metaHeader.style.fontWeight = 'bold';
            metaHeader.style.fontSize = '1rem';
            metaHeader.style.color = 'var(--primary)';
            metaHeader.style.borderBottom = '1px solid var(--border)';
            metaHeader.style.paddingBottom = '8px';
            metaHeader.style.marginBottom = '12px';
            metaHeader.style.direction = 'rtl';
            metaHeader.textContent = `سورة ${item.sura_name_ar} (آية ${item.aya_no})`;
            card.appendChild(metaHeader);

            // عرض الصيغ المتوفرة جنباً إلى جنب بداخل نفس الكارت
            item.variants.forEach(v => {
                const variantDiv = document.createElement('div');
                variantDiv.className = 'search-variant';
                variantDiv.style.display = 'flex';
                variantDiv.style.alignItems = 'center';
                variantDiv.style.justifyContent = 'space-between';
                variantDiv.style.gap = '15px';
                variantDiv.style.marginBottom = '10px';
                variantDiv.style.direction = 'rtl';

                variantDiv.innerHTML = `
                    <span style="font-size: 0.8rem; background: var(--primary); color: white; padding: 3px 8px; border-radius: 6px; font-weight: bold; min-width: 140px; text-align: center;">${v.readingName}</span>
                    <span style="flex: 1; text-align: right; font-size: 1.15rem; font-family: ${READINGS_CONFIG[v.readingKey].fontFamily}; color: var(--text);">${v.aya_text}</span>
                    <button class="btn btn-primary btn-sm" style="padding: 4px 12px; font-size: 0.8rem; border-radius: 8px; cursor: pointer;" onclick="Search.goTo('${v.readingKey}', ${v.page}, ${item.aya_no})">انتقال</button>
                `;
                card.appendChild(variantDiv);
            });

            area.appendChild(card);
        });
    },

    goTo(reading, page, ayah) {
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
            setTimeout(() => AudioPlayer.playAyah(ayah), 500);
        });
    }
};
