/**
 * config.js - توحيد منطق الصوت (SSS AAA)
 */
const IS_ELECTRON = (typeof process !== 'undefined' && process.versions && process.versions.electron);

const ARCHIVE_BASE = 'https://archive.org/download/';

const READINGS_CONFIG = {
    Hafs: {
        name: 'حفص عن عاصم (عبدالباسط)',
        reader: 'الشيخ عبدالباسط عبدالصمد',
        jsonPath: 'data/hafsData_v2-0.json',
        fontFamily: 'UthmanicHafs',
        archiveItem: 'akram-quran-hafs-abdelbasset', // الرابط الشخصي الجديد
        getAudioPath(ayah) {
            const sss = String(ayah.sura_no).padStart(3, '0');
            const aaa = String(ayah.aya_no).padStart(3, '0');
            return `${ARCHIVE_BASE}${this.archiveItem}/${sss}${aaa}.mp3`;
        },
        getIstiazahPath() { return `${ARCHIVE_BASE}${this.archiveItem}/001000.mp3`; },
        getBasmalahPath() { return `${ARCHIVE_BASE}${this.archiveItem}/001001.mp3`; }
    },
    HafsHussary: {
        name: 'حفص عن عاصم (الحصري)',
        reader: 'الشيخ محمود خليل الحصري',
        jsonPath: 'data/hafsData_v2-0.json',
        fontFamily: 'UthmanicHafs',
        archiveItem: 'akram-quran-hafs-hussary', // الرابط الشخصي الجديد
        getAudioPath(ayah) {
            const sss = String(ayah.sura_no).padStart(3, '0');
            const aaa = String(ayah.aya_no).padStart(3, '0');
            return `${ARCHIVE_BASE}${this.archiveItem}/${sss}${aaa}.mp3`;
        },
        getIstiazahPath() { return `${ARCHIVE_BASE}${this.archiveItem}/001000.mp3`; },
        getBasmalahPath() { return `${ARCHIVE_BASE}${this.archiveItem}/001001.mp3`; }
    },
    HafsMinshawi: {
        name: 'حفص عن عاصم (المنشاوي)',
        reader: 'الشيخ محمد صديق المنشاوي',
        jsonPath: 'data/hafsData_v2-0.json',
        fontFamily: 'UthmanicHafs',
        archiveItem: 'akram-quran-hafs-minshawi', // الرابط الشخصي الجديد
        getAudioPath(ayah) {
            const sss = String(ayah.sura_no).padStart(3, '0');
            const aaa = String(ayah.aya_no).padStart(3, '0');
            return `${ARCHIVE_BASE}${this.archiveItem}/${sss}${aaa}.mp3`;
        },
        getIstiazahPath() { return `${ARCHIVE_BASE}${this.archiveItem}/001000.mp3`; },
        getBasmalahPath() { return `${ARCHIVE_BASE}${this.archiveItem}/001001.mp3`; }
    },
    Warsh: {
        name: 'ورش عن نافع (عبدالباسط)',
        reader: 'الشيخ عبدالباسط عبدالصمد',
        jsonPath: 'data/warshData_v2-1.json',
        fontFamily: 'UthmanicWarsh',
        archiveItem: 'akram-quran-warsh-abdelbasset', // الرابط الشخصي الجديد
        getAudioPath(ayah) {
            const sss = String(ayah.sura_no).padStart(3, '0');
            const aaa = String(ayah.aya_no).padStart(3, '0');
            return `${ARCHIVE_BASE}${this.archiveItem}/${sss}${aaa}.mp3`;
        },
        getIstiazahPath() { return `${ARCHIVE_BASE}${this.archiveItem}/001000.mp3`; },
        getBasmalahPath() { return `${ARCHIVE_BASE}${this.archiveItem}/001001.mp3`; }
    },
    WarshHussary: {
        name: 'ورش عن نافع (الحصري)',
        reader: 'الشيخ محمود خليل الحصري',
        jsonPath: 'data/warshData_v2-1.json',
        fontFamily: 'UthmanicWarsh',
        archiveItem: 'akram-quran-warsh-hussary', // الرابط الشخصي الجديد
        getAudioPath(ayah) {
            const sss = String(ayah.sura_no).padStart(3, '0');
            const aaa = String(ayah.aya_no).padStart(3, '0');
            return `${ARCHIVE_BASE}${this.archiveItem}/${sss}${aaa}.mp3`;
        },
        getIstiazahPath() { return `${ARCHIVE_BASE}${this.archiveItem}/001000.mp3`; },
        getBasmalahPath() { return `${ARCHIVE_BASE}${this.archiveItem}/001001.mp3`; }
    },
    WarshJazairi: {
        name: 'ورش عن نافع (ياسين الجزائري)',
        reader: 'الشيخ ياسين الجزائري',
        jsonPath: 'data/warshData_v2-1.json',
        fontFamily: 'UthmanicWarsh',
        archiveItem: 'akram-quran-warsh-jazairi', // الرابط الشخصي الجديد
        getAudioPath(ayah) {
            const sss = String(ayah.sura_no).padStart(3, '0');
            const aaa = String(ayah.aya_no).padStart(3, '0');
            return `${ARCHIVE_BASE}${this.archiveItem}/${sss}${aaa}.mp3`;
        },
        getIstiazahPath() { return `${ARCHIVE_BASE}${this.archiveItem}/001000.mp3`; },
        getBasmalahPath() { return `${ARCHIVE_BASE}${this.archiveItem}/001001.mp3`; }
    },
    Qaloun: {
        name: 'قالون عن نافع (الحصري)',
        reader: 'الشيخ محمود خليل الحصري',
        jsonPath: 'data/QalounData_v2-1.json',
        fontFamily: 'UthmanicQaloun',
        isMonolithic: true,
        ayahOffset: 2, // الحصري يبدأ بالاستعاذة والبسملة (إزاحة آيتين)
        archiveItem: 'quran-qaloun-hussary-114', // تم التحديث
        getAudioPath(sura_no) {
            const sss = String(sura_no).padStart(3, '0');
            return `${ARCHIVE_BASE}${this.archiveItem}/${sss}.mp3`;
        },
        getTimingPath(sura_no) {
            const sss = String(sura_no).padStart(3, '0');
            return `data/timings/Qaloun/${sss}.json`;
        }
    },
    QalounHuthaify: {
        name: 'قالون عن نافع (الحذيفي)',
        reader: 'الشيخ علي بن عبدالرحمن الحذيفي',
        jsonPath: 'data/QalounData_v2-1.json',
        fontFamily: 'UthmanicQaloun',
        isMonolithic: true,
        archiveItem: 'qaloun_huthaifyali_al_huthaify', // تم التحديث
        getAudioPath(sura_no) {
            const sss = String(sura_no).padStart(3, '0');
            return `${ARCHIVE_BASE}${this.archiveItem}/${sss}.mp3`;
        },
        getTimingPath(sura_no) {
            const sss = String(sura_no).padStart(3, '0');
            return `data/timings/Qaloun_Huthaify/${sss}.json`;
        }
    },
    Duri: {
        name: 'الدوري عن أبي عمرو',
        reader: 'الشيخ محمود خليل الحصري',
        jsonPath: 'data/DouriData_v2-0.json',
        fontFamily: 'UthmanicDuri',
        isMonolithic: true,
        ayahOffset: 2, // الحصري يبدأ بالاستعاذة والبسملة
        archiveItem: 'quran-duri-hussary-114', // تم التحديث
        getAudioPath(sura_no) {
            const sss = String(sura_no).padStart(3, '0');
            return `${ARCHIVE_BASE}${this.archiveItem}/${sss}.mp3`;
        },
        getTimingPath(sura_no) {
            const sss = String(sura_no).padStart(3, '0');
            return `data/timings/Duri/${sss}.json`;
        }
    },
    Susi: {
        name: 'السوسي عن أبي عمرو',
        reader: 'الشيخ عبدالرشيد صوفي',
        jsonPath: 'data/SousiData_v2-0.json',
        fontFamily: 'UthmanicSusi',
        isMonolithic: true,
        archiveItem: 'quran-susi-sofi-114', // تم التحديث
        getAudioPath(sura_no) {
            const sss = String(sura_no).padStart(3, '0');
            return `${ARCHIVE_BASE}${this.archiveItem}/${sss}.mp3`;
        },
        getTimingPath(sura_no) {
            const sss = String(sura_no).padStart(3, '0');
            return `data/timings/Susi/${sss}.json`;
        }
    },
    Shubah: {
        name: 'شعبة عن عاصم',
        reader: 'الشيخ علي بن عبدالرحمن الحذيفي',
        jsonPath: 'data/shubaData_v2-0.json',
        fontFamily: 'UthmanicShubah',
        isMonolithic: true,
        archiveItem: 'quran-shubah-huthaify-114', // تم التحديث
        getAudioPath(sura_no) {
            const sss = String(sura_no).padStart(3, '0');
            return `${ARCHIVE_BASE}${this.archiveItem}/${sss}.mp3`;
        },
        getTimingPath(sura_no) {
            const sss = String(sura_no).padStart(3, '0');
            return `data/timings/Shubah/${sss}.json`;
        }
    }
};

