/**
 * search.js - محرك البحث
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
        if (!query || query.length < 2) return;

        const resultsArea = document.getElementById('searchResults');
        if (resultsArea) resultsArea.innerHTML = '<div class="loader"><i class="fas fa-spinner fa-spin"></i> جاري البحث...</div>';
        
        const modal = document.getElementById('searchModal');
        if (modal) modal.classList.add('active');

        const results = [];
        const readings = Object.keys(READINGS_CONFIG);

        for (const key of readings) {
            try {
                const data = await DataHandler.loadReading(key);
                const matches = data.filter(a => 
                    (a.aya_text_emlaey && a.aya_text_emlaey.includes(query)) || 
                    (a.aya_text && a.aya_text.includes(query))
                ).slice(0, 5);

                if (matches.length > 0) {
                    results.push({ reading: key, readingName: READINGS_CONFIG[key].name, matches });
                }
            } catch (e) { console.error("Search error in " + key, e); }
        }

        this.renderResults(results);
    },

    renderResults(results) {
        const area = document.getElementById('searchResults');
        if (!area) return;
        area.innerHTML = '';

        if (results.length === 0) {
            area.innerHTML = '<div class="search-empty">لم يتم العثور على نتائج</div>';
            return;
        }

        results.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'search-group';
            groupDiv.innerHTML = `<div class="search-group-header">${group.readingName}</div>`;

            group.matches.forEach(m => {
                const item = document.createElement('div');
                item.className = 'search-item';
                item.innerHTML = `
                    <div class="search-item-text">${m.aya_text}</div>
                    <div class="search-item-meta">
                        <span>سورة ${m.sura_name_ar} (آية ${m.aya_no})</span>
                        <button class="btn btn-primary btn-sm" onclick="Search.goTo('${group.reading}', ${m.page}, ${m.aya_no})">انتقال</button>
                    </div>
                `;
                groupDiv.appendChild(item);
            });
            area.appendChild(groupDiv);
        });
    },

    goTo(reading, page, ayah) {
        const modal = document.getElementById('searchModal');
        if (modal) modal.classList.remove('active');
        
        const readingSelect = document.getElementById('readingSelect');
        if (readingSelect) readingSelect.value = reading;
        
        App.currentReading = reading;
        App.loadPage(page).then(() => {
            setTimeout(() => AudioPlayer.playAyah(ayah), 500);
        });
    }
};
