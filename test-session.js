const http = require('http');

const body = JSON.stringify({ name: 'Test Room', mode: 'poker', hostName: 'Alice' });

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/sessions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
};

const req = http.request(options, res => {
  let chunks = '';
  res.on('data', d => chunks += d);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', chunks));
});

req.on('error', e => console.error(e));
req.write(body);
req.end();
