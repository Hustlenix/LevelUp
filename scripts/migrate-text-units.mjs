// Mechanical accessibility migration: preserve 100% appearance, scale with root text size.
import fs from 'node:fs';
import path from 'node:path';
for (const root of ['app','components']) {
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.(tsx|css)$/.test(file)) {
        const old = fs.readFileSync(file,'utf8');
        const next = old.replace(/text-\[(\d+(?:\.\d+)?)px\]/g, (_, n) => `text-[${Number(n)/16}rem]`).replace(/font-size:\s*(\d+(?:\.\d+)?)px/g, (_, n) => `font-size: ${Number(n)/16}rem`);
        if (next !== old) fs.writeFileSync(file,next);
      }
    }
  }
  walk(root);
}
