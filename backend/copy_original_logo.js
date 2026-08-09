import fs from 'fs';
import path from 'path';

const srcPath = 'C:\\Users\\Sureshreddy\\Downloads\\ChatGPT Image Aug 3, 2026, 10_02_49 PM.png';
const destPath = path.resolve('../frontend/src/assets/vedixa_logo.png');

if (fs.existsSync(srcPath)) {
  fs.copyFileSync(srcPath, destPath);
  console.log('✅ Successfully copied original reference image to frontend/src/assets/vedixa_logo.png!');
  console.log('Destination file size:', fs.statSync(destPath).size, 'bytes');
} else {
  console.error('❌ Source file not found:', srcPath);
}
