// Publish only web assets, never SQL migrations, tests or repository metadata.
const fs = require('node:fs');
const path = require('node:path');
const output = path.resolve(__dirname, '../dist');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const file of ['index.html', 'admin.html', 'styles.css', 'admin-styles.css', 'script.js', 'admin-script.js', 'supabase-config.js', 'img']) {
  fs.cpSync(path.resolve(__dirname, '..', file), path.join(output, file), { recursive: true });
}
console.log('Static storefront built in dist/');
