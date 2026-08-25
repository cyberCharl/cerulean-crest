const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  const dir = path.join(__dirname, 'deliverables', 'rendered');
  const files = fs.readdirSync(dir)
    .filter(f => /^slide-\d+\.png$/.test(f))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  const thumbW = 400;
  const thumbH = 225;
  const gap = 16;
  const cols = 4;
  const rows = 4;
  for (let page = 0; page < Math.ceil(files.length / (cols * rows)); page++) {
    const subset = files.slice(page * cols * rows, (page + 1) * cols * rows);
    const composites = [];
    for (let i = 0; i < subset.length; i++) {
      const input = await sharp(path.join(dir, subset[i])).resize(thumbW, thumbH, { fit: 'fill' }).png().toBuffer();
      composites.push({ input, left: gap + (i % cols) * (thumbW + gap), top: gap + Math.floor(i / cols) * (thumbH + gap) });
    }
    await sharp({ create: { width: gap + cols * (thumbW + gap), height: gap + rows * (thumbH + gap), channels: 3, background: '#777777' } })
      .composite(composites)
      .jpeg({ quality: 88 })
      .toFile(path.join(dir, `contact-${page + 1}.jpg`));
  }
}
main();
