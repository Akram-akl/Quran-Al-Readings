const https = require('https');
const fs = require('fs');

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function run() {
    try {
        console.log("Fetching Mokhtasar...");
        const mData = await fetchJson('https://dev.surahapp.com/api/v1/aya/tafsir-mokhtasar/2/5');
        console.log("Mokhtasar Aya Text chars:");
        for(let i=0; i<mData.aya_text.length; i++) {
            console.log(mData.aya_text[i], mData.aya_text.charCodeAt(i).toString(16));
        }
        
        console.log("Mokhtasar Content chars (last 50):");
        const mc = mData.content.slice(-50);
        for(let i=0; i<mc.length; i++) {
            console.log(mc[i], mc.charCodeAt(i).toString(16));
        }

        console.log("\nFetching Katheer...");
        const kData = await fetchJson('https://dev.surahapp.com/api/v1/aya/tafsir-katheer/1/1');
        
        console.log("Katheer Content sample (first 200 chars):");
        console.log(kData.content.substring(0, 200));
        
        // Test footnote regex
        console.log("\nTesting Regex on Katheer...");
        const text = kData.content;
        const footnotes = [];
        let html = text.replace(/\n/g, '<br>');
        
        const regex = /(?:¬[^¥]*¥|\([^)]*(?:[أا]خرجه|[اأ]نظر|رواه|متفق)[^)]*\)|\[[^\]]*(?:[أا]خرجه|[اأ]نظر|رواه|متفق)[^\]]*\]|(?:[أا]خرجه|[اأ]نظر|رواه|متفق)[^.؛<]*(?:[.؛]|$))/g;
        html = html.replace(regex, (match) => {
            footnotes.push(match);
            return `[SUP]`;
        });
        
        console.log("Found footnotes:", footnotes.length);
        footnotes.slice(0, 5).forEach((f, i) => console.log(`${i}: ${f}`));
        
    } catch(e) {
        console.error("Error:", e);
    }
}

run();
