const test = require('node:test');
const assert = require('node:assert/strict');
const { File, Blob } = require('node:buffer');
const fs = require('node:fs');
const vm = require('node:vm');

function validator() {
  assert.ok(fs.existsSync('upload-validation.js'), 'Image validation module must exist');
  return require('../upload-validation.js').validateCatalogImage;
}
const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
const jpeg = Uint8Array.from([255, 216, 255]);
const webp = Buffer.from('RIFF\x04\x00\x00\x00WEBP', 'binary');
const fixtures = [
  ['photo.jpg', 'image/jpeg', jpeg, 'jpg'],
  ['photo.JPEG', 'image/jpeg', jpeg, 'jpg'],
  ['photo.PNG', 'image/png', png, 'png'],
  ['photo.webp', 'image/webp', webp, 'webp'],
  ['photo.gif', 'image/gif', Buffer.from('GIF87a'), 'gif'],
  ['photo.GIF', 'image/gif', Buffer.from('GIF89a'), 'gif'],
];
for (const [name, type, bytes, extension] of fixtures) {
  test(`accepts consistent ${name} and returns normalized extension`, async () => {
    assert.equal(await validator()(new File([bytes], name, { type })), extension);
  });
}
for (const [label, file, reason] of [
  ['empty image', new File([], 'empty.png', { type: 'image/png' }), /vacío/i],
  ['6 MiB image', new File([png, new Uint8Array(6 * 1024 * 1024)], 'large.png', { type: 'image/png' }), /5 MB/i],
  ['one byte over limit', new File([png, new Uint8Array(5 * 1024 * 1024 - 7)], 'large.png', { type: 'image/png' }), /5 MB/i],
  ['false MIME', new File([png], 'image.png', { type: 'text/plain' }), /formato/i],
  ['false extension', new File([png], 'image.exe', { type: 'image/png' }), /formato/i],
  ['missing MIME', new File([png], 'image.png'), /formato/i],
  ['missing extension', new File([png], 'image', { type: 'image/png' }), /formato/i],
  ['SVG', new File(['<svg></svg>'], 'image.svg', { type: 'image/svg+xml' }), /formato/i],
  ['text disguised as PNG', new File(['not an image'], 'image.png', { type: 'image/png' }), /contenido/i],
  ['incompatible signature', new File([jpeg], 'image.png', { type: 'image/png' }), /contenido/i],
  ['incompatible MIME and extension', new File([png], 'image.jpg', { type: 'image/png' }), /formato/i],
  ['truncated PNG signature', new File([png.slice(0, 7)], 'image.png', { type: 'image/png' }), /contenido/i],
  ['RIFF without WEBP', new File([Buffer.from('RIFF\x04\x00\x00\x00WAVE', 'binary')], 'image.webp', { type: 'image/webp' }), /contenido/i],
  ['Blob without filename', new Blob([png], { type: 'image/png' }), /formato/i],
]) {
  test(`rejects ${label}`, async () => {
    await assert.rejects(validator()(file), reason);
  });
}
test('accepts exactly 5 MiB', async () => {
  const file = new File([png, new Uint8Array(5 * 1024 * 1024 - 8)], 'limit.png', { type: 'image/png' });
  assert.equal(await validator()(file), 'png');
});
test('is available in browser classic scripts without CommonJS', async () => {
  validator();
  const context = vm.createContext({ Uint8Array });
  vm.runInContext(fs.readFileSync('upload-validation.js', 'utf8'), context);
  assert.equal(await context.validateCatalogImage(new File([png], 'photo.png', { type: 'image/png' })), 'png');
});

