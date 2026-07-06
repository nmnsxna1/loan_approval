const fs = require('fs');

function genPdf(text) {
  const esc = s => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  const header = '%PDF-1.4\n%\xFF\xFF\xFF\xFF\n';
  const headerLen = Buffer.byteLength(header);

  const parts = [];
  let n = 0;
  const offs = [];

  let bodyOffset = headerLen;
  function add(content) {
    n++;
    const i = n;
    return {
      ref: i + ' 0 R',
      emit: function() {
        offs[i] = bodyOffset;
        const line = i + ' 0 obj\n' + content + '\nendobj';
        bodyOffset += Buffer.byteLength(line) + 1;
        parts.push(line);
      }
    };
  }

  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');
  const tx = esc(text);
  const cont = add('<< /Length ' + (tx.length + 5) + ' >>\nstream\nBT /F1 12 Tf 30 750 Td (' + tx + ') Tj ET\nendstream');
  const page = add('<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents ' + cont.ref + ' /Resources << /Font << /F1 ' + font.ref + ' >> >> >>');
  const pages = add('<< /Type /Pages /Kids [' + page.ref + '] /Count 1 >>');
  const catalog = add('<< /Type /Catalog /Pages ' + pages.ref + ' >>');

  font.emit(); cont.emit(); page.emit(); pages.emit(); catalog.emit();

  const body = parts.join('\n');
  const xrefOffset = bodyOffset + 1; // +1 for \r in the \r\n separator between body and xref

  let pdf = header + body + '\r\n';
  pdf += 'xref\r\n0 ' + (n + 1) + '\r\n0000000000 65535 f \r\n';
  for (let i = 1; i <= n; i++) {
    pdf += String(offs[i]).padStart(10, '0') + ' 00000 n \r\n';
  }
  pdf += 'trailer\r\n<< /Size ' + (n + 1) + ' /Root 5 0 R >>\r\nstartxref\r\n' + xrefOffset + '\r\n%%EOF';
  return pdf;
}

const samples = [
  { file: 'sample-1-all-correct.pdf', text: 'LOAN APPLICATION FORM\nName: Rahul Sharma\nAge: 32\nSalary: 85000\nPAN: ABCDE1234F\nEmail: rahul@email.com\nAddress: 42, MG Road, Bangalore\nOccupation: Software Engineer\nLoan Amount: 2500000' },
  { file: 'sample-2-validation-fails.pdf', text: 'LOAN APPLICATION\nName: \nPAN: INVALID\nPhone: 12345\nSalary: 5000\nLoan Amount: 1000000\nOccupation: Unemployed' },
  { file: 'sample-3-high-risk.pdf', text: 'LOAN APPLICATION\nName: Robert Wilson\nPAN: XYZZZ9999Z\nPhone: 9988776655\nSalary: 15000\nLoan Amount: 5000000\nPrevious defaults: Yes' },
];

samples.forEach(s => {
  fs.writeFileSync('sample-pdfs/' + s.file, genPdf(s.text));
  console.log('Generated: ' + s.file);
});
