const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const fixture={
 productos:[{id:1,titulo:'Taladro',descripcion:'Trabajo profesional',imagen_url:'img/logo.jpeg',precio:100,stock:4,categoria_id:1},{id:2,titulo:'Martillo',descripcion:null,imagen_url:'img/logo.jpeg',precio:0,categoria_id:1}],
 categorias:[{id:1,titulo:'Herramientas',descripcion:'Para tu proyecto',icon:'fas fa-tools'}],
 categoria_imagenes:[{imagen_url:'img/logo.jpeg'}],variantes:[],configuracion:null
};
async function app(overrides={}){
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;
 w.console={log(){},error(){},warn(){}};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.IntersectionObserver=class {observe(){} unobserve(){}};
 w.supabaseClient={from(table){const q={select(){return q},eq(){return q},order(){return q},single(){return q},then(resolve){return Promise.resolve({data:(table in overrides?overrides:fixture)[table],error:null}).then(resolve)}};return q}};
 w.eval(fs.readFileSync('script.js','utf8'));
 await new Promise(r=>setTimeout(r,15));
 return {dom,w,d:w.document};
}
test('catalog uses only published products and search handles null descriptions',async()=>{
 const {dom,w,d}=await app();try{
 assert.equal(d.querySelectorAll('#productsGrid .product-card').length,2);
 const input=d.querySelector('.searchInput');input.value='martillo';input.dispatchEvent(new w.Event('input'));
 assert.equal(d.querySelectorAll('#productsGrid .product-card').length,1);
 assert.match(d.querySelector('#productsGrid').textContent,/Martillo/);
 input.value='';input.dispatchEvent(new w.Event('input'));assert.equal(d.querySelectorAll('#productsGrid .product-card').length,2);
 }finally{dom.window.close()}
});
test('category navigation, quote persistence, quantities and keyboard dismissal',async()=>{
 const {dom,w,d}=await app();try{
 w.verDetalleCategoria(1);assert.equal(d.querySelector('#hero').style.display,'none');assert.equal(d.querySelectorAll('#categoryProductsGrid .product-card').length,2);
 w.volverAlInicio();assert.equal(d.querySelector('#hero').style.display,'');
 w.verDetalleProducto(1);d.querySelector('#modalQty').value='3';d.querySelector('#addToQuoteBtn').click();
 assert.equal(JSON.parse(w.localStorage.getItem('ferrenorte_quote'))[0].qty,3);
 assert.equal(d.querySelector('.cart-count').textContent,'3');
 w.changeCartQty('1',1);assert.equal(d.querySelector('.cart-count').textContent,'4');
 w.verDetalleProducto(2);assert.equal(d.querySelector('#modalQty').value,'1');
 d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));
 assert.equal(d.querySelector('#productDetailModal').classList.contains('active'),false);
 assert.equal(d.querySelector('#quoteSidebar').classList.contains('active'),false);
 w.removeFromQuote('1');assert.equal(d.querySelector('.cart-count').textContent,'0');
 }finally{dom.window.close()}
});
test('HTML from product and category content is displayed as text',async()=>{
 const malicious='<img src=x onerror=alert(1)>';
 const {dom,d}=await app({productos:[{...fixture.productos[0],titulo:malicious}],categorias:[{...fixture.categorias[0],titulo:malicious}],categoria_imagenes:[{imagen_url:'x" onerror="alert(1)'}]});try{
 assert.equal(d.querySelector('#productsGrid .product-title').textContent,malicious);
 assert.equal(d.querySelectorAll('[onerror]').length,0);
 }finally{dom.window.close()}
});
test('empty published catalog does not invent products',async()=>{
 const {dom,d}=await app({productos:[]});try{assert.equal(d.querySelectorAll('#productsGrid .product-card').length,0)}finally{dom.window.close()}
});
test('search button closes mobile navigation and releases body scroll',async()=>{
 const {dom,d}=await app();try{
 d.querySelector('#mobileMenuToggle').click();assert.equal(d.body.classList.contains('menu-open'),true);
 d.querySelector('.mobile-search .searchBtn').click();
 assert.equal(d.querySelector('#navMenu').classList.contains('active'),false);
 assert.equal(d.body.classList.contains('menu-open'),false);
 }finally{dom.window.close()}
});
