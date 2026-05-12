/**
 * config.js - الإعدادات حسب ملاحظات PWA Notes
 */
const IS_ELECTRON = (typeof process !== 'undefined' && process.versions && process.versions.electron);

const WEB_AUDIO_BASE = {
    Hafs: 'https://everyayah.com/data/Alafasy_128kbps/',
    Warsh: 'https://everyayah.com/data/Warsh_Abdul_Basit_128kbps/',
    Qaloun: 'https://everyayah.com/data/Hudhaify_128kbps/',
    Duri: 'https://everyayah.com/data/Hudhaify_128kbps/',
    Susi: 'https://everyayah.com/data/Hudhaify_128kbps/',
    Shubah: 'https://everyayah.com/data/Hudhaify_128kbps/'
};

const READINGS_CONFIG = {
    Hafs: {
        name: 'حفص عن عاصم',
        reader: 'الشيخ علي الحذيفي',
        jsonPath: 'data/hafsData.json',
        fontFamily: 'UthmanicHafs',
        audioBasePath: '../Hafs/huthify-ayat/الحذيفي-ايات/',
        getAudioPath(s, a) {
            const sss = String(s).padStart(3, '0');
            const aaa = String(a).padStart(3, '0');
            if (!IS_ELECTRON) return `${WEB_AUDIO_BASE.Hafs}${sss}${aaa}.mp3`;
            const folder = SURAH_FOLDERS[s];
            return `${this.audioBasePath}${folder}/10-${sss}${aaa}-${s===1?'A01':'001'}.mp3`;
        },
        getIstiazahPath() { return `${WEB_AUDIO_BASE.Hafs}001000.mp3`; },
        getBasmalahPath() { return `${WEB_AUDIO_BASE.Hafs}001001.mp3`; }
    },
    Warsh: {
        name: 'ورش عن نافع',
        reader: 'الشيخ عبد الباسط عبد الصمد',
        jsonPath: 'data/warshData.json',
        fontFamily: 'UthmanicWarsh',
        audioBasePath: '../Warsh/000_versebyverse/',
        getAudioPath(s, a) {
            const sss = String(s).padStart(3, '0');
            const aaa = String(a).padStart(3, '0');
            if (!IS_ELECTRON) return `${WEB_AUDIO_BASE.Warsh}${sss}${aaa}.mp3`;
            return `${this.audioBasePath}${sss}${aaa}.mp3`;
        },
        getIstiazahPath() { return `${WEB_AUDIO_BASE.Warsh}001000.mp3`; },
        getBasmalahPath() { return `${WEB_AUDIO_BASE.Warsh}001001.mp3`; }
    },
    Qaloun: {
        name: 'قالون عن نافع',
        reader: 'الشيخ علي الحذيفي',
        jsonPath: 'data/qalounData.json',
        fontFamily: 'UthmanicQaloun',
        audioBasePath: '../Qaloun/ayat/ayat/',
        getAudioPath(s, a) {
            const sss = String(s).padStart(3, '0');
            const aaa = String(a).padStart(3, '0');
            if (!IS_ELECTRON) return `${WEB_AUDIO_BASE.Qaloun}${sss}${aaa}.mp3`;
            return `${this.audioBasePath}${SURAH_FOLDERS[s]}/01-${sss}${aaa}-A01.mp3`;
        },
        getIstiazahPath() { return `${WEB_AUDIO_BASE.Qaloun}001000.mp3`; },
        getBasmalahPath() { return `${WEB_AUDIO_BASE.Qaloun}001001.mp3`; }
    },
    Duri: {
        name: 'الدوري عن أبي عمرو',
        reader: 'الشيخ د. عبد الله الجهني',
        jsonPath: 'data/duriData.json',
        fontFamily: 'UthmanicDuri',
        audioBasePath: '../Duri/ayat/ayat/',
        getAudioPath(s, a) {
            const sss = String(s).padStart(3, '0');
            const aaa = String(a).padStart(3, '0');
            if (!IS_ELECTRON) return `${WEB_AUDIO_BASE.Duri}${sss}${aaa}.mp3`;
            return `${this.audioBasePath}${SURAH_FOLDERS[s]}/05-${sss}${aaa}-A09.mp3`;
        },
        getIstiazahPath() { return `${WEB_AUDIO_BASE.Duri}001000.mp3`; },
        getBasmalahPath() { return `${WEB_AUDIO_BASE.Duri}001001.mp3`; }
    },
    Susi: {
        name: 'السوسي عن أبي عمرو',
        reader: 'الشيخ د. عثمان الصديقي',
        jsonPath: 'data/susiData.json',
        fontFamily: 'UthmanicSusi',
        audioBasePath: '../Susi/sediki-ayat/ayat/',
        getAudioPath(s, a) {
            const ss = String(s).padStart(2, '0');
            const aaa = String(a).padStart(3, '0');
            if (!IS_ELECTRON) return `${WEB_AUDIO_BASE.Susi}${String(s).padStart(3,'0')}${aaa}.mp3`;
            return `${this.audioBasePath}${SURAH_FOLDERS[s]}/06-${ss}${aaa}A10.wav.mp3`;
        },
        getIstiazahPath() { return `${WEB_AUDIO_BASE.Susi}001000.mp3`; },
        getBasmalahPath() { return `${WEB_AUDIO_BASE.Susi}001001.mp3`; }
    },
    Shubah: {
        name: 'شعبة عن عاصم',
        reader: 'الشيخ علي الحذيفي',
        jsonPath: 'data/shubahData.json',
        fontFamily: 'UthmanicShubah',
        audioBasePath: '../Shubah/huthify-shuba-ayat/آيات - 2020.1.19/',
        getAudioPath(s, a) {
            const sss = String(s).padStart(3, '0');
            const aaa = String(a).padStart(3, '0');
            if (!IS_ELECTRON) return `${WEB_AUDIO_BASE.Shubah}${sss}${aaa}.mp3`;
            return `${this.audioBasePath}${SURAH_FOLDERS[s]}/09-${sss}${aaa}-A01.mp3`;
        },
        getIstiazahPath() { return `${WEB_AUDIO_BASE.Shubah}001000.mp3`; },
        getBasmalahPath() { return `${WEB_AUDIO_BASE.Shubah}001001.mp3`; }
    }
};

