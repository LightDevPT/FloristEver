const fs = require('fs');

const indexHtml = fs.readFileSync('index.html', 'utf8');
const styleCss = fs.readFileSync('style.css', 'utf8');

const modules = [
  'js/utils.js',
  'js/config/flowers.js',
  'js/config/upgrades.js',
  'js/config/customers.js',
  'js/config/bouquets.js',
  'js/audio.js',
  'js/assets.js',
  'js/state.js',
  'js/entities/player.js',
  'js/entities/field.js',
  'js/entities/worker.js',
  'js/entities/customer.js',
  'js/ui/hud.js',
  'js/ui/shop.js',
  'js/ui/bouquet.js',
  'js/ui/tutorial.js',
  'js/main.js'
];

function cleanModule(code) {
  return code
    .replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '')
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s+(const|let|var|function|class)\s+/gm, '$1 ');
}

const bundledJs = modules.map(file => {
  const content = fs.readFileSync(file, 'utf8');
  return `// ==========================================\n// FICHEIRO: ${file}\n// ==========================================\n` + cleanModule(content);
}).join('\n\n');

let standalone = indexHtml
  .replace(/\s*<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?>/i, '')
  .replace(/\s*<meta\s+name="referrer"\s+content="no-referrer"\s*>/i, '')
  .replace('<link rel="stylesheet" href="style.css">', '<style>\n' + styleCss + '\n</style>')
  .replace('<script type="module" src="js/main.js"></script>', '<script>\n' + bundledJs + '\n</script>');

fs.writeFileSync('standalone.html', standalone, 'utf8');
console.log('standalone.html successfully created!');
