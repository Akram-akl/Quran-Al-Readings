/**
 * search.js - محرك البحث عبر الروايات الست
 */
const Search = {
    init() {
        const input = document.getElementById('searchInput');
        const btn = document.getElementById('searchBtn');

        btn.addEventListener('click', () => this.performSearch(input.value));
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch(input.value);
        });
    },

    async performSearch(query) {
        if (!query || query.length < 2) return;

        const resultsArea = document.getElementById('searchResults');
        resultsArea.innerHTML = '<div class="loader"><i class="fas fa-spinner fa-spin"></i> جاري البحث...</div>';
        document.getElementById('searchModal').classList.add('active');

        const results = [];
        const readings = Object.keys(READINGS_CONFIG);

        // البحث في جميع الروايات المحملة
        for (const key of readings) {
            const data = await DataHandler.loadReading(key);
            const matches = data.filter(a => 
                (a.aya_text_emlaey && a.aya_text_emlaey.includes(query)) || 
                (a.aya_text && a.aya_text.includes(query))
            ).slice(0, 10); // تحديد أول 10 نتائج لكل رواية

            if (matches.length > 0) {
                results.push({ reading: key, readingName: READINGS_CONFIG[key].name, matches });
            }
        }

        this.renderResults(results);
    },

    renderResults(results) {
        const area = document.getElementById('searchResults');
        area.innerHTML = '';

        if (results.length === 0) {
            area.innerHTML = '<div class="search-empty">لم يتم العثور على نتائج</div>';
            return;
        }

        results.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'search-group';
            
            const header = document.createElement('div');
            header.className = 'search-group-header';
            header.textContent = group.readingName;
            groupDiv.appendChild(header);

            group.matches.forEach(m => {
                const item = document.createElement('div');
                item.className = 'search-item';
                item.innerHTML = `
                    <div class="search-item-text">${m.aya_text}</div>
                    <div class="search-item-meta">
                        <span class="badge">سورة ${m.sura_name_ar}</span>
                        <span>آية ${m.aya_no} - صفحة ${m.page}</span>
                        <button class="search-go-btn" onclick="Search.goTo('${group.reading}', ${m.page}, ${m.aya_no})">
                            <i class="fas fa-external-link-alt"></i> ذهاب
                        </button>
                    </div>
                `;
                groupDiv.appendChild(item);
            });

            area.appendChild(groupDiv);
        });
    },

    goTo(reading, page, ayah) {
        document.getElementById('searchModal').classList.remove('active');
        document.getElementById('readingSelect').value = reading;
        App.currentReading = reading;
        App.loadPage(page).then(() => {
            setTimeout(() => AudioPlayer.playAyah(ayah), 500);
        });
    }
};
