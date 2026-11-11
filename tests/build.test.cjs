const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
test('deployment includes storefront and admin, excludes SQL and tests',()=>{
 assert.ok(fs.existsSync('scripts/build.cjs'),'static build is available');
 execFileSync(process.execPath,['scripts/build.cjs']);
 for(const file of ['index.html','admin.html','script.js','styles.css','supabase-config.js','img/logo.jpeg']) assert.ok(fs.existsSync(`dist/${file}`),file);
 for(const file of ['supabase-setup.sql','tests','README-PRODUCCION.md','.git']) assert.equal(fs.existsSync(`dist/${file}`),false,file);
});
