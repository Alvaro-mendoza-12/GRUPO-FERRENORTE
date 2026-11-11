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
