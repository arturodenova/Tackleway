/* =====================================================
   Blue House Tackleway — Local CMS Server
   Run with: node server.js
   Then open: http://localhost:3000/admin
   ===================================================== */

const express  = require('express');
const fs       = require('fs');
const path     = require('path');
const multer   = require('multer');
const cheerio  = require('cheerio');

const ROOT = __dirname;
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'cms-config.json'), 'utf8'));
const PORT = config.port || 3000;
const PASSWORD = config.password || 'changeme';

const app = express();
app.use(express.json());

// ── Image upload storage ──────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(ROOT, 'images', 'selected');
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9._-]/g, '-');
    const name = `${Date.now()}-${base}${ext}`;
    cb(null, name);
  }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// ── Auth middleware ────────────────────────────────────
function authCheck(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '');
  if (token === PASSWORD) return next();
  res.status(401).json({ error: 'Unauthorised' });
}

// ── Helpers ────────────────────────────────────────────

/** Resolve a dot-path like "pricing.peak.night" in an object */
function getVal(obj, keypath) {
  return keypath.split('.').reduce((o, k) => (o != null ? o[k] : undefined), obj);
}

/** Build the gallery HTML from an image array */
function buildGalleryHTML(images) {
  if (!images || images.length === 0) return '';

  const searchIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`;

  // Layout pattern: cycle through row configurations
  const patterns = [
    { cols: ['col-span-12 md:col-span-7', 'col-span-12 md:col-span-5'], heights: [480, 239] },
    { cols: ['col-span-12 md:col-span-4', 'col-span-12 md:col-span-4', 'col-span-12 md:col-span-4'], heights: [360, 360, 360] },
    { cols: ['col-span-12 md:col-span-3', 'col-span-12 md:col-span-6', 'col-span-12 md:col-span-3'], heights: [300, 300, 300] },
    { cols: ['col-span-12 md:col-span-4', 'col-span-12 md:col-span-4', 'col-span-12 md:col-span-4'], heights: [350, 350, 350] },
    { cols: ['col-span-12 md:col-span-5', 'col-span-12 md:col-span-7'], heights: [400, 400] },
    { cols: ['col-span-12 md:col-span-3', 'col-span-12 md:col-span-3', 'col-span-12 md:col-span-3', 'col-span-12 md:col-span-3'], heights: [300, 300, 300, 300] }
  ];

  let html = '';
  let idx = 0;
  let patternIdx = 0;
  let first = true;

  while (idx < images.length) {
    const pattern = patterns[patternIdx % patterns.length];
    const rowSize = pattern.cols.length;
    const rowImages = images.slice(idx, idx + rowSize);

    // Special handling for pattern[0] — 7/12 + stacked 5/12
    if (patternIdx % patterns.length === 0 && rowImages.length >= 2) {
      const [main, ...stack] = rowImages;
      const stackImgs = stack.slice(0, 1); // just take 1 for stacked pair
      const actualStack = images.slice(idx + 1, idx + 2);
      const nextStack   = images.slice(idx + 2, idx + 3);
      const bigImg      = main;
      const s1          = actualStack[0];
      const s2          = nextStack[0];

      const rowImageCount = s2 ? 3 : s1 ? 2 : 1;

      if (rowImageCount >= 2) {
        html += `\n    <div class="grid grid-cols-12 gap-px${first ? '' : ' mt-px'}">`;
        html += `\n      <div class="col-span-12 md:col-span-7 gallery-item" data-index="${idx}" style="height:480px">`;
        html += `\n        <img src="${bigImg}" alt="The Blue House Tackleway" class="gallery-bg">`;
        html += `\n        <div class="overlay">${searchIcon}</div>`;
        html += `\n      </div>`;
        html += `\n      <div class="col-span-12 md:col-span-5 grid grid-rows-2 gap-px">`;
        if (s1) {
          html += `\n        <div class="gallery-item" data-index="${idx + 1}" style="height:239px">`;
          html += `\n          <img src="${s1}" alt="The Blue House Tackleway" class="gallery-bg">`;
          html += `\n          <div class="overlay">${searchIcon}</div>`;
          html += `\n        </div>`;
        }
        if (s2) {
          html += `\n        <div class="gallery-item" data-index="${idx + 2}" style="height:239px">`;
          html += `\n          <img src="${s2}" alt="The Blue House Tackleway" class="gallery-bg">`;
          html += `\n          <div class="overlay">${searchIcon}</div>`;
          html += `\n        </div>`;
        }
        html += `\n      </div>`;
        html += `\n    </div>`;
        idx += rowImageCount;
        first = false;
        patternIdx++;
        continue;
      }
    }

    // Standard row
    html += `\n    <div class="grid grid-cols-12 gap-px${first ? '' : ' mt-px'}">`;
    rowImages.forEach((src, i) => {
      const col = pattern.cols[i] || 'col-span-12 md:col-span-4';
      const h   = pattern.heights[i] || 360;
      html += `\n      <div class="${col} gallery-item" data-index="${idx + i}" style="height:${h}px">`;
      html += `\n        <img src="${src}" alt="The Blue House Tackleway" class="gallery-bg">`;
      html += `\n        <div class="overlay">${searchIcon}</div>`;
      html += `\n      </div>`;
    });
    html += `\n    </div>`;

    idx += rowImages.length;
    first = false;
    patternIdx++;
  }

  return html;
}

/** Update all static HTML files from content */
function updateHTML(content) {
  const files = ['index.html', 'contact.html', 'images.html', 'local-area.html'];

  for (const file of files) {
    const filePath = path.join(ROOT, file);
    if (!fs.existsSync(filePath)) continue;

    let html = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(html, { decodeEntities: false });

    // Text content
    $('[data-cms]').each((_, el) => {
      const key = $(el).attr('data-cms');
      const val = getVal(content, key);
      if (val !== undefined) $(el).text(String(val));
    });

    // HTML content (preserves line breaks / markup)
    $('[data-cms-html]').each((_, el) => {
      const key = $(el).attr('data-cms-html');
      const val = getVal(content, key);
      if (val !== undefined) $(el).html(String(val));
    });

    // Image src
    $('[data-cms-src]').each((_, el) => {
      const key = $(el).attr('data-cms-src');
      const val = getVal(content, key);
      if (val !== undefined) $(el).attr('src', String(val));
    });

    // Phone href
    $('[data-cms-tel]').each((_, el) => {
      const key = $(el).attr('data-cms-tel');
      const val = getVal(content, key);
      if (val !== undefined) {
        const digits = String(val).replace(/[^0-9+]/g, '');
        $(el).attr('href', `tel:${digits}`);
        $(el).text(String(val));
      }
    });

    // Email href
    $('[data-cms-email]').each((_, el) => {
      const key = $(el).attr('data-cms-email');
      const val = getVal(content, key);
      if (val !== undefined) {
        $(el).attr('href', `mailto:${val}`);
        $(el).text(String(val));
      }
    });

    // Gallery regeneration (images.html)
    if (file === 'images.html' && content.gallery) {
      const startMarker = '<!-- CMS-GALLERY-START -->';
      const endMarker   = '<!-- CMS-GALLERY-END -->';
      let out = $.html();
      const s = out.indexOf(startMarker);
      const e = out.indexOf(endMarker);
      if (s !== -1 && e !== -1) {
        const galleryHTML = buildGalleryHTML(content.gallery);
        out = out.slice(0, s + startMarker.length) + galleryHTML + '\n  ' + out.slice(e);
        fs.writeFileSync(filePath, out, 'utf8');
        continue;
      }
    }

    fs.writeFileSync(filePath, $.html(), 'utf8');
  }
}

// ── Static files ───────────────────────────────────────
app.use('/css',    express.static(path.join(ROOT, 'css')));
app.use('/js',     express.static(path.join(ROOT, 'js')));
app.use('/images', express.static(path.join(ROOT, 'images')));
app.use(express.static(ROOT, { extensions: ['html'] }));

// ── Admin UI ───────────────────────────────────────────
app.get('/admin', (req, res) => {
  res.sendFile(path.join(ROOT, 'admin.html'));
});

// ── API ────────────────────────────────────────────────

// GET content
app.get('/api/content', authCheck, (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'content.json'), 'utf8'));
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST save content
app.post('/api/content', authCheck, (req, res) => {
  try {
    const content = req.body;
    fs.writeFileSync(path.join(ROOT, 'content.json'), JSON.stringify(content, null, 2), 'utf8');
    updateHTML(content);
    res.json({ ok: true });
  } catch (e) {
    console.error('Save error:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST upload image
app.post('/api/upload', authCheck, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const relativePath = `images/selected/${req.file.filename}`;
  res.json({ ok: true, path: relativePath });
});

// GET list images
app.get('/api/images', authCheck, (req, res) => {
  const dir = path.join(ROOT, 'images', 'selected');
  try {
    const files = fs.readdirSync(dir)
      .filter(f => /\.(jpe?g|png|webp|avif|gif)$/i.test(f))
      .map(f => `images/selected/${f}`);
    res.json(files);
  } catch {
    res.json([]);
  }
});

// ── Start ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  Blue House CMS running at http://localhost:${PORT}/admin\n`);
});
