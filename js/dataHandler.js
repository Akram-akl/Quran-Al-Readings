/**
 * dataHandler.js - إدارة جلب البيانات
 */
const DataHandler = {
    cache: {},

    async loadReading(readingKey) {
        if (this.cache[readingKey]) return this.cache[readingKey];

        const config = READINGS_CONFIG[readingKey];
        // التأكد من المسار الصحيح للمجلد المحلي
        const path = config.jsonPath; 
        
        try {
            console.log(`Fetching data for ${readingKey} from ${path}...`);
            const response = await fetch(path);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            this.cache[readingKey] = data;
            return data;
        } catch (error) {
            console.error(`Could not load reading ${readingKey}:`, error);
            return [];
        }
    },

    async getPageAyahs(readingKey, pageNo) {
        const data = await this.loadReading(readingKey);
        if (!data) return [];
        return data.filter(ayah => {
            if (typeof ayah.page === 'string' && ayah.page.includes('-')) {
                const [start, end] = ayah.page.split('-').map(Number);
                return parseInt(pageNo) >= start && parseInt(pageNo) <= end;
            }
            return parseInt(ayah.page) === parseInt(pageNo);
        });
    },

    getSurahs(data) {
        if (!data || data.length === 0) return [];
        const surahMap = {};
        data.forEach(a => {
            if (a.aya_no === 0) return;
            if (!surahMap[a.sura_no]) {
                surahMap[a.sura_no] = { number: a.sura_no, nameAr: a.sura_name_ar, ayahCount: 0 };
            }
            if (a.aya_no > surahMap[a.sura_no].ayahCount) {
                surahMap[a.sura_no].ayahCount = a.aya_no;
            }
        });
        return Object.values(surahMap).sort((a, b) => a.number - b.number);
    }
};
