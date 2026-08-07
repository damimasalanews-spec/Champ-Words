const https = require('https');

const gistData = JSON.stringify({
  files: {
    'tiktok-developers-site-verification=Xihh5P7diAd8xwVfphqqiW10vKzUdNv1': {
      content: 'tiktok-developers-site-verification=Xihh5P7diAd8xwVfphqqiW10vKzUdNv1'
    },
    'index.html': {
      content: '<!doctype html><html><head><meta name="tiktok-developers-site-verification" content="Xihh5P7diAd8xwVfphqqiW10vKzUdNv1"></head><body>OK</body></html>'
    }
  },
  public: true,
  description: 'TikTok site verification'
});

const req = https.request({
  hostname: 'api.github.com',
  path: '/gists',
  method: 'POST',
  headers: {
    'User-Agent': 'node',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(gistData)
  }
}, res => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    const gist = JSON.parse(body);
    if (gist.html_url) {
      console.log('Gist URL:', gist.html_url);
      // raw URL for verification
      const rawBase = gist.html_url.replace('gist.github.com', 'gist.githubusercontent.com') + '/raw';
      console.log('Raw Base:', rawBase);
    } else {
      console.log('Error:', body);
    }
  });
});
req.write(gistData);
req.end();
