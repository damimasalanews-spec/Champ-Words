const http = require('http');
const TOKEN = 'tiktok-developers-site-verification=Xihh5P7diAd8xwVfphqqiW10vKzUdNv1';

const server = http.createServer((req, res) => {
  console.log(`[VERIFY] ${req.method} ${req.url}`);
  if (req.url.includes('tiktok')) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(TOKEN);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!doctype html><html><head><meta name="tiktok-developers-site-verification" content="Xihh5P7diAd8xwVfphqqiW10vKzUdNv1"></head><body>OK</body></html>`);
  }
});

server.listen(3001, () => console.log('Verify server on :3001'));
