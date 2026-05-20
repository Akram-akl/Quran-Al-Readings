/**
 * api.js - إدارة جلب البيانات من SurahApp API مع التخزين المؤقت
 */
const SurahAPI = {
    baseUrl: 'https://dev.surahapp.com/api/v1',
    cache: new Map(),

    async fetchWithCache(endpoint) {
        if (this.cache.has(endpoint)) {
            return this.cache.get(endpoint);
        }
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            this.cache.set(endpoint, data);
            return data;
        } catch (error) {
            console.error('API Fetch Error:', error);
            return { error: 'تعذر جلب البيانات. الرجاء التحقق من الاتصال بالإنترنت.' };
        }
    },

    // ---------------- Sura Level ----------------
    async getSuraInfo(suraNo) {
        // Asmaa, Fadael, Nozool, Adad
        const asmaa = await this.fetchWithCache(`/sura/asmaa-sowar/${suraNo}`);
        const fadael = await this.fetchWithCache(`/sura/fadael-sowar/${suraNo}`);
        const nozool = await this.fetchWithCache(`/sura/nozool-sowar/${suraNo}`);
        const adad = await this.fetchWithCache(`/sura/adad_ayat-sowar/${suraNo}`);
        return { asmaa, fadael, nozool, adad };
    },

    // ---------------- Aya Level ----------------
    async getAyaTafsirMokhtasar(suraNo, ayaNo) {
        return await this.fetchWithCache(`/aya/tafsir-mokhtasar/${suraNo}/${ayaNo}`);
    },

    async getAyaTajweed(suraNo, ayaNo) {
        return await this.fetchWithCache(`/aya/tajweed-aya/${suraNo}/${ayaNo}`);
    },

    async getAyaEerab(suraNo, ayaNo) {
        return await this.fetchWithCache(`/aya/eerab-aya/${suraNo}/${ayaNo}`);
    },

    // ---------------- Word Level ----------------
    async getWordQeraat(suraNo, ayaNo, wordNo) {
        return await this.fetchWithCache(`/word/word-qeraat/${suraNo}/${ayaNo}/${wordNo}`);
    },

    async getWordMeaningOld(suraNo, ayaNo, wordNo) {
        return await this.fetchWithCache(`/word/meaning-word-oldv/${suraNo}/${ayaNo}/${wordNo}`);
    },

    async getWordEerab(suraNo, ayaNo, wordNo) {
        return await this.fetchWithCache(`/word/eerab-word/${suraNo}/${ayaNo}/${wordNo}`);
    },

    async getWordTasreef(suraNo, ayaNo, wordNo) {
        return await this.fetchWithCache(`/word/word-tasreef/${suraNo}/${ayaNo}/${wordNo}`);
    }
};

window.SurahAPI = SurahAPI;
