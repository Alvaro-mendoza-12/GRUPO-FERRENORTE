const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('configuration setup never overwrites an existing contact number', () => {
    const sql = fs.readFileSync('update-schema-v2.sql', 'utf8').replace(/--[^\n]*/g, '');
    assert.doesNotMatch(sql, /UPDATE\s+(?:public\.)?configuracion\s+SET\s+contacto_whatsapp/i);
    assert.match(sql, /WHERE NOT EXISTS\s*\(SELECT 1 FROM configuracion\)/i);
});
