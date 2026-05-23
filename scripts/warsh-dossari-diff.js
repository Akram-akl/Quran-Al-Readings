const fs = require('fs');
const warsh = JSON.parse(fs.readFileSync('data/warshData_v2-1.json', 'utf8'));
const hafs = JSON.parse(fs.readFileSync('data/hafsData_v2-0.json', 'utf8'));
const mapSrc = fs.readFileSync('js/audioMap.js', 'utf8');
const map = eval(mapSrc + ';AUDIO_MAP');
const wMap = map.warsh || {};

const suraNames = {};
warsh.forEach((a) => {
    if (a.aya_no === 1) suraNames[a.sura_no] = (a.sura_name_ar || '').trim();
});

const countDiff = [];
for (let s = 1; s <= 114; s++) {
    const wc = warsh.filter((a) => a.sura_no === s && a.aya_no > 0).length;
    const hc = hafs.filter((a) => a.sura_no === s && a.aya_no > 0).length;
    if (wc !== hc) countDiff.push({ sura: s, name: suraNames[s], warshAyahs: wc, hafsAyahs: hc });
}

const bySura = {};
for (const [sura, ayas] of Object.entries(wMap)) {
    for (const [wAya, hList] of Object.entries(ayas)) {
        const w = parseInt(wAya, 10);
        const oneToOne = hList.length === 1 && hList[0] === w;
        if (!oneToOne) {
            const s = parseInt(sura, 10);
            if (!bySura[s]) bySura[s] = { name: suraNames[s], ayahs: [] };
            bySura[s].ayahs.push({ warsh: w, hafs: hList });
        }
    }
}

const report = {
    note: 'Ibrahim Al-Dosari uses audioMapKey warsh — MP3 filenames follow HAFS numbers in AUDIO_MAP',
    surahsDifferentCount: countDiff,
    surahsWithMappingDifferences: Object.entries(bySura)
        .map(([s, v]) => ({
            sura: parseInt(s, 10),
            name: v.name,
            ayahCount: v.ayahs.length,
            examples: v.ayahs.slice(0, 5)
        }))
        .sort((a, b) => a.sura - b.sura)
};

fs.writeFileSync('data/warsh-dossari-audio-report.json', JSON.stringify(report, null, 2), 'utf8');
console.log('Wrote data/warsh-dossari-audio-report.json');
console.log('Surahs with count diff:', countDiff.length);
console.log('Surahs with map diff:', report.surahsWithMappingDifferences.length);
