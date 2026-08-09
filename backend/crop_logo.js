import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const logoPath = path.resolve('../frontend/src/assets/vedixa_logo.png');
const buffer = fs.readFileSync(logoPath);

// Parse PNG chunks
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

// 1 filter byte + width * 4 (RGBA)
const origStride = 1 + width * 4;

// Bounding box from scan: MinX=26, MaxX=688, MinY=90, MaxY=240
const minX = 26, maxX = 688, minY = 90, maxY = 240;
const cropW = maxX - minX + 1; // 663
const cropH = maxY - minY + 1; // 151

console.log(`Cropping from ${width}x${height} to ${cropW}x${cropH}...`);

// Create new decompressed buffer for cropW x cropH
// Filter byte for each line = 0 (None)
const newStride = 1 + cropW * 4;
const newDecompressed = Buffer.alloc(cropH * newStride);

for (let y = 0; y < cropH; y++) {
  const origY = minY + y;
  const origLineStart = origY * origStride;
  const newLineStart = y * newStride;

  newDecompressed[newLineStart] = 0; // Filter byte: None

  for (let x = 0; x < cropW; x++) {
    const origX = minX + x;
    const origPixelPos = origLineStart + 1 + origX * 4;
    const newPixelPos = newLineStart + 1 + x * 4;

    newDecompressed[newPixelPos + 0] = decompressedData[origPixelPos + 0];
    newDecompressed[newPixelPos + 1] = decompressedData[origPixelPos + 1];
    newDecompressed[newPixelPos + 2] = decompressedData[origPixelPos + 2];
    newDecompressed[newPixelPos + 3] = decompressedData[origPixelPos + 3];
  }
}

const newCompressedData = zlib.deflateSync(newDecompressed);

// Helper to create CRC32
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

// 1. Signature
const sig = Buffer.from('89504e470d0a1a0a', 'hex');

// 2. IHDR Chunk (13 bytes: W, H, BitDepth=8, ColorType=6 (RGBA), Comp=0, Filter=0, Interlace=0)
const ihdrData = Buffer.alloc(13);
ihdrData.writeUInt32BE(cropW, 0);
ihdrData.writeUInt32BE(cropH, 4);
ihdrData[8] = 8;  // bit depth
ihdrData[9] = 6;  // color type RGBA
ihdrData[10] = 0; // compression
ihdrData[11] = 0; // filter
ihdrData[12] = 0; // interlace
const ihdrChunk = makeChunk('IHDR', ihdrData);

// 3. IDAT Chunk
const idatChunk = makeChunk('IDAT', newCompressedData);

// 4. IEND Chunk
const iendChunk = makeChunk('IEND', Buffer.alloc(0));

const finalPNG = Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);

fs.writeFileSync(logoPath, finalPNG);
console.log(`🎉 SUCCESS! Wrote cropped PNG to ${logoPath}! File size: ${finalPNG.length} bytes.`);
