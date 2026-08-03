import assert from 'node:assert/strict';
import { makeStoredZip, parseStoredZip } from './brand-project-codec.mjs';

const encoder = new TextEncoder();
const entries = [
  { name: 'brand-manifest.json', data: encoder.encode('{"schema":"bassthermal.brand-project.v1"}\n') },
  { name: 'assets/header-mark.png', data: new Uint8Array([0, 1, 2, 3, 254, 255]) }
];
const zip = makeStoredZip(entries);
const files = parseStoredZip(zip);
assert.equal(new TextDecoder().decode(files.get('brand-manifest.json')), '{"schema":"bassthermal.brand-project.v1"}\n');
assert.deepEqual([...files.get('assets/header-mark.png')], [0, 1, 2, 3, 254, 255]);

const corrupted = zip.slice();
const assetOffset = corrupted.findIndex((value, index) => index > 40 && value === 0 && corrupted[index + 1] === 1);
corrupted[assetOffset] ^= 0xff;
assert.throws(() => parseStoredZip(corrupted), /crc mismatch/);

const unsafe = makeStoredZip([{ name: '../bad.txt', data: encoder.encode('x') }]);
assert.throws(() => parseStoredZip(unsafe), /unsafe path/);
console.log('brand project codec tests passed');
