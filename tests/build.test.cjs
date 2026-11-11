const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
test('deployment includes storefront and admin, excludes SQL and tests',()=>{
 assert.ok(fs.existsSync('scripts/build.cjs'),'static build is available');
 execFileSync(process.execPath,['scripts/build.cjs']);
 for(const file of ['index.html','admin.html','script.js','styles.css','supabase-config.js','upload-validation.js','img/logo.jpeg']) assert.ok(fs.existsSync(`dist/${file}`),file);
 for(const file of ['supabase-setup.sql','tests','README-PRODUCCION.md','.git','qa-preview.html','qa-admin-preview.html','qa-screenshots']) assert.equal(fs.existsSync(`dist/${file}`),false,file);
});
test('deployment removes stale files from previous generated output',()=>{
 fs.mkdirSync('dist',{recursive:true});fs.writeFileSync('dist/stale-private.sql','not a public asset');
 execFileSync(process.execPath,['scripts/build.cjs']);assert.equal(fs.existsSync('dist/stale-private.sql'),false);
});
