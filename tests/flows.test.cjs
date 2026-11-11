const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const fixture={
 productos:[{id:1,titulo:'Taladro',descripcion:'Trabajo profesional',imagen_url:'img/logo.jpeg',precio:100,stock:4,categoria_id:1},{id:2,titulo:'Martillo',descripcion:null,imagen_url:'img/logo.jpeg',precio:0,categoria_id:1}],
 categorias:[{id:1,titulo:'Herramientas',descripcion:'Para tu proyecto',icon:'fas fa-tools'}],
 categoria_imagenes:[{imagen_url:'img/logo.jpeg'}],variantes:[],configuracion:null
};
async function app(overrides={},options={}){
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:options.url || 'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;
 if(options.cart) w.localStorage.setItem('ferrenorte_quote',JSON.stringify(options.cart));
 w.console={log(){},error(){},warn(){}};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.IntersectionObserver=class {observe(){} unobserve(){}};
 w.supabaseClient={from(table){const q={select(){return q},eq(){return q},order(){return q},single(){return q},then(resolve){const value=(table in overrides?overrides:fixture)[table];return Promise.resolve(typeof value==='function'?value():{data:value,error:null}).then(resolve)}};return q}};
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
test('product dialog locks scroll, traps keyboard focus and restores its trigger',async()=>{
 const {dom,w,d}=await app();try{
 const trigger=d.querySelector('#productsGrid button');trigger.focus();w.verDetalleProducto(1);
 const close=d.querySelector('#productDetailModal .modal-close-btn');assert.equal(d.activeElement,close);assert.equal(d.body.classList.contains('menu-open'),true);
 d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));assert.equal(d.activeElement,d.querySelector('#modalWhatsAppBtn'));
 d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));assert.equal(d.activeElement,close);
 w.cerrarModalProducto();assert.equal(d.activeElement,trigger);assert.equal(d.body.classList.contains('menu-open'),false);
 }finally{dom.window.close()}
});
test('moving from product to quote leaves only one dialog open and keeps focus inside',async()=>{
 const {dom,w,d}=await app();try{
 w.verDetalleProducto(1);d.querySelector('#addToQuoteBtn').click();
 assert.equal(d.querySelector('#productDetailModal').classList.contains('active'),false);assert.equal(d.querySelector('#quoteSidebar').classList.contains('active'),true);assert.equal(d.activeElement,d.querySelector('#closeQuoteSidebar'));
 w.closeQuoteSidebar();assert.equal(d.activeElement,d.querySelector('#cartToggleBtn'));
 }finally{dom.window.close()}
});
test('direct WhatsApp consultation includes selected option and quantity',async()=>{
 const variant={id:9,titulo:'Azul',precio:150,stock:0};
 const {dom,w,d}=await app({variantes:[variant]});try{
 w.verDetalleProducto(1);await new Promise(r=>setTimeout(r,5));d.querySelector('.variant-opt-btn').click();w.changeModalQty(2);
 const message=new URL(d.querySelector('#modalWhatsAppBtn').href).searchParams.get('text');assert.match(message,/Azul/);assert.match(message,/Cantidad: 3/);assert.match(message,/150/);
 assert.match(d.querySelector('#modalProductStock').textContent,/CONSULTAR/);assert.equal(d.querySelector('.variant-opt-btn').getAttribute('aria-pressed'),'true');
 }finally{dom.window.close()}
});
test('closing a dialog opened from a non-focusable card returns focus to a visible control',async()=>{
 const {dom,w,d}=await app();try{w.verDetalleProducto(1);w.cerrarModalProducto();assert.equal(d.activeElement,d.querySelector('#cartToggleBtn'))}finally{dom.window.close()}
});
test('failed option loading is visible instead of silently looking like no options',async()=>{
 const {dom,w,d}=await app({variantes:()=>({data:null,error:{message:'offline'}})});try{
 w.verDetalleProducto(1);await new Promise(r=>setTimeout(r,5));assert.equal(d.querySelector('#modalProductVariants').style.display,'block');assert.match(d.querySelector('#variantsSelectorContainer').textContent,/No se pudieron cargar/);
 }finally{dom.window.close()}
});
test('late options from a previous product cannot replace the current product options',async()=>{
 const resolves=[];const {dom,w,d}=await app({variantes:()=>new Promise(resolve=>resolves.push(resolve))});try{
 w.verDetalleProducto(1);w.verDetalleProducto(2);await new Promise(r=>setTimeout(r,5));
 resolves[1]({data:[{id:22,titulo:'Current'}],error:null});await new Promise(r=>setTimeout(r,5));resolves[0]({data:[{id:11,titulo:'Old'}],error:null});await new Promise(r=>setTimeout(r,5));
 assert.equal(d.querySelectorAll('.variant-opt-btn').length,1);assert.equal(d.querySelector('.variant-opt-btn').innerText,'Current');
 }finally{dom.window.close()}
});
test('closed quote panel is hidden from keyboard and accessibility, with real styles',async()=>{
 const {dom,w,d}=await app();try{
 const style=d.createElement('style');style.textContent=fs.readFileSync('styles.css','utf8');d.head.append(style);
 const panel=d.querySelector('#quoteSidebar');assert.equal(w.getComputedStyle(panel).visibility,'hidden');assert.equal(panel.hasAttribute('inert'),true);assert.equal(panel.getAttribute('aria-hidden'),'true');
 w.openQuoteSidebar();assert.equal(w.getComputedStyle(panel).visibility,'visible');assert.equal(panel.hasAttribute('inert'),false);assert.equal(panel.getAttribute('aria-hidden'),'false');
 w.closeQuoteSidebar();assert.equal(panel.hasAttribute('inert'),true);assert.equal(panel.getAttribute('aria-hidden'),'true');
 }finally{dom.window.close()}
});
test('footer navigation restores sections hidden by category detail',async()=>{
 const {dom,w,d}=await app();try{
 w.verDetalleCategoria(1);d.querySelector('footer a[href="#productos"]').click();await new Promise(r=>setTimeout(r,5));
 assert.equal(d.querySelector('#productos').style.display,'');assert.equal(d.querySelector('#categoryDetailView').style.display,'none');assert.equal(w.location.hash,'#productos');
 }finally{dom.window.close()}
});
test('category detail supports direct links and browser back/forward',async()=>{
 const {dom,w,d}=await app({}, {url:'https://example.test/#categoria/1'});try{
 assert.equal(d.querySelector('#categoryDetailView').style.display,'block');w.volverAlInicio();assert.equal(w.location.hash,'#categorias');
 w.history.back();await new Promise(r=>setTimeout(r,30));assert.equal(d.querySelector('#categoryDetailView').style.display,'block');
 w.history.forward();await new Promise(r=>setTimeout(r,30));assert.equal(d.querySelector('#categoryDetailView').style.display,'none');
 }finally{dom.window.close()}
});
test('Enter in product search opens matching catalog results',async()=>{
 const {dom,w,d}=await app();try{
 w.verDetalleCategoria(1);const input=d.querySelector('.searchInput');input.value='martillo';input.dispatchEvent(new w.Event('input'));input.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
 assert.equal(d.querySelector('#productos').style.display,'');assert.equal(d.querySelectorAll('#productsGrid .product-card').length,1);
 }finally{dom.window.close()}
});
test('invalid persisted quote items cannot break WhatsApp generation',async()=>{
 const {dom,w,d}=await app({}, {cart:[{id:'1',titulo:null,qty:1},{id:'2',titulo:'Valid product',qty:2,precio:20}]});try{
 let opened;w.open=url=>{opened=url};assert.equal(d.querySelectorAll('#quoteItemsList .quote-item').length,1);assert.doesNotThrow(()=>w.generateWhatsAppQuote());assert.match(new URL(opened).searchParams.get('text'),/VALID PRODUCT/);
 }finally{dom.window.close()}
});
