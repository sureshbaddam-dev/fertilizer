import fs from 'fs';
import path from 'path';

const logoPath = path.resolve('../frontend/src/assets/vedixa_logo.png');
const buffer = fs.readFileSync(logoPath);

console.log('PNG magic bytes check:', buffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a' ? 'Valid PNG' : 'Not PNG');

// Read IHDR chunk for width & height
const width = buffer.readUInt32BE(16);
const height = buffer.readUInt32BE(20);
const bitDepth = buffer[24];
const colorType = buffer[25];

console.log(`Original PNG Dimensions: ${width} x ${height} | BitDepth: ${bitDepth} | ColorType: ${colorType}`);
