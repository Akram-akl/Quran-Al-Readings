/**
 * dataHandler.js - تحميل وإدارة بيانات JSON للروايات
 */
const DataHandler = {
    cache: {},

    async loadReading(readingKey) {
        if (this.cache[readingKey]) return this.cache[readingKey];
        const config = READINGS_CONFIG[readingKey];
        if (!config) throw new Error(`رواية غير معروفة: ${readingKey}`);
        try {
            const response = await fetch(config.jsonPath);
            if (!response.ok) throw new Error(`فشل تحميل ${readingKey}`);
            const data = await response.json();
            this.cache[readingKey] = data;
            return data;
        } catch (error) {
            console.error(`خطأ في تحميل رواية ${readingKey}:`, error);
            return [];
        }
    },

    getSurahs(data) {
        const surahs = new Map();
        data.forEach(ayah => {
            if (!surahs.has(ayah.sura_no)) {
                surahs.set(ayah.sura_no, {
                    number: ayah.sura_no,
                    nameAr: ayah.sura_name_ar,
                    nameEn: ayah.sura_name_en,
                    ayahCount: 0
                });
            }
            const s = surahs.get(ayah.sura_no);
            if (ayah.aya_no > s.ayahCount) s.ayahCount = ayah.aya_no;
        });
        return Array.from(surahs.values()).sort((a, b) => a.number - b.number);
    },

    getAyahsForSurah(data, surahNo) {
        return data.filter(a => a.sura_no === surahNo).sort((a, b) => a.aya_no - b.aya_no);
    },

    /** الحصول على آيات صفحة معينة */
    getAyahsByPage(data, pageNo) {
        return data.filter(a => a.page === pageNo).sort((a, b) => {
            if (a.sura_no !== b.sura_no) return a.sura_no - b.sura_no;
            return a.aya_no - b.aya_no;
        });
    },

    /** عدد الصفحات الإجمالي */
    getTotalPages(data) {
        let max = 1;
        data.forEach(a => { if (a.page > max) max = a.page; });
        return max;
    },

    /** إيجاد الصفحة التي تحتوي على بداية سورة معينة */
    getPageForSurah(data, surahNo) {
        const first = data.find(a => a.sura_no === surahNo && a.aya_no === 1);
        return first ? first.page : 1;
    },

    getJozzList(data) {
        const jozzSet = new Set();
        data.forEach(a => jozzSet.add(a.jozz));
        return Array.from(jozzSet).sort((a, b) => a - b);
    },

    getAyahsByJozz(data, jozz) {
        return data.filter(a => a.jozz === jozz).sort((a, b) => {
            if (a.sura_no !== b.sura_no) return a.sura_no - b.sura_no;
            return a.aya_no - b.aya_no;
        });
    }
};