const SURAH_FOLDERS = {
    1: "001 Al-Fatihah الفاتحة", 2: "002 Al-Baqarah البقرة", 3: "003 Al-'Imran آل عمران",
    4: "004 An-Nisa' النساء", 5: "005 Al-Ma'idah المائدة", 6: "006 Al-An'am الأنعام",
    7: "007 Al-A'raf الأعراف", 8: "008 Al-Anfal الأنفال", 9: "009 At-Taubah التوبة",
    10: "010 Yunus يونس", 11: "011 Hud هود", 12: "012 Yusuf يوسف",
    13: "013 Ar-Ra'd الرعد", 14: "014 Ibrahim إبراهيم", 15: "015 Al-Hijr الحجر",
    16: "016 An-Nahl النحل", 17: "017 Al-Isra' الإسراء", 18: "018 Al-Kahf الكهف",
    19: "019 Maryam مريم", 20: "020 Ta-Ha طه", 21: "021 Al-Anbiya' الأنبياء",
    22: "022 Al-Hajj الحج", 23: "023 Al-Mu'minun المؤمنون", 24: "024 An-Nur النور",
    25: "025 Al-Furqan الفرقان", 26: "026 Ash-Shu'ara' الشعراء", 27: "027 An-Naml النمل",
    28: "028 Al-Qasas القصص", 29: "029 Al-'Ankabut العنكبوت", 30: "030 Ar-Rum الروم",
    31: "031 Luqman لقمان", 32: "032 As-Sajdah السجدة", 33: "033 Al-Ahzab الأحزاب",
    34: "034 Saba' سبأ", 35: "035 Fatir فاطر", 36: "036 Ya-Sin يس",
    37: "037 As-Saffat الصافات", 38: "038 Sad ص", 39: "039 Az-Zumar الزمر",
    40: "040 Ghafir غافر", 41: "041 Fussilat فصلت", 42: "042 Ash-Shura الشورى",
    43: "043 Az-Zukhruf الزخرف", 44: "044 Ad-Dukhan الدخان", 45: "045 Al-Jathiyah الجاثية",
    46: "046 Al-Ahqaf الأحقاف", 47: "047 Muhammad محمد", 48: "048 Al-Fath الفتح",
    49: "049 Al-Hujurat الحجرات", 50: "050 Qaf ق", 51: "051 Adh-Dhariyat الذاريات",
    52: "052 At-Tur الطور", 53: "053 An-Najm النجم", 54: "054 Al-Qamar القمر",
    55: "055 Ar-Rahman الرحمن", 56: "056 Al-Waqi'ah الواقعة", 57: "057 Al-Hadid الحديد",
    58: "058 Al-Mujadilah المجادلة", 59: "059 Al-Hashr الحشر", 60: "060 Al-Mumtahanah الممتحنة",
    61: "061 As-Saff الصف", 62: "062 Al-Jumu'ah الجمعة", 63: "063 Al-Munafiqun المنافقون",
    64: "064 At-Taghabun التغابن", 65: "065 At-Talaq الطلاق", 66: "066 At-Tahrim التحريم",
    67: "067 Al-Mulk الملك", 68: "068 Al-Qalam القلم", 69: "069 Al-Haqqah الحاقة",
    70: "070 Al-Ma'arij المعارج", 71: "071 Nuh نوح", 72: "072 Al-Jinn الجن",
    73: "073 Al-Muzzammil المزمل", 74: "074 Al-Muddaththir المد ثر", 75: "075 Al-Qiyamah القيامة",
    76: "076 Al-Insan الإنسان", 77: "077 Al-Mursalat المرسلات", 78: "078 An-Naba' النبأ",
    79: "079 An-Nazi'at النازعات", 80: "080 'Abasa عبس", 81: "081 At-Takwir التكوير",
    82: "082 Al-Infitar الانفطار", 83: "083 Al-Mutaffifin المطففين", 84: "084 Al-Inshiqaq الانشقاق",
    85: "085 Al-Buruj البروج", 86: "086 At-Tariq الطارق", 87: "087 Al-A'la الأعلى",
    88: "088 Al-Ghashiyah الغاشية", 89: "089 Al-Fajr الفجر", 90: "090 Al-Balad البلد",
    91: "091 Ash-Shams الشمس", 92: "092 Al-Lail الليل", 93: "093 Ad-Duha الضحى",
    94: "094 Ash-Sharh الشرح", 95: "095 At-Tin التين", 96: "096 Al-'Alaq العلق",
    97: "097 Al-Qadr القدر", 98: "098 Al-Bayyinah البينة", 99: "099 Az-Zalzalah الزلزلة",
    100: "100 Al-'Adiyat العاديات", 101: "101 Al-Qari'ah القارعة", 102: "102 At-Takathur التكاثر",
    103: "103 Al-'Asr العصر", 104: "104 Al-Humazah الهمزة", 105: "105 Al-Fil الفيل",
    106: "106 Quraish قريش", 107: "107 Al-Ma'un الماعون", 108: "108 Al-Kauthar الكوثر",
    109: "109 Al-Kafirun الكافرون", 110: "110 An-Nasr النصر", 111: "111 Al-Masad المسد",
    112: "112 Al-Ikhlas الإخلاص", 113: "113 Al-Falaq الفلق", 114: "114 An-Nas الناس"
};

const NO_BASMALAH_SURAHS = [9];
