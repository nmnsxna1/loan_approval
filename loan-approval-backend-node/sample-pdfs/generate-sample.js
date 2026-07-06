const fs = require('fs');

// Minimal valid PDF with readable text content
function createPdf(text) {
  let objNum = 0;
  const objects = [];
  const offsets = [];

  function addObj(content) {
    objNum++;
    offsets.push(null);
    const idx = objNum;
    return { ref: `${idx} 0 R`, write: () => {
      offsets[idx - 1] = Buffer.byteLength(objects.join(''));
      return `${idx} 0 obj\n${content}\nendobj\n`;
    }};
  }

  // Escape PDF string
  function esc(s) {
    return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  const font = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');
  const pagesContent = addObj(`<< /Length ${text.length + 50} >>\nstream\nBT /F1 12 Tf 50 700 Td (${esc(text)}) Tj ET\nendstream`);
  const page = addObj(`<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents ${pagesContent.ref} /Resources << /Font << /F1 ${font.ref} >> >> >>`);
  const pages = addObj(`<< /Type /Pages /Kids [${page.ref}] /Count 1 >>`);
  const catalog = addObj('<< /Type /Catalog /Pages ' + pages.ref + ' >>');

  return objNum;
}

const content = `LOAN APPLICATION FORM
=====================
Name: John Doe
DOB: 15/08/1990
Gender: Male
PAN: ABCDE1234F
Aadhaar: 123456789012
Phone: 9876543210
Email: john.doe@example.com
Address: 123, MG Road, Bangalore - 560001
Occupation: Software Engineer
Employer: Tech Corp
Monthly Income: 125000
Loan Amount: 5000000
Loan Purpose: Home renovation
Bank: HDFC Bank, A/C: 50123456789`;

function genPdf(text) {
  let objs = '';
  let objCount = 0;
  const offsets = [];
  function obj(content) {
    objCount++;
    offsets.push(0);
    const idx = objCount;
    return { ref: `${idx} 0 R`, w: () => {
      offsets[idx - 1] = Buffer.byteLength(objs);
      objs += `${idx} 0 obj\n${content}\nendobj\n`;
    }};
  }
  function esc(s) { return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }

  const f = obj('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');
  const cont = obj(`<< /Length ${text.length + 60} >>\nstream\nBT /F1 12 Tf 30 750 Td (${esc(text)}) Tj ET\nendstream`);
  const p = obj(`<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents ${cont.ref} /Resources << /Font << /F1 ${f.ref} >> >> >>`);
  const kids = obj(`<< /Type /Pages /Kids [${p.ref}] /Count 1 >>`);
  const cat = obj('<< /Type /Catalog /Pages ' + kids.ref + ' >>');

  f.w(); cont.w(); p.w(); kids.w(); cat.w();

  let pdf = '%PDF-1.4\n%\xFF\xFF\xFF\xFF\n' + objs;
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += 'xref\n';
  pdf += `0 ${objCount + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 0; i < objCount; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += 'trailer\n<< /Size ' + (objCount + 1) + ' /Root 5 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF';

  return pdf;
}

const pdf1 = `LOAN APPLICATION - ALL CORRECT
Applicant: John Doe
DOB: 15/08/1990
Gender: Male
PAN: ABCDE1234F
Aadhaar: 123456789012
Phone: 9876543210
Email: john.doe@example.com
Address: 123, Greenfield Apartments, MG Road, Bangalore - 560001
Occupation: Software Engineer
Employer: Tech Solutions Pvt Ltd
Monthly Income: 125000
Loan Amount: 5000000
Loan Purpose: Home renovation and extension
Bank Details: HDFC Bank, A/C: 50123456789, IFSC: HDFC0001234`;

const pdf2 = `LOAN APPLICATION - VALIDATION WILL FAIL
Applicant:
DOB:
Gender:
PAN: INVALID
Phone: 12345
Email: not-an-email
Monthly Income: 5000
Loan Amount: 1000000
Occupation: Unemployed`;

const pdf3 = `LOAN APPLICATION - HIGH RISK
Applicant: Robert Wilson
DOB: 05/12/1985
PAN: XYZZZ9999Z
Phone: 9988776655
Email: robert@example.com
Address: 456, Park Street, Mumbai - 400001
Occupation: Daily Wage Worker
Employer: Various
Monthly Income: 15000
Loan Amount: 5000000
Previous defaults: Yes`;

fs.writeFileSync('sample-1-all-correct.pdf', genPdf(pdf1));
fs.writeFileSync('sample-2-validation-fails.pdf', genPdf(pdf2));
fs.writeFileSync('sample-3-high-risk.pdf', genPdf(pdf3));
console.log('Generated 3 sample PDFs');
