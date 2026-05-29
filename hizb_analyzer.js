const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/hafsData_v2-0.json', 'utf8'));

let countsByJuzz = {};
data.forEach(a => {
    if (!countsByJuzz[a.jozz]) countsByJuzz[a.jozz] = 0;
    if (a.aya_text.includes('۞')) {
        countsByJuzz[a.jozz]++;
    }
});
console.log(countsByJuzz);
