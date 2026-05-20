const https = require('https');
https.get('https://dev.surahapp.com/api/docs/', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const match = data.match(/url:\s*['"]([^'"]+)['"]/);
    if (match) {
      console.log('Swagger URL:', match[1]);
    } else {
      console.log('Not found');
    }
  });
}).on('error', console.error);
