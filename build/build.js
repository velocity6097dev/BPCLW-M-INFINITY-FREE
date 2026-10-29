/* ══════════════════════════════════════════════
   BUILD — turns src/ (readable, the folder you edit) into dist/ (the
   obfuscated/minified folder you actually deploy).

   Run with:  cd build && npm install && npm run build
   Re-run this every time you change anything in src/ — dist/ is
   regenerated from scratch each time, never hand-edited.
   ══════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const CleanCSS = require('clean-css');
const { minify: minifyHtml } = require('html-minifier-terser');

const SRC = path.join(__dirname, '..', 'src');
const DIST = path.join(__dirname, '..', 'dist');

// ── Obfuscator settings ──────────────────────────────────────────────
// renameGlobals MUST stay false: the HTML calls functions like
// openPicker(...) and doPreview() by name in onclick="" attributes, and
// attachments.js/invoice-template.js build more of those dynamically as
// strings (e.g. onclick="reeditImage('${target}')"). Renaming top-level
// function/const names would silently break every one of those calls.
//
// debugProtection is left off on purpose: it works by freezing the page
// with a debugger statement loop whenever devtools is open, which is a
// strong deterrent but also breaks the page for a legitimate user (or
// you) who opens devtools for an innocent reason. Flip it on below if
// you'd rather have that trade-off.
const OBFUSCATOR_OPTIONS = {
  compact: true,
  simplify: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.6,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.3,
  stringArray: true,
  stringArrayEncoding: ['rc4'],
  stringArrayThreshold: 0.85,
  rotateStringArray: true,
  splitStrings: true,
  splitStringsChunkLength: 6,
  transformObjectKeys: true,
  numbersToExpressions: true,
  unicodeEscapeSequence: false,
  selfDefending: true,
  debugProtection: false, // see note above
  disableConsoleOutput: true,
  renameGlobals: false, // do not change — see note above
  identifierNamesGenerator: 'hexadecimal',
  target: 'browser',
};

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}
function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}
function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

async function build() {
  rmrf(DIST);
  ensureDir(DIST);

  // assets/ — copied as-is, nothing meaningful to obfuscate in an image
  const assetsDir = path.join(SRC, 'assets');
  if (fs.existsSync(assetsDir)) {
    for (const f of fs.readdirSync(assetsDir)) {
      copyFile(path.join(assetsDir, f), path.join(DIST, 'assets', f));
    }
  }

  // css/ — minified (no meaningful "obfuscation" for plain CSS without
  // rewriting every class/id reference in the JS + HTML too)
  const cssDir = path.join(SRC, 'css');
  for (const f of fs.readdirSync(cssDir)) {
    const input = fs.readFileSync(path.join(cssDir, f), 'utf8');
    const output = new CleanCSS({}).minify(input).styles;
    ensureDir(path.join(DIST, 'css'));
    fs.writeFileSync(path.join(DIST, 'css', f), output);
  }

  // js/ — every file obfuscated with the settings above
  const jsDir = path.join(SRC, 'js');
  ensureDir(path.join(DIST, 'js'));
  for (const f of fs.readdirSync(jsDir)) {
    const input = fs.readFileSync(path.join(jsDir, f), 'utf8');
    const output = JavaScriptObfuscator.obfuscate(input, OBFUSCATOR_OPTIONS).getObfuscatedCode();
    fs.writeFileSync(path.join(DIST, 'js', f), output);
    console.log(`obfuscated  js/${f}`);
  }

  // index.html — whitespace/comment-stripped; references stay the same
  // filenames so nothing else needs to change
  const htmlInput = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  const htmlOutput = await minifyHtml(htmlInput, {
    collapseWhitespace: true,
    removeComments: true,
    minifyCSS: true,
    minifyJS: false, // JS is already obfuscated separately; don't re-touch it
  });
  fs.writeFileSync(path.join(DIST, 'index.html'), htmlOutput);

  console.log('\nBuild complete → dist/');
  console.log('Deploy the dist/ folder to your host. Keep editing src/.');
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
