import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const ROOT = process.cwd();
const BASE = 'tools';

function safeList(dir){ try{ return readdirSync(dir, { withFileTypes: true }) } catch{ return [] } }

function inferGrade(p, html) {
  if (/\/10\//.test(p) || /\b10\b/.test(p)) return '10';
  if (/\/11\//.test(p) || /\b11\b/.test(p)) return '11';
  if (/\/12\//.test(p) || /\b12\b/.test(p)) return '12';
  const m = html.match(/<meta[^>]+name=["']tool-grade["'][^>]+>/i);
  if (m) {
    const c = m[0].match(/content=["']([^"']+)["']/i);
    if (c && ['10','11','12'].includes(c[1].trim())) return c[1].trim();
  }
  const t = html.match(/<title>([^<]+)<\/title>/i);
  if (t) {
    const s = t[1];
    if (/lớp\s*10/i.test(s)) return '10';
    if (/lớp\s*11/i.test(s)) return '11';
    if (/lớp\s*12/i.test(s)) return '12';
  }
  return '';
}
function inferCategory(p, html, grade) {
  const m = html.match(/<meta[^>]+name=["']tool-category["'][^>]+>/i);
  if (m) {
    const c = m[0].match(/content=["']([^"']+)["']/i);
    if (c) {
      const v = c[1].trim().toLowerCase();
      if (['gvcn','lop','khac'].includes(v)) return v;
    }
  }
  if (/gvcn|chủ\s*nh[iî]ệm|chu\s*nhiem/i.test(html) || /\bgvcn\b/i.test(p)) return 'gvcn';
  if (grade) return 'lop';
  return 'khac';
}
function inferTrack(p, html, tags) {
  const m = html.match(/<meta[^>]+name=["']tool-track["'][^>]+>/i);
  if (m) {
    const c = m[0].match(/content=["']([^"']+)["']/i);
    if (c) {
      const v = c[1].trim().toLowerCase();
      if (['dai-so','hinh-hoc'].includes(v)) return v;
    }
  }
  const hay = (html + ' ' + (tags||[]).join(' ') + ' ' + p).toLowerCase();
  if (/(vector|góc|tam giác|hình|hinh|toạ độ|toa do)/i.test(hay)) return 'hinh-hoc';
  if (/(phương trình|phuong trinh|bậc|gioi han|giới hạn|đạo hàm|ham so|hàm số|hpt|pt)/i.test(hay)) return 'dai-so';
  return '';
}

function walk(dir) {
  const abs = join(ROOT, dir);
  return safeList(abs).flatMap(d => {
    const p = join(dir, d.name).replace(/\\/g,'/');
    if (d.isDirectory()) return walk(p);
    if (extname(d.name).toLowerCase() !== '.html') return [];
    const full = join(ROOT, p);
    let html = '';
    try { html = readFileSync(full, 'utf8'); } catch {}
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : basename(d.name, '.html');
    const extMeta = html.match(/<meta[^>]+name=["']tool-external["'][^>]+>/i);
    let externalUrl = '';
    if (extMeta) {
      const m = extMeta[0].match(/content=["']([^"']+)["']/i);
      if (m) externalUrl = m[1].trim();
    }

    const tagsMeta = html.match(/<meta[^>]+name=["']tool-tags["'][^>]+>/i);
    let tags = [];
    if (tagsMeta) {
      const m = tagsMeta[0].match(/content=["']([^"']+)["']/i);
      if (m) tags = m[1].split(',').map(s=>s.trim()).filter(Boolean);
    }
    const kwMeta = html.match(/<meta[^>]+name=["']keywords["'][^>]+>/i);
    let keywords = [];
    if (kwMeta){
      const m = kwMeta[0].match(/content=["']([^"']+)["']/i);
      if (m) keywords = m[1].split(',').map(s=>s.trim()).filter(Boolean);
    }
    const heads = [...html.matchAll(/<(h1|h2|h3)[^>]*>(.*?)<\/\1>/gis)].map(m=>m[2].replace(/<[^>]+>/g,'').trim()).slice(0,6);

    const grade = inferGrade(p, html);
    const category = inferCategory(p, html, grade);
    const track = inferTrack(p, html, tags);

    const st = statSync(full);
    return [{
      title,
      path: (externalUrl || p.replace(/^\/?/, '')),
      external: Boolean(externalUrl),
      category,
      grade,
      track,
      tags,
      updatedAt: st.mtime.toISOString(),
      extra: { headings: heads, keywords }
    }];
  });
}

const items = walk(BASE);
items.sort((a,b) => (a.category||'').localeCompare(b.category||'') || (a.grade||'').localeCompare(b.grade||'') || a.title.localeCompare(b.title, 'vi'));
writeFileSync('manifest.json', JSON.stringify(items, null, 2), 'utf8');
console.log(`Generated manifest with ${items.length} items`);
