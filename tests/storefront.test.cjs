const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('script.js', 'utf8');
function load(names, context) {
  vm.createContext(context);
  for (const name of names) {
    const start = source.indexOf(`function ${name}(`);
    assert.notEqual(start, -1, `${name} is implemented`);
    vm.runInContext(source.slice(start, source.indexOf('\n}', start) + 2), context);
  }
  return context;
}
function cartContext() {
 return {productos:[{id:1,titulo:'Taladro',precio:100}],quoteCart:[],saveQuote(){},renderQuoteItems(){},updateCartCount(){},openQuoteSidebar(){}};
}
test('quote quantities are positive integers capped at 999',()=>{
 const c=load(['addToQuote'],cartContext());
 c.addToQuote(1,-5);assert.equal(c.quoteCart[0].qty,1);
 c.addToQuote(1,10000);assert.equal(c.quoteCart[0].qty,999);
});
test('unavailable storage does not interrupt quoting',()=>{
 const c=load(['saveQuote'],{quoteCart:[],localStorage:{setItem(){throw Error('quota');}},console:{warn(){}}});
 assert.doesNotThrow(()=>c.saveQuote());
});
test('HTML content is escaped for catalog rendering',()=>{
 const c=load(['escapeHTML'],{});
 assert.equal(c.escapeHTML('<img src="x" onerror="alert(1)">'), '&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;');
});
test('cart badge counts units, not distinct products',()=>{
 const badge={};const c=load(['updateCartCount'],{quoteCart:[{qty:3},{qty:2}],document:{querySelectorAll(){return[badge];}}});
 c.updateCartCount();assert.equal(badge.textContent,5);
});
test('technical sheets reject executable URLs',()=>{
 const c=load(['safeDocumentURL'],{});
 assert.equal(c.safeDocumentURL('javascript:alert(1)'), '');
 assert.equal(c.safeDocumentURL('https://example.com/sheet.pdf'), 'https://example.com/sheet.pdf');
});
test('modal quantity increment stops at the same limit as the cart',()=>{
 const input={value:'999'};const c=load(['changeModalQty'],{document:{getElementById(){return input;}}});
 c.changeModalQty(1);assert.equal(Number(input.value),999);
});