const SURAHS = [
    {number:1, nameAr:"الفاتحة", startPage:1}, {number:2, nameAr:"البقرة", startPage:2}, {number:3, nameAr:"آل عمران", startPage:50},
    {number:4, nameAr:"النساء", startPage:77}, {number:5, nameAr:"المائدة", startPage:106}, {number:6, nameAr:"الأنعام", startPage:128},
    {number:7, nameAr:"الأعراف", startPage:151}, {number:8, nameAr:"الأنفال", startPage:177}, {number:9, nameAr:"التوبة", startPage:187},
    {number:10, nameAr:"يونس", startPage:208}, {number:11, nameAr:"هود", startPage:221}, {number:12, nameAr:"يوسف", startPage:235},
    {number:13, nameAr:"الرعد", startPage:249}, {number:14, nameAr:"إبراهيم", startPage:255}, {number:15, nameAr:"الحجر", startPage:262},
    {number:16, nameAr:"النحل", startPage:267}, {number:17, nameAr:"الإسراء", startPage:282}, {number:18, nameAr:"الكهف", startPage:293},
    {number:19, nameAr:"مريم", startPage:305}, {number:20, nameAr:"طه", startPage:312}, {number:21, nameAr:"الأنبياء", startPage:322},
    {number:22, nameAr:"الحج", startPage:332}, {number:23, nameAr:"المؤمنون", startPage:342}, {number:24, nameAr:"النور", startPage:350},
    {number:25, nameAr:"الفرقان", startPage:359}, {number:26, nameAr:"الشعراء", startPage:367}, {number:27, nameAr:"النمل", startPage:377},
    {number:28, nameAr:"القصص", startPage:385}, {number:29, nameAr:"العنكبوت", startPage:396}, {number:30, nameAr:"الروم", startPage:404},
    {number:31, nameAr:"لقمان", startPage:411}, {number:32, nameAr:"السجدة", startPage:415}, {number:33, nameAr:"الأحزاب", startPage:418},
    {number:34, nameAr:"سبأ", startPage:428}, {number:35, nameAr:"فاطر", startPage:434}, {number:36, nameAr:"يس", startPage:440},
    {number:37, nameAr:"الصافات", startPage:446}, {number:38, nameAr:"ص", startPage:453}, {number:39, nameAr:"الزمر", startPage:458},
    {number:40, nameAr:"غافر", startPage:467}, {number:41, nameAr:"فصلت", startPage:477}, {number:42, nameAr:"الشورى", startPage:483},
    {number:43, nameAr:"الزخرف", startPage:489}, {number:44, nameAr:"الدخان", startPage:496}, {number:45, nameAr:"الجاثية", startPage:499},
    {number:46, nameAr:"الأحقاف", startPage:502}, {number:47, nameAr:"محمد", startPage:507}, {number:48, nameAr:"الفتح", startPage:511},
    {number:49, nameAr:"الحجرات", startPage:515}, {number:50, nameAr:"ق", startPage:518}, {number:51, nameAr:"الذاريات", startPage:520},
    {number:52, nameAr:"الطور", startPage:523}, {number:53, nameAr:"النجم", startPage:526}, {number:54, nameAr:"القمر", startPage:528},
    {number:55, nameAr:"الرحمن", startPage:531}, {number:56, nameAr:"الواقعة", startPage:534}, {number:57, nameAr:"الحديد", startPage:537},
    {number:58, nameAr:"المجادلة", startPage:542}, {number:59, nameAr:"الحشر", startPage:545}, {number:60, nameAr:"الممتحنة", startPage:549},
    {number:61, nameAr:"الصف", startPage:551}, {number:62, nameAr:"الجمعة", startPage:553}, {number:63, nameAr:"المنافقون", startPage:554},
    {number:64, nameAr:"التغابن", startPage:556}, {number:65, nameAr:"الطلاق", startPage:558}, {number:66, nameAr:"التحريم", startPage:560},
    {number:67, nameAr:"الملك", startPage:562}, {number:68, nameAr:"القلم", startPage:564}, {number:69, nameAr:"الحاقة", startPage:566},
    {number:70, nameAr:"المعارج", startPage:568}, {number:71, nameAr:"نوح", startPage:570}, {number:72, nameAr:"الجن", startPage:572},
    {number:73, nameAr:"المزمل", startPage:574}, {number:74, nameAr:"المدثر", startPage:575}, {number:75, nameAr:"القيامة", startPage:577},
    {number:76, nameAr:"الإنسان", startPage:578}, {number:77, nameAr:"المرسلات", startPage:580}, {number:78, nameAr:"النبأ", startPage:582},
    {number:79, nameAr:"النازعات", startPage:583}, {number:80, nameAr:"عبس", startPage:585}, {number:81, nameAr:"التكوير", startPage:586},
    {number:82, nameAr:"الانفطار", startPage:587}, {number:83, nameAr:"المطففين", startPage:587}, {number:84, nameAr:"الانشقاق", startPage:589},
    {number:85, nameAr:"البروج", startPage:590}, {number:86, nameAr:"الطارق", startPage:591}, {number:87, nameAr:"الأعلى", startPage:591},
    {number:88, nameAr:"الغاشية", startPage:592}, {number:89, nameAr:"الفجر", startPage:593}, {number:90, nameAr:"البلد", startPage:594},
    {number:91, nameAr:"الشمس", startPage:595}, {number:92, nameAr:"الليل", startPage:595}, {number:93, nameAr:"الضحى", startPage:596},
    {number:94, nameAr:"الشرح", startPage:596}, {number:95, nameAr:"التين", startPage:597}, {number:96, nameAr:"العلق", startPage:597},
    {number:97, nameAr:"القدر", startPage:598}, {number:98, nameAr:"البينة", startPage:598}, {number:99, nameAr:"الزلزلة", startPage:599},
    {number:100, nameAr:"العاديات", startPage:599}, {number:101, nameAr:"القارعة", startPage:600}, {number:102, nameAr:"التكاثر", startPage:600},
    {number:103, nameAr:"العصر", startPage:601}, {number:104, nameAr:"الهمزة", startPage:601}, {number:105, nameAr:"الفيل", startPage:601},
    {number:106, nameAr:"قريش", startPage:602}, {number:107, nameAr:"الماعون", startPage:602}, {number:108, nameAr:"الكوثر", startPage:602},
    {number:109, nameAr:"الكافرون", startPage:603}, {number:110, nameAr:"النصر", startPage:603}, {number:111, nameAr:"المسد", startPage:603},
    {number:112, nameAr:"الإخلاص", startPage:604}, {number:113, nameAr:"الفلق", startPage:604}, {number:114, nameAr:"الناس", startPage:604}
];

const JOZZ_LIST = Array.from({length: 30}, (_, i) => i + 1);

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
    73: "073 Al-Muzzammil المزمل", 74: "074 Al-Muddaththir المدثر", 75: "075 Al-Qiyamah القيامة",
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
