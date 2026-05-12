/**
 * search.js - محرك البحث عبر الروايات الست
 * يعرض نتائج كل آية مجمّعة بالروايات الست
 */
const SearchEngine = {
    modal: null,
    input: null,
    resultsContainer: null,

    init() {
        this.modal = document.getElementById('searchModal');
        this.input = document.getElementById('searchInput');
        this.resultsContainer = document.getElementById('searchResults');

        document.getElementById('searchBtn').addEventListener('click', () => this.open());
        document.getElementById('doSearchBtn').addEventListener('click', () => this.execute());
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.execute();
        });
        this.modal.querySelector('.close-modal').addEventListener('click', () => this.close());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });
    },

    open() {
        this.modal.classList.add('active');
        this.input.focus();
    },

    close() {
        this.modal.classList.remove('active');
    },

    /** إزالة التشكيل بالكامل من النص */
    _removeDiacritics(text) {
        if (!text) return '';
        // إزالة كل علامات التشكيل العربية
        return text.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u08D3-\u08FF]/g, '');
    },

    async execute() {
        const query = this.input.value.trim();
        if (!query || query.length < 2) return;

        this.resultsContainer.innerHTML = '<div class="loader"><i class="fas fa-spinner fa-spin"></i> جاري البحث في جميع الروايات...</div>';

        // تحميل كل الروايات أولاً (مهم!)
        const loadPromises = Object.keys(READINGS_CONFIG).map(key => DataHandler.loadReading(key));
        await Promise.all(loadPromises);

        const normalizedQuery = this._removeDiacritics(query);

        // البحث في كل رواية وتجميع النتائج حسب (سورة، آية)
        const groupedResults = new Map(); // key: "surah_ayah"

        for (const [key, config] of Object.entries(READINGS_CONFIG)) {
            const data = DataHandler.cache[key];
            if (!data) continue;

            data.forEach(ayah => {
                if (ayah.aya_no === 0) return; // تخطي البسملة

                const normalizedText = this._removeDiacritics(ayah.aya_text || '');
                const normalizedEmlaey = this._removeDiacritics(ayah.aya_text_emlaey || '');

                if (normalizedText.includes(normalizedQuery) || normalizedEmlaey.includes(normalizedQuery)) {
                    const groupKey = `${ayah.sura_no}_${ayah.aya_no}`;
                    if (!groupedResults.has(groupKey)) {
                        groupedResults.set(groupKey, {
                            surahNo: ayah.sura_no,
                            ayahNo: ayah.aya_no,
                            surahName: ayah.sura_name_ar,
                            readings: []
                        });
                    }
                    groupedResults.get(groupKey).readings.push({
                        readingKey: key,
                        readingName: config.name,
                        readerName: config.reader,
                        ayahText: ayah.aya_text,
                        fontFamily: config.fontFamily
                    });
                }
            });
        }

        if (groupedResults.size === 0) {
            this.resultsContainer.innerHTML = '<p class="search-empty">لا توجد نتائج</p>';
            return;
        }

        // ترتيب حسب رقم السورة ثم الآية
        const sorted = Array.from(groupedResults.values()).sort((a, b) => {
            if (a.surahNo !== b.surahNo) return a.surahNo - b.surahNo;
            return a.ayahNo - b.ayahNo;
        });

        // عرض أول 50 نتيجة مجمّعة
        const limited = sorted.slice(0, 50);
        this.resultsContainer.innerHTML = '';

        limited.forEach(group => {
            const card = document.createElement('div');
            card.className = 'search-group';

            // عنوان الآية
            const header = document.createElement('div');
            header.className = 'search-group-header';
            header.textContent = `${group.surahName} - آية ${group.ayahNo}`;
            card.appendChild(header);

            // كل رواية لهذه الآية
            group.readings.forEach(r => {
                const item = document.createElement('div');
                item.className = 'search-item';
                item.innerHTML = `
                    <div class="search-item-text" style="font-family:'${r.fontFamily}',serif">${r.ayahText}</div>
                    <div class="search-item-meta">
                        <span class="badge">${r.readingName}</span>
                        <small>${r.readerName}</small>
                        <button class="search-play-btn" title="تشغيل" aria-label="تشغيل الآية"><i class="fas fa-play"></i></button>
                        <button class="search-go-btn" title="الذهاب للآية" aria-label="الانتقال للآية"><i class="fas fa-arrow-left"></i></button>
                    </div>
                `;
                // زر التشغيل
                item.querySelector('.search-play-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    AudioPlayer.playSingleAyah(r.readingKey, group.surahNo, group.ayahNo);
                });
                // زر الانتقال
                item.querySelector('.search-go-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.close();
                    App.switchToReading(r.readingKey, group.surahNo, group.ayahNo);
                });
                card.appendChild(item);
            });

            this.resultsContainer.appendChild(card);
        });

        if (sorted.length > 50) {
            const note = document.createElement('p');
            note.className = 'search-item-meta';
            note.style.cssText = 'text-align:center;padding:10px;';
            note.textContent = `عرض 50 من ${sorted.length} نتيجة. حاول تضييق البحث.`;
            this.resultsContainer.appendChild(note);
        }
    }
};
