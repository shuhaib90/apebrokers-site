const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\shuhaib s\\Documents\\antigravity\\gallant-babbage\\collection\\animated_gifs';
const dstDir = path.join(__dirname, 'public', 'gifs');

if (!fs.existsSync(dstDir)) {
  fs.mkdirSync(dstDir, { recursive: true });
}

const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.gif'));
let count = 0;
for (const file of files) {
  fs.copyFileSync(path.join(srcDir, file), path.join(dstDir, file));
  count++;
}

console.log(`Copied ${count} animated gifs to public/gifs`);
