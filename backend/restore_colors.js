import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

const logoPath = path.resolve('../frontend/src/assets/vedixa_logo.png');

// First, check if there is a backup or we re-decode the raw scanlines correctly
const buffer = fs.readFileSync(logoPath);

let offset = 8;
let width = 0, height = 0;
const idatChunks = [];

while (offset < buffer.length) {
  const length = buffer.readUInt32BE(offset);
  const type = buffer.slice(offset + 4, offset + 8).toString('ascii');
  const data = buffer.slice(offset + 8, offset + 8 + length);

  if (type === 'IHDR') {
    width = data.readUInt32BE(0);
    height = data.readUInt32BE(4);
  } else if (type === 'IDAT') {
    idatChunks.push(data);
  }
  offset += 12 + length;
}

const compressedData = Buffer.concat(idatChunks);
const decompressedData = zlib.inflateSync(compressedData);

const bpp = 4;
const stride = 1 + width * bpp;

// Unfilter scanlines into true RGBA pixels
const truePixels = Buffer.alloc(width * height * bpp);

for (let y = 0; y < height; y++) {
  const filterType = decompressedData[y * stride];
  const scanlineOffset = y * stride + 1;
  const rawLineOffset = y * width * bpp;
  const prevLineOffset = (y - 1) * width * bpp;

  for (let x = 0; x < width * bpp; x++) {
    const filtByte = decompressedData[scanlineOffset + x];
    const left = x >= bpp ? truePixels[rawLineOffset + x - bpp] : 0;
    const up = y > 0 ? truePixels[prevLineOffset + x] : 0;
    const upperLeft = (y > 0 && x >= bpp) ? truePixels[prevLineOffset + x - bpp] : 0;

    let reconByte = 0;
    switch (filterType) {
      case 0: reconByte = filtByte; break;
      case 1: reconByte = (filtByte + left) & 0xff; break;
      case 2: reconByte = (filtByte + up) & 0xff; break;
      case 3: reconByte = (filtByte + Math.floor((left + up) / 2)) & 0xff; break;
      case 4: reconByte = (filtByte + paethPredictor(left, up, upperLeft)) & 0xff; break;
      default: reconByte = filtByte;
    }
    truePixels[rawLineOffset + x] = reconByte;
  }
}

// Now encode truePixels into a fresh PNG using Filter 0 (None) for all scanlines
const newStride = 1 + width * bpp;
const newDecompressed = Buffer.alloc(height * newStride);

for (let y = 0; y < height; y++) {
  const lineStart = y * newStride;
  newDecompressed[lineStart] = 0; // Filter 0 (None)
  const rawStart = y * width * bpp;
  truePixels.copy(newDecompressed, lineStart + 1, rawStart, rawStart + width * bpp);
}

const newCompressedData = zlib.deflateSync(newDecompressed);

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const typeAndData = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crcBuf]);
}

const sig = Buffer.from('89504e470d0a1a0a', 'hex');
const ihdrData = Buffer.alloc(13);
ihdrData.writeUInt32BE(width, 0);
ihdrData.writeUInt32BE(height, 4);
ihdrData[8] = 8;
ihdrData[9] = 6; // RGBA
ihdrData[10] = 0;
ihdrData[11] = 0;
ihdrData[12] = 0;

const ihdrChunk = makeChunk('IHDR', ihdrData);
const idatChunk = makeChunk('IDAT', newCompressedData);
const iendChunk = makeChunk('IEND', Buffer.alloc(0));

const finalPNG = Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
fs.writeFileSync(logoPath, finalPNG);
console.log('✅ Un-filtered PNG scanlines and rewrote true original RGBA colors to vedixa_logo.png!');
