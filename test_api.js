const https = require('https');

const tests = [
  // Sura-level
  { name: 'أسماء السور', url: '/api/v1/sura/asmaa-sowar/1' },
  { name: 'مقاصد السور', url: '/api/v1/sura/maqased-sowar/1' },
  { name: 'فضائل السور', url: '/api/v1/sura/fadael-sowar/1' },
  { name: 'نزول السور', url: '/api/v1/sura/nozool-sowar/1' },
  { name: 'عدد آيات السور', url: '/api/v1/sura/adad_ayat-sowar/1' },
  { name: 'مكي ومدني', url: '/api/v1/sura/makiyu_madaniu_Falih/1' },
  
  // Aya-level
  { name: 'تفسير ابن كثير', url: '/api/v1/aya/tafsir-katheer/1/1' },
  { name: 'تفسير السعدي', url: '/api/v1/aya/tafsir-saadi/1/1' },
  { name: 'تفسير الطبري', url: '/api/v1/aya/tafsir-tabary/1/1' },
  { name: 'تفسير البغوي', url: '/api/v1/aya/tafsir-baghawy/1/1' },
  { name: 'التفسير المختصر', url: '/api/v1/aya/tafsir-mokhtasar/1/1' },
  { name: 'التفسير المختصر بك', url: '/api/v1/aya/tafsir-mokhtasar-bak/1/1' },
  { name: 'الوسيط الميسر', url: '/api/v1/aya/w-moyassar/1/1' },
  { name: 'إعراب الآية', url: '/api/v1/aya/eerab-aya/1/1' },
  { name: 'إعراب كلمات الآية', url: '/api/v1/aya/eerab-word-aya/1/1' },
  { name: 'أحكام التجويد', url: '/api/v1/aya/tajweed-aya/1/1' },
  { name: 'فوائد القاسم', url: '/api/v1/aya/fwaed_qassim/1/1' },
  { name: 'أسباب النزول', url: '/api/v1/aya/ayat-nozool/1/1' },
  { name: 'تأملات فيديو', url: '/api/v1/aya/taamolatvideo/1/1' },
  { name: 'تفسير ابن كثير قديم', url: '/api/v1/aya/tafsir-katheer___/1/1' },
  { name: 'تفسير السعدي القديم', url: '/api/v1/aya/tafsir-saadi-old/1/1' },
  { name: 'تفسير الطبري القديم', url: '/api/v1/aya/tafsir-tabary-old/1/1' },
  
  // Word-level
  { name: 'قراءات الكلمة', url: '/api/v1/word/word-qeraat/2/1/1' },
  { name: 'توجيه القراءات', url: '/api/v1/word/tawjih-qiraat/2/1/1' },
  { name: 'معنى الكلمة', url: '/api/v1/word/meaning-word/1/1/1' },
  { name: 'معنى الكلمة قديم', url: '/api/v1/word/meaning-word-oldv/1/1/1' },
  { name: 'إعراب الكلمة', url: '/api/v1/word/eerab-word/1/1/1' },
  { name: 'تصريف الكلمة', url: '/api/v1/word/word-tasreef/1/1/1' },
  { name: 'أماكن الكلمة', url: '/api/v1/word/amaaken-words/1/1/1' },
  { name: 'رسم الكلمة', url: '/api/v1/word/wordrasm/1/1/1' },
  { name: 'صورة الكلمة', url: '/api/v1/word/word-pic/1/1/1' },
  
  // Page-level
  { name: 'فوائد الصفحة', url: '/api/v1/page/fawaed-page/1' },
];

async function testOne(t) {
  return new Promise((resolve) => {
    https.get('https://dev.surahapp.com' + t.url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          const hasError = j.error;
          const hasContent = j.content && j.content.length > 5;
          const preview = hasContent ? j.content.substring(0, 80).replace(/\n/g, ' ') : (hasError ? j.error : 'empty');
          resolve({ name: t.name, status: hasContent ? 'OK' : 'EMPTY', preview });
        } catch(e) {
          resolve({ name: t.name, status: 'ERROR', preview: data.substring(0, 50) });
        }
      });
    }).on('error', (e) => {
      resolve({ name: t.name, status: 'ERROR', preview: e.message });
    });
  });
}

(async () => {
  for (const t of tests) {
    const r = await testOne(t);
    console.log(`${r.status === 'OK' ? '✅' : '❌'} ${r.name}: ${r.preview}`);
  }
})();
