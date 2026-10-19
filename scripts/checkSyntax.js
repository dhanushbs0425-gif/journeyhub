const fs = require('fs');
const path = require('path');
const vm = require('vm');

let errors = 0;
let checked = 0;

function checkDir(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) {
      checkDir(full);
    } else if (f.name.endsWith('.js')) {
      const code = fs.readFileSync(full, 'utf8');
      checked++;
      try {
        new vm.Script(code, { filename: full });
      } catch (e) {
        console.error('Syntax error in:', full, e.message);
        errors++;
      }
    }
  }
}

checkDir(path.resolve('public'));
checkDir(path.resolve('src'));
console.log(`Checked ${checked} files. Errors: ${errors}`);
if (errors === 0) {
  console.log('ALL JS FILES PASSED SYNTAX CHECK!');
  process.exit(0);
} else {
  process.exit(1);
}
