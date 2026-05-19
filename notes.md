# الآيات الممتدة عبر صفحتين (Spanning Ayahs)

تم رصد بعض الآيات في الروايات غير حفص (كورش وقالون والدوري والسوسي) التي تمتد فعلياً وتُقسم بين صفحتين.
بناءً على التوجيهات اليدوية، هذه هي الكلمات الدقيقة التي يتم عندها شق الآية بحيث لا تتكرر عند قلب الصفحة:

## 🟢 روايتا ورش وقالون
- **سورة النساء - آية 44 (الصفحات 85-86):** 
  - صفحة 85 تنتهي عند كلمة: `السبيل`
  - صفحة 86 تبدأ عند كلمة: `والله`
- **سورة طه - آية 86 (الصفحات 317-318):** 
  - صفحة 317 تنتهي عند كلمة: `السامرى`
  - صفحة 318 تبدأ عند كلمة: `فاخرج`
- **سورة النور - آية 36 (الصفحات 354-355):** 
  - صفحة 354 تنتهي عند كلمة: `والاصال`
  - صفحة 355 تبدأ عند كلمة: `رجال`
- **سورة النور - آية 42 (الصفحات 355-356):** 
  - صفحة 355 تنتهي عند كلمة: `بالابصار`
  - صفحة 356 تبدأ عند كلمة: `يقلب`

## 🟠 روايتا الدوري والسوسي
- **سورة البقرة - آية 218 (الصفحات 34-35):** 
  - صفحة 34 تنتهي عند كلمة: `تتفكرون`
  - صفحة 35 تبدأ عند كلمة: `في`
- **سورة النساء - آية 44 (الصفحات 85-86):** 
  - صفحة 85 تنتهي عند كلمة: `السبيل`
  - صفحة 86 تبدأ عند كلمة: `والله`
- **سورة إبراهيم - آية 27 (الصفحات 258-259):** 
  - صفحة 258 تنتهي عند كلمة: `السماء`
  - صفحة 259 تبدأ عند كلمة: `توتى`
- **سورة النور - آية 36 (الصفحات 354-355):** 
  - صفحة 354 تنتهي عند كلمة: `والاصال`
  - صفحة 355 تبدأ عند كلمة: `رجال`
- **سورة النور - آية 42 (الصفحات 355-356):** 
  - صفحة 355 تنتهي عند كلمة: `بالابصار`
  - صفحة 356 تبدأ عند كلمة: `يقلب`

---
> [!NOTE]
> **كيف يتعامل التطبيق معها؟**
> التطبيق (ابتداءً من الإصدار 2.7) يقوم برصد هذه الآيات تلقائياً عبر مصفوفة `SPANNING_AYAH_SPLITS` في ملف `config.js`، ثم يستخدم دالة ذكية `splitAyahText` في الواجهة `ui.js` لقص النص في الذاكرة أثناء العرض بناءً على هذه الكلمات، مع الحفاظ على التشكيل كاملاً، وبالتالي تظهر الآيات بشكل صحيح وبدون أي تكرار أو حذف.

---

# Important Notes for PWA Development

1. **No Alerts**: Do not use `alert` or similar dialogs.
2. **Source of Truth**: The provided files are the absolute truth. Any discrepancy means there is a bug in the code.
3. **Immutability**: DO NOT modify a single character in the existing reading files (`Duri`, `Hafs`, `Qaloun`, `Shubah`, `Susi`, `Warsh`).
4. **No Interference**: Ensure there is no overlap. A specific page should never mix with a reader or ayahs not assigned to it.
5. **Read Code Carefully**: Read the existing code/data structures thoroughly before any modification.
6. **Isti'adha**: The beginning of any Surah (the first Ayah) must be preceded by Isti'adha (الاستعاذة).
7. **Ask First**: Ask all necessary questions before starting any modification to fully understand the picture.
8. **Ayah Count Differences**: Variations in the number of Ayahs per Qira'ah are normal, but 99% of the text will be similar.
9. **Warsh Audio Format**: The audio reader format for Warsh is slightly different. It starts with the Surah number then Ayah number (e.g., `001002` means Surah 1, Ayah 2). The others are similar but check their formats.
10. **Readers**:
    - Duri: Sheikh Dr. Abdullah bin Awad Al-Juhany
    - Susi: Sheikh Dr. Uthman Al-Siddiqi
    - Shubah, Hafs, Qaloun: Sheikh Ali Al-Hudhaifi
    - Warsh: Sheikh Abdul Basit Abdul Samad
11. **Search Feature**: Searching for a word or Ayah should display the Ayah in ALL available readings, with the reading name next to it. The user can select one and listen to the Sheikh.
12. **Review Manual**: Read the usage guide/manual for each file to understand the Ayahs properly.
13. **Add Font**: Do not forget to include the appropriate Quranic font.
14. **Code Splitting**: Split code files into small, focused modules. Each file should have a single responsibility. Never let a file become too large or complex. This makes future maintenance easy.
15. **No Reverse Ranges**: When selecting a range (from surah/ayah to surah/ayah), reverse selection is FORBIDDEN. The "from" must always be before the "to". Each surah's ayah selector must be limited to that surah's actual ayah count.
16. **Isti'adha Must NOT Replace Ayahs**: The Isti'adha and Basmalah are ADDITIONS before the first ayah. They must NEVER replace or hide any actual Quranic ayah. All ayahs from the data must be displayed.
17. **Audio Download**: When downloading audio, all selected ayahs should be merged into ONE audio file, not individual files in a ZIP.
18. **No Duplicate Ayah Numbers**: Ayah numbers (﴿١﴾) are already embedded inside `aya_text` in the JSON data. Do NOT add extra number elements — they will duplicate.
19. **Code Splitting Requirement**: The code must be divided into small, manageable modules (ui.js, audio.js, etc.) to ensure ease of use and prevent errors.
20. **Archive.org Audio Structures**: Be extremely careful when linking new audio readers from Archive.org. They have completely different partitioning structures! Hafs/Warsh are partitioned by Surah (e.g. 001.zip to 114.zip). Qaloun/Shubah/Duri are partitioned by Juzz (e.g. 01.zip to 30.zip). Susi is entirely within a single zip file. The getAudioPath function MUST use the full Ayah object (which contains the jozz number) to dynamically build these diverse URL paths.
21. **Ayah Counting Mismatches**: When using new audio sources, ensure the MP3s were sliced according to the specific Qira'ah counting rules. For example, Ibrahim Al-Dosari's Warsh audio is sliced using Hafs verse counting (meaning Ayah 1 is split across two mp3 files), whereas the Warsh JSON text uses Warsh counting (combining them into one Ayah). This creates an unresolvable synchronization issue unless a manual mapping file is provided or the audio is replaced with a source sliced correctly for that Qira'ah.