function technicalSheetValidator() {
  const validate = require('../upload-validation.js').validateTechnicalSheet;
  assert.equal(typeof validate, 'function', 'Technical sheet validation must be available');
  return validate;
}
const pdf = Buffer.from('%PDF-1.7\n');
const doc = Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const docx = Uint8Array.from([0x50, 0x4b, 0x03, 0x04]);
const docxMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
for (const [name, type, bytes, extension] of [
  ['sheet.PDF', 'application/pdf', pdf, 'pdf'],
  ['sheet.doc', 'application/msword', doc, 'doc'],
  ['sheet.DOCX', docxMime, docx, 'docx'],
  ['sheet.pdf', 'application/octet-stream', pdf, 'pdf'],
  ['sheet.doc', 'application/octet-stream', doc, 'doc'],
  ['sheet.docx', 'application/octet-stream', docx, 'docx'],
  ['sheet.pdf', '', pdf, 'pdf'],
  ['sheet.doc', '', doc, 'doc'],
  ['sheet.docx', '', docx, 'docx'],
]) test(`accepts technical sheet ${name} with ${type || 'unknown browser MIME'}`, async () => {
  assert.equal(await technicalSheetValidator()(new File([bytes], name, { type })), extension);
});
for (const [label, file, reason] of [
  ['missing file', null, /vacío/i],
  ['empty PDF', new File([], 'sheet.pdf', { type: 'application/pdf' }), /vacío/i],
  ['HTML', new File(['<html>not a sheet</html>'], 'sheet.html', { type: 'text/html' }), /formato/i],
  ['PDF with HTML MIME', new File([pdf], 'sheet.pdf', { type: 'text/html' }), /formato/i],
  ['mismatching Word MIME', new File([doc], 'sheet.doc', { type: docxMime }), /formato/i],
  ['PDF disguised as Word', new File([pdf], 'sheet.doc', { type: 'application/msword' }), /contenido/i],
  ['HTML disguised as PDF', new File(['<html>not a sheet</html>'], 'sheet.pdf', { type: 'application/pdf' }), /contenido/i],
  ['HTML with generic MIME', new File(['<html>not a sheet</html>'], 'sheet.pdf', { type: 'application/octet-stream' }), /contenido/i],
  ['HTML with absent MIME', new File(['<html>not a sheet</html>'], 'sheet.pdf'), /contenido/i],
  ['truncated PDF signature', new File(['%PDF'], 'sheet.pdf', { type: 'application/pdf' }), /contenido/i],
  ['invalid PDF version', new File(['%PDF-xxx'], 'sheet.pdf', { type: 'application/pdf' }), /contenido/i],
  ['truncated DOC signature', new File([doc.slice(0, 7)], 'sheet.doc', { type: 'application/msword' }), /contenido/i],
  ['truncated DOCX signature', new File([docx.slice(0, 3)], 'sheet.docx', { type: docxMime }), /contenido/i],
  ['HTML disguised as DOCX', new File(['<html>not a sheet</html>'], 'sheet.docx', { type: docxMime }), /contenido/i],
  ['missing extension', new File([pdf], 'sheet', { type: 'application/pdf' }), /formato/i],
  ['double-extension HTML', new File([pdf], 'sheet.pdf.html', { type: 'application/pdf' }), /formato/i],
  ['one byte over 10 MiB', new File([pdf, new Uint8Array(10 * 1024 * 1024 - pdf.length + 1)], 'sheet.pdf', { type: 'application/pdf' }), /10 MiB/i],
]) test(`rejects technical sheet ${label}`, async () => {
  await assert.rejects(technicalSheetValidator()(file), reason);
});
test('technical sheet accepts exactly 10 MiB', async () => {
  const file = new File([pdf, new Uint8Array(10 * 1024 * 1024 - pdf.length)], 'sheet.pdf', { type: 'application/pdf' });
  assert.equal(await technicalSheetValidator()(file), 'pdf');
});
test('technical sheet read failures explain how to recover', async () => {
  const file = { name: 'sheet.pdf', type: 'application/pdf', size: 9, slice() { throw Error('unavailable'); } };
  await assert.rejects(technicalSheetValidator()(file), /no se pudo leer.*selecciona/i);
});
test('technical sheet validator is available in browser classic scripts', async () => {
  const context = vm.createContext({ Uint8Array });
  vm.runInContext(fs.readFileSync('upload-validation.js', 'utf8'), context);
  assert.equal(typeof context.validateTechnicalSheet, 'function');
  assert.equal(await context.validateTechnicalSheet(new File([pdf], 'sheet.PDF', { type: 'application/pdf' })), 'pdf');
});
