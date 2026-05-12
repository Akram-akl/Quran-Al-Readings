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
        return data.filter(ayah => parseInt(ayah.page) === parseInt(pageNo));
    }
};
