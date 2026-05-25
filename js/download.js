/**
 * download.js - تحميل الآيات كصورة أو صوت مدمج مقارن
 */
const DownloadManager = {
    modal: null,
    _surahsCache: null,

    init() {
        this.modal = document.getElementById('downloadModal');
        const dlOpenBtn = document.getElementById('downloadOpenBtn');
        if (dlOpenBtn) dlOpenBtn.addEventListener('click', () => this.open());
        
        const closeBtn = this.modal.querySelector('.close-modal');
        if (closeBtn) closeBtn.addEventListener('click', () => this.close());
        
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });
        document.getElementById('startDownloadBtn').addEventListener('click', () => this.execute());

        document.getElementById('dlFromSurah').addEventListener('change', () => this._updateAyahLimit('dlFromSurah', 'dlFromAyah'));
        document.getElementById('dlToSurah').addEventListener('change', () => this._updateAyahLimit('dlToSurah', 'dlToAyah'));
        
        // إعادة قراءة حدود السور عند تغيير القارئ/الرواية بداخل مودال التحميل
        const reciterSel = document.getElementById('dlReciter');
        if (reciterSel) reciterSel.addEventListener('change', () => this._populateSurahSelects());
    },

    async open() {
        await this._populateSurahSelects();
        this.modal.classList.add('active');
    },

    close() {
        this.modal.classList.remove('active');
        document.getElementById('downloadStatus').textContent = '';
    },

    async _populateSurahSelects() {
        const readingKey = document.getElementById('dlReciter').value || App.currentReading;
        let currentData = DataHandler.cache[readingKey];
        if (!currentData) {
            try {
                currentData = await DataHandler.loadReading(readingKey);
            } catch (e) {
                console.error("Failed to load reading inside download modal:", e);
            }
        }
        if (!currentData) currentData = DataHandler.cache[App.currentReading];
        if (!currentData) return;
        this._surahsCache = DataHandler.getSurahs(currentData);

        const dlFrom = document.getElementById('dlFromSurah');
        const dlTo = document.getElementById('dlToSurah');
        
        if (dlFrom && dlTo) {
            const optionsHtml = this._surahsCache.map(s => `<option value="${s.number}">${s.number}. ${s.nameAr}</option>`).join('');
            dlFrom.innerHTML = optionsHtml;
            dlTo.innerHTML = optionsHtml;
        }

        if (App.currentSurah) {
            document.getElementById('dlFromSurah').value = App.currentSurah;
            document.getElementById('dlToSurah').value = App.currentSurah;
        }

        this._updateAyahLimit('dlFromSurah', 'dlFromAyah');
        this._updateAyahLimit('dlToSurah', 'dlToAyah');
    },

    /** تحديث الحد الأقصى لرقم الآية بناء على السورة المختارة */
    _updateAyahLimit(surahSelectId, ayahSelectId) {
        const surahNo = parseInt(document.getElementById(surahSelectId).value);
        const ayahSelect = document.getElementById(ayahSelectId);
        if (!this._surahsCache || !ayahSelect) return;
        const surah = this._surahsCache.find(s => s.number === surahNo);
        if (surah) {
            const currentVal = parseInt(ayahSelect.value) || 1;
            let optionsHtml = '';
            for (let i = 1; i <= surah.ayahCount; i++) {
                optionsHtml += `<option value="${i}">${i}</option>`;
            }
            ayahSelect.innerHTML = optionsHtml;
            if (currentVal <= surah.ayahCount) {
                ayahSelect.value = currentVal;
            } else {
                ayahSelect.value = 1;
            }
        }
    },

    /** التحقق من صحة النطاق */
    _validateRange() {
        const surahFrom = parseInt(document.getElementById('dlFromSurah').value);
        const ayahFrom = parseInt(document.getElementById('dlFromAyah').value);
        const surahTo = parseInt(document.getElementById('dlToSurah').value);
        const ayahTo = parseInt(document.getElementById('dlToAyah').value);
        const statusEl = document.getElementById('downloadStatus');

        if (surahTo < surahFrom) {
            statusEl.textContent = '⚠️ لا يمكن أن تكون سورة النهاية قبل سورة البداية';
            return null;
        }
        if (surahFrom === surahTo && ayahTo < ayahFrom) {
            statusEl.textContent = '⚠️ لا يمكن أن تكون آية النهاية قبل آية البداية';
            return null;
        }
        return { surahFrom, ayahFrom, surahTo, ayahTo };
    },

    async execute() {
        const range = this._validateRange();
        if (!range) return;
        const readingKey = document.getElementById('dlReciter').value;
        const statusEl = document.getElementById('downloadStatus');

        statusEl.textContent = 'جاري التجهيز...';

        const data = await DataHandler.loadReading(readingKey);
        if (!data || data.length === 0) {
            statusEl.textContent = 'خطأ في تحميل البيانات';
            return;
        }

        const ayahs = this._getAyahsInRange(data, range);
        if (ayahs.length === 0) {
            statusEl.textContent = 'لم يتم العثور على آيات في هذا النطاق';
            return;
        }
        if (ayahs.length > 300) {
            statusEl.textContent = 'عفواً، لا يمكن تحميل أكثر من 300 آية دفعة واحدة للحفاظ على استقرار التطبيق.';
            return;
        }

        const type = document.getElementById('downloadType').value;
        this._currentDownloadBlob = null;
        this._currentDownloadFilename = null;

        if (type === 'image') {
            await this._downloadAsImage(ayahs, readingKey, statusEl);
        } else {
            await this._downloadAsMergedAudio(ayahs, readingKey, statusEl);
        }
    },

    /** استخراج الآيات في النطاق المحدد */
    _getAyahsInRange(data, { surahFrom, ayahFrom, surahTo, ayahTo }) {
        return data.filter(a => {
            if (a.aya_no === 0) return false;
            if (surahFrom === surahTo) {
                return a.sura_no === surahFrom && a.aya_no >= ayahFrom && a.aya_no <= ayahTo;
            }
            if (a.sura_no === surahFrom) return a.aya_no >= ayahFrom;
            if (a.sura_no === surahTo) return a.aya_no <= ayahTo;
            return a.sura_no > surahFrom && a.sura_no < surahTo;
        }).sort((a, b) => a.sura_no !== b.sura_no ? a.sura_no - b.sura_no : a.aya_no - b.aya_no);
    },

    async _downloadAsImage(ayahs, readingKey, statusEl) {
        statusEl.textContent = 'جاري إنشاء الصورة...';
        const config = READINGS_CONFIG[readingKey];
        const captureArea = document.getElementById('imageCaptureArea');

        // إزالة الجزء بين القوسين للحصول على تسمية نظيفة خالية من اسم القارئ في عنوان الصورة
        const cleanName = config.name.replace(/\s*\(.*\)/g, '');

        let html = `<div style="direction:rtl;text-align:center;padding:40px 30px;max-width:800px;background:#fff;font-family:'${config.fontFamily}',serif;">`;
        html += `<h2 style="color:#10b981;margin-bottom:20px;font-family:sans-serif;">رواية ${cleanName}</h2>`;

        let currentSurah = null;
        ayahs.forEach(a => {
            if (a.sura_no !== currentSurah) {
                currentSurah = a.sura_no;
                html += `<h3 style="color:#064e3b;margin:15px 0;font-family:sans-serif;">سورة ${a.sura_name_ar}</h3>`;
            }
            html += `<span style="font-size:28px;line-height:2;">${a.aya_text} </span>`;
        });
        html += '</div>';
        captureArea.innerHTML = html;

        try {
            if (typeof html2canvas === 'undefined') {
                statusEl.textContent = 'مكتبة الصور لم يتم تحميلها بشكل صحيح!';
                return;
            }
            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }
            await new Promise(r => setTimeout(r, 200));

            const canvas = await html2canvas(captureArea, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            if (!blob) {
                statusEl.textContent = 'فشل إنشاء ملف الصورة';
                return;
            }
            const filename = `quran_${readingKey}_${ayahs[0].sura_no}_${ayahs[0].aya_no}.png`;
            this._currentDownloadBlob = blob;
            this._currentDownloadFilename = filename;
            const result = await SaveFile.save(blob, filename);
            
            if (result.ok) {
                statusEl.innerHTML = result.method === 'gallery'
                    ? 'تم الحفظ في المعرض ✓'
                    : result.method === 'filesystem'
                        ? 'تم الحفظ في مجلد الصور ✓'
                        : 'تم التحميل بنجاح ✓';
                this._showShareButton(statusEl);
            } else if (result.cancelled) {
                statusEl.textContent = 'تم الإلغاء';
            } else {
                statusEl.textContent = result.message || 'تعذّر حفظ الصورة على هذا الجهاز';
                this._showShareButton(statusEl);
            }
        } catch (err) {
            statusEl.textContent = 'حدث خطأ أثناء إنشاء الصورة';
            console.error(err);
        }
        captureArea.innerHTML = '';
    },

    /** تحميل صوت مدمج - كل الآيات في ملف واحد */
    async _downloadAsMergedAudio(ayahs, readingKey, statusEl) {
        const config = READINGS_CONFIG[readingKey];
        if (!config) {
            statusEl.textContent = 'خطأ: الإعدادات غير موجودة';
            return;
        }

        statusEl.textContent = 'جاري تهيئة معالج الصوت...';
        
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            statusEl.textContent = 'متصفحك لا يدعم معالجة الصوت المتقدمة';
            return;
        }

        const audioCtx = new AudioContextClass();
        const segmentBuffers = [];

        const hafsConfig = READINGS_CONFIG['Hafs'];
        const istiazahUrl = (config.getIstiazahPath && typeof config.getIstiazahPath === 'function') 
            ? config.getIstiazahPath() 
            : hafsConfig.getIstiazahPath();
        const basmalahUrl = (config.getBasmalahPath && typeof config.getBasmalahPath === 'function') 
            ? config.getBasmalahPath() 
            : hafsConfig.getBasmalahPath();

        async function fetchAndDecode(url) {
            const resp = await fetch(url, { mode: 'cors' });
            if (!resp.ok) throw new Error("Failed to fetch audio file from: " + url);
            const arrayBuffer = await resp.arrayBuffer();
            return await audioCtx.decodeAudioData(arrayBuffer);
        }

        // تجميع الآيات حسب السورة لتسهيل المعالجة
        const groupedBySurah = {};
        ayahs.forEach(a => {
            if (!groupedBySurah[a.sura_no]) groupedBySurah[a.sura_no] = [];
            groupedBySurah[a.sura_no].push(a);
        });

        const sortedSuraNos = Object.keys(groupedBySurah).map(Number).sort((a, b) => a - b);
        let currentAyahIndex = 0;

        try {
            for (let i = 0; i < sortedSuraNos.length; i++) {
                const suraNo = sortedSuraNos[i];
                const suraAyahs = groupedBySurah[suraNo];
                
                let monolithicBuffer = null;
                let timingData = null;
                
                if (config.isMonolithic) {
                    statusEl.textContent = `جاري تحميل ملف صوت سورة ${suraNo}...`;
                    const suraAudioUrl = config.getAudioPath(suraNo);
                    monolithicBuffer = await fetchAndDecode(suraAudioUrl);
                    
                    statusEl.textContent = `جاري تحميل توقيت سورة ${suraNo}...`;
                    const timingUrl = config.getTimingPath(suraNo);
                    const timingRes = await fetch(timingUrl);
                    timingData = await timingRes.json();
                }

                for (let j = 0; j < suraAyahs.length; j++) {
                    const ayah = suraAyahs[j];
                    currentAyahIndex++;
                    statusEl.textContent = `جاري تجهيز الآية ${currentAyahIndex} من ${ayahs.length}...`;

                    // إذا كانت الآية هي الأولى في السورة، نضيف الاستعاذة والبسملة
                    if (ayah.aya_no === 1) {
                        // الاستعاذة لقبل سورة الفاتحة فقط
                        if (suraNo === 1 && ayah.aya_no === 1) {
                            try {
                                statusEl.textContent = `جاري إدراج الاستعاذة...`;
                                const istBuffer = await fetchAndDecode(istiazahUrl);
                                segmentBuffers.push(istBuffer);
                            } catch (e) {
                                console.warn("Failed to load Istiazah, skipping...", e);
                            }
                        }
                        
                        // البسملة لجميع السور عدا سورة التوبة (9) وسورة الفاتحة (1)
                        if (suraNo !== 9 && suraNo !== 1) {
                            try {
                                statusEl.textContent = `جاري إدراج البسملة...`;
                                const basBuffer = await fetchAndDecode(basmalahUrl);
                                segmentBuffers.push(basBuffer);
                            } catch (e) {
                                console.warn("Failed to load Basmalah, skipping...", e);
                            }
                        }
                    }

                    // استخلاص الصوت للآية الحالية
                    if (config.isMonolithic) {
                        const timing = timingData.find(t => t.ayah === ayah.aya_no);
                        if (timing) {
                            const startSec = (timing.start_time / 1000) + (config.timeOffset || 0);
                            const endSec = (timing.end_time / 1000) + (config.timeOffset || 0);
                            const sliced = this._sliceAudioBuffer(audioCtx, monolithicBuffer, startSec, endSec);
                            if (sliced) segmentBuffers.push(sliced);
                        } else {
                            console.warn(`توقيت الآية ${ayah.aya_no} غير متوفر في سورة ${suraNo}`);
                        }
                    } else {
                        // في الروايات غير المدمجة (1:1)
                        let mappedHafsAyahs = [ayah.aya_no];
                        if (typeof AUDIO_MAP !== 'undefined') {
                            const rKey = config.audioMapKey || readingKey;
                            if (AUDIO_MAP[rKey] && AUDIO_MAP[rKey][suraNo] && AUDIO_MAP[rKey][suraNo][ayah.aya_no]) {
                                mappedHafsAyahs = AUDIO_MAP[rKey][suraNo][ayah.aya_no];
                            }
                        }

                        for (const hafsAya of mappedHafsAyahs) {
                            const ayahUrl = config.getAudioPath({
                                sura_no: suraNo,
                                aya_no: hafsAya,
                                jozz: ayah.jozz
                            });
                            try {
                                const ayaBuffer = await fetchAndDecode(ayahUrl);
                                segmentBuffers.push(ayaBuffer);
                            } catch (e) {
                                console.warn(`فشل تحميل الآية ${hafsAya}، تخطي...`, e);
                            }
                        }
                    }
                }
            }

            if (segmentBuffers.length === 0) {
                statusEl.textContent = 'خطأ: لم يتم تجهيز أي مقاطع صوتية صالحة للدمج';
                return;
            }

            statusEl.textContent = 'جاري دمج المقاطع الصوتية...';
            const mergedBuffer = this._mergeAudioBuffers(audioCtx, segmentBuffers);
            if (!mergedBuffer) {
                statusEl.textContent = 'فشل دمج الملفات الصوتية';
                return;
            }

            statusEl.textContent = 'جاري تشفير وتجهيز ملف التحميل (WAV)...';
            const wavBlob = this._bufferToWav(mergedBuffer);
            const filename = `quran_${readingKey}_${ayahs[0].sura_no}-${ayahs[0].aya_no}_to_${ayahs[ayahs.length-1].sura_no}-${ayahs[ayahs.length-1].aya_no}.wav`;
            
            this._currentDownloadBlob = wavBlob;
            this._currentDownloadFilename = filename;
            
            const result = await SaveFile.save(wavBlob, filename);
            if (result.ok) {
                statusEl.innerHTML = 'تم تجهيز الملف الصوتي ✓';
                this._showShareButton(statusEl);
            } else if (result.cancelled) {
                statusEl.textContent = 'تم الإلغاء';
            } else {
                statusEl.textContent = result.message || 'تعذّر حفظ الملف الصوتي';
                this._showShareButton(statusEl);
            }

        } catch (err) {
            console.error(err);
            statusEl.textContent = 'حدث خطأ أثناء تحميل ودمج الصوت: ' + err.message;
        } finally {
            audioCtx.close();
        }
    },

    _showShareButton(statusEl) {
        const hasNativeShare = window.Capacitor?.Plugins?.Share;
        if (!navigator.share && !hasNativeShare) return;
        
        const shareBtn = document.createElement('button');
        shareBtn.className = 'btn btn-secondary';
        shareBtn.style.cssText = 'margin-top:10px;width:100%;display:flex;align-items:center;justify-content:center;gap:8px;';
        shareBtn.innerHTML = '<i class="fas fa-share-alt"></i> مشاركة الملف';
        
        shareBtn.onclick = async () => {
            if (!this._currentDownloadBlob) return;
            shareBtn.disabled = true;
            shareBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري...';
            try {
                const result = await SaveFile.share(this._currentDownloadBlob, this._currentDownloadFilename);
                if (result.cancelled) {
                    shareBtn.innerHTML = '<i class="fas fa-share-alt"></i> مشاركة الملف';
                } else if (result.ok) {
                    shareBtn.innerHTML = '<i class="fas fa-check"></i> تمت المشاركة';
                } else {
                    shareBtn.innerHTML = '<i class="fas fa-share-alt"></i> مشاركة الملف';
                }
            } catch (err) {
                console.warn('Share failed:', err);
                shareBtn.innerHTML = '<i class="fas fa-share-alt"></i> مشاركة الملف';
            }
            shareBtn.disabled = false;
        };
        
        statusEl.appendChild(shareBtn);
    },

    _sliceAudioBuffer(audioCtx, buffer, startSec, endSec) {
        const sampleRate = buffer.sampleRate;
        const startSample = Math.max(0, Math.floor(startSec * sampleRate));
        const endSample = Math.min(buffer.length, Math.floor(endSec * sampleRate));
        const frameCount = endSample - startSample;
        
        if (frameCount <= 0) return null;
        
        const slicedBuffer = audioCtx.createBuffer(buffer.numberOfChannels, frameCount, sampleRate);
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const inputData = buffer.getChannelData(channel);
            const outputData = slicedBuffer.getChannelData(channel);
            for (let i = 0; i < frameCount; i++) {
                outputData[i] = inputData[startSample + i];
            }
        }
        return slicedBuffer;
    },

    _mergeAudioBuffers(audioCtx, buffers) {
        if (buffers.length === 0) return null;
        const totalLength = buffers.reduce((acc, val) => acc + val.length, 0);
        const numberOfChannels = buffers[0].numberOfChannels;
        const sampleRate = buffers[0].sampleRate;
        
        const mergedBuffer = audioCtx.createBuffer(numberOfChannels, totalLength, sampleRate);
        
        for (let i = 0; i < numberOfChannels; i++) {
            let offset = 0;
            const channelData = mergedBuffer.getChannelData(i);
            for (const buf of buffers) {
                channelData.set(buf.getChannelData(i), offset);
                offset += buf.length;
            }
        }
        return mergedBuffer;
    },

    _bufferToWav(buffer) {
        const numOfChan = buffer.numberOfChannels;
        const length = buffer.length * numOfChan * 2 + 44;
        const bufferArr = new ArrayBuffer(length);
        const view = new DataView(bufferArr);
        const channels = [];
        let pos = 0;

        const setUint16 = (data) => {
            view.setUint16(pos, data, true);
            pos += 2;
        };

        const setUint32 = (data) => {
            view.setUint32(pos, data, true);
            pos += 4;
        };

        // write WAV header
        setUint32(0x46464952);                         // "RIFF"
        setUint32(length - 8);                         // file length - 8
        setUint32(0x45564157);                         // "WAVE"

        setUint32(0x20746d66);                         // "fmt " chunk
        setUint32(16);                                 // chunk length
        setUint16(1);                                  // sample format (raw PCM)
        setUint16(numOfChan);
        setUint32(buffer.sampleRate);
        setUint32(buffer.sampleRate * 2 * numOfChan); // byte rate
        setUint16(numOfChan * 2);                      // block align
        setUint16(16);                                 // bits per sample

        setUint32(0x61746164);                         // "data" chunk
        setUint32(length - pos - 4);                   // chunk length

        for (let i = 0; i < buffer.numberOfChannels; i++) {
            channels.push(buffer.getChannelData(i));
        }

        let offset = 0;
        while (pos < length) {
            for (let i = 0; i < numOfChan; i++) {
                let sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
                sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;      // scale to 16-bit
                view.setInt16(pos, sample, true);
                pos += 2;
            }
            offset++;
        }

        return new Blob([bufferArr], { type: 'audio/wav' });
    }
};
