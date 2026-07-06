const fs = require('fs');
const path = require('path');
const http = require('http');
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg5ZDNiZWE3LTc2YWQtNDUwYi1hNzdiLTg0NGYwOGY1NzMyMCIsInVzZXJuYW1lIjoiYXBwbGljYW50Iiwicm9sZSI6IkFQUExJQ0FOVCIsImlhdCI6MTc4MzMzNTY5OSwiZXhwIjoxNzgzNDIyMDk5fQ.zrGtLW9LYwikf9-F9NIk3ldtVyNeKXql_biKNE7Uzw0';
const pdfPath = path.join(__dirname, 'sample-pdfs', 'sample-2-validation-fails.pdf');
const pdfData = fs.readFileSync(pdfPath);
const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
const CRLF = '\r\n';
let body = '';
body += '--' + boundary + CRLF;
body += 'Content-Disposition: form-data; name="file"; filename="sample-2-validation-fails.pdf"' + CRLF;
body += 'Content-Type: application/pdf' + CRLF + CRLF;
const headerBuf = Buffer.from(body, 'utf-8');
const footerBuf = Buffer.from(CRLF + '--' + boundary + '--' + CRLF, 'utf-8');
const contentBuf = Buffer.concat([headerBuf, pdfData, footerBuf]);
const req = http.request({
  hostname: '127.0.0.1', port: 8080, path: '/api/upload', method: 'POST',
  headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary, 'Content-Length': contentBuf.length, 'Authorization': 'Bearer ' + token },
  timeout: 600000,
}, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => { console.log('Status:', res.statusCode); console.log('Body:', data); process.exit(0); });
});
req.on('error', e => { console.error('Error:', e.message); process.exit(1); });
req.setTimeout(600000);
req.write(contentBuf);
req.end();
