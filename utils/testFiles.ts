import * as fs from 'fs';
import * as path from 'path';

const GENERATED_DIR = path.join(__dirname, '..', 'fixtures', 'generated');

function ensureGeneratedDir(): void {
  if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
  }
}

/**
 * Returns the bytes of a minimal, structurally valid single-page PDF.
 * This is enough for an upload/parsing pipeline to recognize the file as a
 * genuine PDF (correct %PDF header, xref table, trailer) without depending
 * on a PDF-generation library.
 */
function buildMinimalPdfBytes(extraCommentBytes = 0): Buffer {
  const filler = extraCommentBytes > 0 ? `% ${'x'.repeat(extraCommentBytes)}\n` : '';

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  const streamText = '(QA Automation Test CV - John Doe - Software Engineer) Tj';
  const streamContent = `BT /F1 18 Tf 50 700 Td ${streamText} ET`;
  objects.push(
    `5 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`
  );

  let body = `%PDF-1.4\n${filler}`;
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(body, 'latin1'));
    body += obj;
  }

  const xrefStart = Buffer.byteLength(body, 'latin1');
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    xref += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(body + xref + trailer, 'latin1');
}

/** Creates (or overwrites) a small, valid, parseable single-page PDF fixture. */
export function createValidCvPdf(fileName = 'valid-cv.pdf'): string {
  ensureGeneratedDir();
  const filePath = path.join(GENERATED_DIR, fileName);
  fs.writeFileSync(filePath, buildMinimalPdfBytes());
  return filePath;
}

/**
 * Creates a PDF fixture padded past `minSizeMb`, for exercising "file too large"
 * validation. Padding is added as a PDF comment (`% ...`), which keeps the file
 * a structurally valid PDF while inflating its size.
 */
export function createOversizedCvPdf(minSizeMb = 12, fileName = 'oversized-cv.pdf'): string {
  ensureGeneratedDir();
  const filePath = path.join(GENERATED_DIR, fileName);
  const targetBytes = minSizeMb * 1024 * 1024;
  fs.writeFileSync(filePath, buildMinimalPdfBytes(targetBytes));
  return filePath;
}

/** Creates a plain-text file with a .txt extension, for "unsupported file type" validation. */
export function createInvalidFileType(fileName = 'not-a-cv.txt'): string {
  ensureGeneratedDir();
  const filePath = path.join(GENERATED_DIR, fileName);
  fs.writeFileSync(filePath, 'This is a plain text file, not a PDF resume.');
  return filePath;
}

/** Creates a file with a .pdf extension but content that isn't a real PDF (fails magic-byte checks). */
export function createFakePdfExtension(fileName = 'fake-extension.pdf'): string {
  ensureGeneratedDir();
  const filePath = path.join(GENERATED_DIR, fileName);
  fs.writeFileSync(filePath, 'Not actually PDF content, just renamed.');
  return filePath;
}

/** Removes all generated fixtures. Call from a global teardown if you want a clean fixtures/generated dir. */
export function cleanupGeneratedFixtures(): void {
  if (fs.existsSync(GENERATED_DIR)) {
    fs.rmSync(GENERATED_DIR, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// DOCX generator (ไม่พึ่ง library): DOCX คือไฟล์ ZIP ที่ประกอบด้วย XML ไม่กี่ไฟล์
// เราเขียน ZIP แบบ "stored" (ไม่บีบอัด) เอง ซึ่ง Word/parsers ทั่วไปอ่านได้ปกติ
// ---------------------------------------------------------------------------
const CRC_TABLE = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table.push(c >>> 0);
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function buildStoredZip(entries: { name: string; data: Buffer }[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // local file header signature
    local.writeUInt16LE(20, 4);         // version needed
    local.writeUInt16LE(0, 6);          // flags
    local.writeUInt16LE(0, 8);          // method 0 = stored
    local.writeUInt16LE(0, 10);         // mod time
    local.writeUInt16LE(0x21, 12);      // mod date (1980-01-01)
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, nameBuf, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); // central directory signature
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuf);

    offset += local.length + nameBuf.length + data.length;
  }

  const centralBuf = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // end of central directory signature
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...localParts, centralBuf, end]);
}

/** สร้างไฟล์ .docx ที่โครงสร้างถูกต้อง มีข้อความเรซูเม่ตัวอย่าง */
export function createValidCvDocx(fileName = 'valid-cv.docx'): string {
  ensureGeneratedDir();
  const filePath = path.join(GENERATED_DIR, fileName);

  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '</Types>';

  const rels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>';

  const paragraphs = [
    'John Doe - Software Engineer',
    'Skills: TypeScript, React, Node.js, SQL, Playwright, Docker',
    'Experience: 5 years building web applications and test automation.',
    'Education: B.Sc. Computer Science',
  ]
    .map((t) => `<w:p><w:r><w:t>${t}</w:t></w:r></w:p>`)
    .join('');

  const documentXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    `<w:body>${paragraphs}</w:body></w:document>`;

  const zip = buildStoredZip([
    { name: '[Content_Types].xml', data: Buffer.from(contentTypes, 'utf8') },
    { name: '_rels/.rels', data: Buffer.from(rels, 'utf8') },
    { name: 'word/document.xml', data: Buffer.from(documentXml, 'utf8') },
  ]);
  fs.writeFileSync(filePath, zip);
  return filePath;
}
