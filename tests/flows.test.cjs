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
 w.supabaseClient={from(table){const query={table,filters:[]};const q={select(){return q},eq(key,value){query.filters.push([key,value]);return q},order(){return q},single(){return q},then(resolve){options.queries?.push(query);const value=(table in overrides?overrides:fixture)[table];return Promise.resolve(typeof value==='function'?value(query):{data:value,error:null}).then(resolve)}};return q}};
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
 let opened;w.open=url=>{opened=url};assert.equal(d.querySelectorAll('#quoteItemsList .quote-item').length,1);assert.doesNotThrow(()=>w.generateWhatsAppQuote());assert.match(new URL(opened).searchParams.get('text'),/MARTILLO/);
 }finally{dom.window.close()}
});

test('a pending site configuration does not block catalog or category deep links',async()=>{
 let finishConfig;
 const {dom,w,d}=await app({configuracion:()=>new Promise(resolve=>{finishConfig=resolve})},{url:'https://example.test/#categoria/1'});
 try {
  assert.equal(d.querySelectorAll('#productsGrid .product-card').length,2);
  assert.equal(d.querySelectorAll('#categoryProductsGrid .product-card').length,2);
  w.verDetalleProducto(1);
  finishConfig({data:{nombre_sitio:'Marca actualizada',contacto_whatsapp:'51999888777'},error:null});
  await new Promise(r=>setTimeout(r,5));
  assert.equal(d.title,'Marca actualizada');
  assert.equal(new URL(d.querySelector('#modalWhatsAppBtn').href).pathname,'/51999888777');
 } finally {dom.window.close()}
});

test('adding a saved quote item refreshes its current catalog details',async()=>{
 const old={id:'1',originalId:1,titulo:'Título antiguo',precio:50,imagen:'old.png',qty:2};
 const {dom,w}=await app({}, {cart:[old]});
 try {
  w.addToQuote(1,3);
  const cart=JSON.parse(w.localStorage.getItem('ferrenorte_quote'));
  assert.equal(cart.length,1);assert.equal(cart[0].qty,5);
  assert.equal(cart[0].titulo,'Taladro');assert.equal(cart[0].precio,100);
  assert.equal(cart[0].imagen,'img/logo.jpeg');
 } finally {dom.window.close()}
});

test('adding a saved variant refreshes option price without merging other options',async()=>{
 const old={id:'1_9',originalId:1,titulo:'Anterior',variante:'Rojo',precio:50,qty:998};
 const other={...old,id:'1_10',variante:'Negro',qty:2};
 const {dom,w}=await app({}, {cart:[old,other]});
 try {
  w.addToQuote(1,3,{id:9,titulo:'Azul',precio:150,imagen_url:'azul.png'});
  const cart=JSON.parse(w.localStorage.getItem('ferrenorte_quote'));
  assert.equal(cart.length,2);assert.equal(cart[0].qty,999);
  assert.equal(cart[0].variante,'Azul');assert.equal(cart[0].precio,150);
  assert.equal(cart[0].imagen,'azul.png');assert.equal(cart[1].qty,2);
  assert.equal(cart[1].variante,'Negro');
 } finally {dom.window.close()}
});

test('WhatsApp actions wait for the configured destination without blocking browsing',async()=>{
 let finishConfig;
 const {dom,w,d}=await app({configuracion:()=>new Promise(resolve=>{finishConfig=resolve})});
 try {
  const alerts=[];const opened=[];w.alert=message=>alerts.push(message);w.open=url=>opened.push(url);
  w.verDetalleProducto(1);w.addToQuote(1);
  assert.equal(d.querySelector('#modalWhatsAppBtn').hasAttribute('href'),false);
  assert.equal(d.querySelector('.contact-whatsapp').hasAttribute('href'),false);
  w.generateWhatsAppQuote();
  d.querySelector('#contactForm').dispatchEvent(new w.Event('submit',{cancelable:true}));
  const click=new w.MouseEvent('click',{bubbles:true,cancelable:true});
  d.querySelector('#modalWhatsAppBtn').dispatchEvent(click);
  assert.equal(click.defaultPrevented,true);assert.equal(opened.length,0);assert.equal(alerts.length,3);
  finishConfig({data:{contacto_whatsapp:'51999888777'},error:null});
  await new Promise(r=>setTimeout(r,5));w.generateWhatsAppQuote();
  assert.equal(new URL(opened[0]).pathname,'/51999888777');
  assert.equal(new URL(d.querySelector('.contact-whatsapp').href).pathname,'/51999888777');
 } finally {dom.window.close()}
});


const savedQuote={id:'1',originalId:999,titulo:'Título anterior',precio:50,imagen:'old.png',qty:3};
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));

test('restored quote refreshes published details without adding the item again',async()=>{
 const {dom,w,d}=await app({}, {cart:[savedQuote]});
 try {
  const [item]=JSON.parse(w.localStorage.getItem('ferrenorte_quote'));
  assert.equal(item.titulo,'Taladro');assert.equal(item.precio,100);assert.equal(item.imagen,'img/logo.jpeg');
  assert.equal(item.originalId,1);assert.equal(item.qty,3);assert.equal('validation' in item,false);
  assert.equal(d.querySelector('#sendQuoteBtn').disabled,false);
  let opened;w.open=url=>{opened=url};w.generateWhatsAppQuote();
  assert.match(new URL(opened).searchParams.get('text'),/TALADRO/);
  assert.doesNotMatch(new URL(opened).searchParams.get('text'),/ANTERIOR/);
 } finally {dom.window.close()}
});

test('restored variants use active options of their product and preserve quantities',async()=>{
 const queries=[];
 const variants=[{id:9,producto_id:1,titulo:'Azul actual',precio:150,imagen_url:'azul.png',stock:0},{id:10,producto_id:1,titulo:'Negro actual',precio:0}];
 const {dom,w,d}=await app({variantes:variants},{queries,cart:[{...savedQuote,id:'1_9',variante:'Azul anterior'},{...savedQuote,id:'1_10',qty:2,variante:'Negro anterior'}]});
 try {
  const items=JSON.parse(w.localStorage.getItem('ferrenorte_quote'));
  assert.deepEqual(items.map(item=>[item.variante,item.precio,item.imagen,item.qty]),[['Azul actual',150,'azul.png',3],['Negro actual',100,'img/logo.jpeg',2]]);
  const calls=queries.filter(query=>query.table==='variantes');assert.equal(calls.length,1);
  assert.deepEqual(calls[0].filters,[['producto_id',1],['activo',true]]);
  assert.deepEqual(queries.find(query=>query.table==='productos').filters,[['activo',true]]);
  assert.equal(d.querySelector('#sendQuoteBtn').disabled,false);
  let opened;w.open=url=>{opened=url};w.generateWhatsAppQuote();assert.match(new URL(opened).searchParams.get('text'),/Azul actual/);
  assert.equal(variants[0].stock,0);
 } finally {dom.window.close()}
});

test('pending published catalog blocks stale quotes even with a persisted verified flag',async()=>{
 let finish;
 const {dom,w,d}=await app({productos:()=>new Promise(resolve=>{finish=resolve})},{cart:[{...savedQuote,validation:'ready'}]});
 try {
  let opened=0;const alerts=[];w.open=()=>opened++;w.alert=message=>alerts.push(message);
  assert.equal(d.querySelector('#sendQuoteBtn').disabled,true);
  assert.match(d.querySelector('#quoteValidationNotice').textContent,/verificando/i);
  assert.doesNotMatch(d.querySelector('.quote-item-price').textContent,/50/);
  w.generateWhatsAppQuote();assert.equal(opened,0);assert.match(alerts[0],/verificando/i);
  w.addToQuote(1);assert.equal(d.querySelector('.cart-count').textContent,'3');
  finish({data:fixture.productos,error:null});await tick();
  assert.equal(d.querySelector('#sendQuoteBtn').disabled,false);w.generateWhatsAppQuote();assert.equal(opened,1);
 } finally {dom.window.close()}
});

test('failed catalog preserves selections and offers a deduplicated retry',async()=>{
 let calls=0;let finishRetry;
 const {dom,w,d}=await app({productos:()=>++calls===1?{data:null,error:{message:'offline'}}:new Promise(resolve=>{finishRetry=resolve})},{cart:[savedQuote]});
 try {
  const opened=[];w.open=url=>opened.push(url);w.alert=()=>{};
  assert.equal(d.querySelectorAll('.quote-item').length,1);assert.equal(d.querySelector('#sendQuoteBtn').disabled,true);
  assert.match(d.querySelector('#quoteValidationNotice').textContent,/No se pudo verificar/i);
  w.generateWhatsAppQuote();assert.equal(opened.length,0);
  d.querySelector('#retryQuoteValidationBtn').click();d.querySelector('#retryQuoteValidationBtn').click();await tick();
  assert.equal(calls,2);assert.equal(d.querySelector('#sendQuoteBtn').disabled,true);
  w.addToQuote(1);assert.equal(d.querySelector('.cart-count').textContent,'3');
  finishRetry({data:fixture.productos,error:null});await tick();
  assert.equal(d.querySelector('#sendQuoteBtn').disabled,false);
  assert.equal(JSON.parse(w.localStorage.getItem('ferrenorte_quote'))[0].qty,3);
  w.generateWhatsAppQuote();assert.equal(opened.length,1);
 } finally {dom.window.close()}
});

test('unpublished products remain visible and block sending until explicitly removed',async()=>{
 const {dom,w,d}=await app({}, {cart:[savedQuote,{...savedQuote,id:'99',titulo:'Retirado'}]});
 try {
  const opened=[];w.open=url=>opened.push(url);w.alert=()=>{};
  assert.equal(d.querySelectorAll('.quote-item').length,2);assert.equal(d.querySelector('#sendQuoteBtn').disabled,true);
  assert.match(d.querySelectorAll('.quote-item')[1].textContent,/ya no está disponible/i);
  assert.match(d.querySelectorAll('.remove-item-btn')[1].getAttribute('aria-label'),/Retirar.*Retirado/);
  w.generateWhatsAppQuote();assert.equal(opened.length,0);
  w.removeFromQuote('99');assert.equal(d.querySelector('#sendQuoteBtn').disabled,false);
  w.generateWhatsAppQuote();assert.equal(opened.length,1);
 } finally {dom.window.close()}
});

test('removed or mismatched variants are not silently replaced by the base product',async()=>{
 const {dom,w,d}=await app({variantes:[{id:9,producto_id:2,titulo:'De otro producto',precio:999}]},{cart:[{...savedQuote,id:'1_9',variante:'Opción retirada'}]});
 try {
  w.alert=()=>{};let opened=0;w.open=()=>opened++;
  assert.equal(d.querySelectorAll('.quote-item').length,1);assert.equal(d.querySelector('#sendQuoteBtn').disabled,true);
  assert.match(d.querySelector('.quote-item').textContent,/opción ya no está disponible/i);
  assert.match(d.querySelector('.quote-review-options').textContent,/Ver opciones/i);
  assert.equal(JSON.parse(w.localStorage.getItem('ferrenorte_quote'))[0].id,'1_9');
  w.generateWhatsAppQuote();assert.equal(opened,0);
 } finally {dom.window.close()}
});

test('failed saved option validation can retry without losing the selection',async()=>{
 let calls=0;
 const {dom,w,d}=await app({variantes:()=>++calls===1?{data:null,error:{message:'offline'}}:{data:[{id:9,producto_id:1,titulo:'Actualizada',precio:125}],error:null}},{cart:[{...savedQuote,id:'1_9',variante:'Anterior'}]});
 try {
  assert.equal(d.querySelector('#sendQuoteBtn').disabled,true);assert.match(d.querySelector('#quoteValidationNotice').textContent,/No se pudo verificar/i);
  d.querySelector('#retryQuoteValidationBtn').click();await tick();
  assert.equal(calls,2);assert.equal(d.querySelector('#sendQuoteBtn').disabled,false);
  const [item]=JSON.parse(w.localStorage.getItem('ferrenorte_quote'));assert.equal(item.variante,'Actualizada');assert.equal(item.qty,3);
 } finally {dom.window.close()}
});

test('late option validation cannot restore a removed item or overwrite a newly added option',async()=>{
 let finish;
 const {dom,w,d}=await app({variantes:()=>new Promise(resolve=>{finish=resolve})},{url:'https://example.test/#categoria/1',cart:[{...savedQuote,id:'1_9',variante:'Vieja'},{...savedQuote,id:'1_10',variante:'Retirar'}]});
 try {
  assert.equal(d.querySelector('#sendQuoteBtn').disabled,true);
  assert.equal(d.querySelectorAll('#categoryProductsGrid .product-card').length,2);
  w.removeFromQuote('1_10');w.removeFromQuote('1_9');
  w.addToQuote(1,2,{id:9,producto_id:1,titulo:'Selección reciente',precio:200});
  finish({data:[{id:9,producto_id:1,titulo:'Respuesta anterior',precio:100},{id:10,producto_id:1,titulo:'No restaurar',precio:70}],error:null});await tick();
  const items=JSON.parse(w.localStorage.getItem('ferrenorte_quote'));
  assert.equal(items.length,1);assert.equal(items[0].variante,'Selección reciente');assert.equal(items[0].qty,2);
  assert.equal(d.querySelector('#sendQuoteBtn').disabled,false);
 } finally {dom.window.close()}
});


test('an empty published catalog retains saved selections as unavailable, not failed',async()=>{
 const {dom,w,d}=await app({productos:[]},{cart:[savedQuote]});
 try {
  assert.equal(d.querySelectorAll('.quote-item').length,1);
  assert.match(d.querySelector('.quote-item').textContent,/ya no está disponible/i);
  assert.equal(d.querySelector('#retryQuoteValidationBtn').hidden,true);
  assert.equal(d.querySelector('#sendQuoteBtn').disabled,true);
  assert.equal(JSON.parse(w.localStorage.getItem('ferrenorte_quote'))[0].qty,3);
 } finally {dom.window.close()}
});

test('saved variants are checked separately for each published product',async()=>{
 const queries=[];
 const {dom,w,d}=await app({variantes:query=>({data:[{id:9,producto_id:query.filters[0][1],titulo:`Opción ${query.filters[0][1]}`,precio:125}],error:null})},
  {queries,cart:[{...savedQuote,id:'1_9',variante:'Primera'},{...savedQuote,id:'2_9',variante:'Segunda'}]});
 try {
  const items=JSON.parse(w.localStorage.getItem('ferrenorte_quote'));
  assert.deepEqual(items.map(item=>[item.id,item.titulo,item.variante]),[['1_9','Taladro','Opción 1'],['2_9','Martillo','Opción 2']]);
  assert.deepEqual(queries.filter(query=>query.table==='variantes').map(query=>query.filters),[[['producto_id',1],['activo',true]],[['producto_id',2],['activo',true]]]);
  assert.equal(d.querySelector('#sendQuoteBtn').disabled,false);
 } finally {dom.window.close()}
});

test('a saved inactive option is retained for removal and cannot be quoted',async()=>{
 const {dom,w,d}=await app({variantes:[{id:9,producto_id:1,titulo:'Inactiva',activo:false}]},{cart:[{...savedQuote,id:'1_9',variante:'Anterior'}]});
 try {
  assert.equal(d.querySelectorAll('.quote-item').length,1);
  assert.match(d.querySelector('.quote-item').textContent,/opción ya no está disponible/i);
  assert.equal(d.querySelector('#sendQuoteBtn').disabled,true);
  w.openQuoteSidebar();d.querySelector('.quote-review-options[data-product-id]').click();
  assert.equal(d.querySelector('#productDetailModal').classList.contains('active'),true);
  assert.equal(d.querySelector('#quoteSidebar').classList.contains('active'),false);
 } finally {dom.window.close()}
});

test('saved option completion preserves the focused quote item and control',async()=>{
 let finish;
 const {dom,w,d}=await app({variantes:()=>new Promise(resolve=>{finish=resolve})},{cart:[savedQuote,{...savedQuote,id:'1_9',variante:'Anterior'}]});
 try {
  w.openQuoteSidebar();
  const focused=d.querySelectorAll('.quote-item')[1].querySelector('.qty-control button:last-child');focused.focus();
  finish({data:[{id:9,producto_id:1,titulo:'Actualizada',precio:150}],error:null});await tick();
  const replacement=d.querySelectorAll('.quote-item')[1].querySelector('.qty-control button:last-child');
  assert.notEqual(replacement,focused);assert.equal(d.activeElement,replacement);
  w.changeCartQty('1_9',1);
  assert.equal(d.activeElement,d.querySelectorAll('.quote-item')[1].querySelector('.qty-control button:last-child'));
 } finally {dom.window.close()}
});

test('removing the focused quote line keeps focus inside the open dialog',async()=>{
 const {dom,w,d}=await app({}, {cart:[savedQuote]});
 try {
  w.openQuoteSidebar();d.querySelector('.remove-item-btn').focus();w.removeFromQuote('1');
  assert.equal(d.activeElement,d.querySelector('#closeQuoteSidebar'));
  assert.equal(d.querySelector('#quoteSidebar').classList.contains('active'),true);
 } finally {dom.window.close()}
});

test('background quote refresh never steals focus from another control or a closed panel',async()=>{
 let finish;
 const {dom,w,d}=await app({variantes:()=>new Promise(resolve=>{finish=resolve})},{cart:[{...savedQuote,id:'1_9',variante:'Anterior'}]});
 try {
  w.openQuoteSidebar();const address=d.querySelector('#manualAddress');address.focus();w.renderQuoteItems();assert.equal(d.activeElement,address);
  w.closeQuoteSidebar();const search=d.querySelector('.searchInput');search.focus();
  finish({data:[{id:9,producto_id:1,titulo:'Actualizada',precio:150}],error:null});await tick();
  assert.equal(d.activeElement,search);
 } finally {dom.window.close()}
});

test('catalog retry updates the visible category without navigation or resetting focus',async()=>{
 let calls=0;let finish;
 const {dom,w,d}=await app({productos:()=>++calls===1?{data:null,error:{message:'offline'}}:new Promise(resolve=>{finish=resolve})},
  {url:'https://example.test/#categoria/1',cart:[savedQuote]});
 try {
  assert.equal(d.querySelectorAll('#categoryProductsGrid .product-card').length,0);
  assert.equal(d.querySelector('#categoryNoProducts').style.display,'block');
  w.openQuoteSidebar();d.querySelector('#retryQuoteValidationBtn').click();await tick();
  const address=d.querySelector('#manualAddress');address.focus();address.value='Dirección conservada';
  let scrolls=0;w.scrollTo=()=>scrolls++;
  const historyLength=w.history.length;
  finish({data:fixture.productos,error:null});await tick();
  assert.equal(d.querySelectorAll('#categoryProductsGrid .product-card').length,2);
  assert.equal(d.querySelector('#categoryNoProducts').style.display,'none');
  assert.equal(d.activeElement,address);assert.equal(address.value,'Dirección conservada');
  assert.equal(w.location.hash,'#categoria/1');assert.equal(w.history.length,historyLength);assert.equal(scrolls,0);
  assert.equal(d.querySelector('#quoteSidebar').classList.contains('active'),true);
  w.closeQuoteSidebar();assert.equal(d.querySelector('#categoryDetailView').style.display,'block');
 } finally {dom.window.close()}
});

test('catalog retry invalidates an old modal and prevents stale option reselection during loading',async()=>{
 let productCalls=0;let variantCalls=0;let finishProducts;let finishOldOptions;
 const oldVariant={id:9,producto_id:1,titulo:'Opción anterior',precio:50};
 const currentVariant={id:9,producto_id:1,titulo:'Opción actual',precio:200};
 const {dom,w,d}=await app({
  productos:()=>++productCalls===1?{data:fixture.productos,error:null}:new Promise(resolve=>{finishProducts=resolve}),
  variantes:()=>{
   variantCalls++;
   if(variantCalls===1)return {data:null,error:{message:'offline'}};
   if(variantCalls===2)return new Promise(resolve=>{finishOldOptions=resolve});
   return {data:[currentVariant],error:null};
  }
 },{cart:[{...savedQuote,id:'1_9',variante:'Anterior'}]});
 try {
  w.alert=()=>{};
  w.verDetalleProducto(1);await tick();assert.equal(d.querySelector('#productDetailModal').classList.contains('active'),true);
  w.retryQuoteValidation();await tick();
  assert.equal(d.querySelector('#productDetailModal').classList.contains('active'),false);
  w.closeQuoteSidebar();w.verDetalleProducto(1);await tick();
  assert.equal(d.querySelector('#productDetailModal').classList.contains('active'),false);
  assert.equal(variantCalls,2);
  finishOldOptions({data:[oldVariant],error:null});await tick();
  assert.equal(d.querySelectorAll('.variant-opt-btn').length,0);
  finishProducts({data:[{...fixture.productos[0],titulo:'Taladro actual',precio:200}],error:null});await tick();
  let [item]=JSON.parse(w.localStorage.getItem('ferrenorte_quote'));assert.equal(item.precio,200);assert.equal(item.variante,'Opción actual');
  w.verDetalleProducto(1);await tick();d.querySelector('.variant-opt-btn').click();d.querySelector('#addToQuoteBtn').click();
  [item]=JSON.parse(w.localStorage.getItem('ferrenorte_quote'));
  assert.equal(item.titulo,'Taladro actual');assert.equal(item.precio,200);assert.equal(item.variante,'Opción actual');
 } finally {dom.window.close()}
});

test('quote retry UI cannot send an option chosen from the preceding catalog',async()=>{
 let productCalls=0;let variantCalls=0;let finishProducts;
 const currentVariant={id:9,producto_id:1,titulo:'Opción actual',precio:200};
 const {dom,w,d}=await app({
  productos:()=>++productCalls===1?{data:fixture.productos,error:null}:new Promise(resolve=>{finishProducts=resolve}),
  variantes:()=>++variantCalls===1?{data:null,error:{message:'offline'}}:{data:[currentVariant],error:null}
 },{cart:[{...savedQuote,id:'1_9',variante:'Anterior'}]});
 try {
  w.alert=()=>{};w.openQuoteSidebar();const retry=d.querySelector('#retryQuoteValidationBtn');retry.focus();retry.click();await tick();
  assert.equal(d.activeElement,d.querySelector('#closeQuoteSidebar'));
  w.closeQuoteSidebar();w.verDetalleProducto(1);await tick();
  assert.equal(d.querySelector('#productDetailModal').classList.contains('active'),false);assert.equal(variantCalls,1);
  finishProducts({data:[{...fixture.productos[0],titulo:'Taladro actual',precio:200}],error:null});await tick();
  w.verDetalleProducto(1);await tick();d.querySelector('.variant-opt-btn').click();d.querySelector('#addToQuoteBtn').click();
  const [item]=JSON.parse(w.localStorage.getItem('ferrenorte_quote'));
  assert.equal(item.precio,200);assert.equal(item.variante,'Opción actual');assert.equal(item.qty,4);
  let opened;w.open=url=>{opened=url};w.generateWhatsAppQuote();
  assert.match(new URL(opened).searchParams.get('text'),/Opción actual/);
 } finally {dom.window.close()}
});

test('mobile catalog search remains outside the collapsible navigation',async()=>{
 const {dom,w,d}=await app();try{
 const menu=d.getElementById(d.getElementById('mobileMenuToggle').getAttribute('aria-controls'));
 const search=d.querySelector('.mobile-search .searchInput');
 assert.equal(menu.contains(search),false,'Search must be reachable without opening navigation');
 search.value='martillo';search.dispatchEvent(new w.Event('input'));
 assert.equal(d.querySelectorAll('#productsGrid .product-card').length,1);
 assert.match(d.querySelector('#productsGrid').textContent,/Martillo/);
 assert.equal(d.getElementById('mobileMenuToggle').getAttribute('aria-expanded'),'false');
 }finally{dom.window.close()}
});

test('category cards disclose missing prices and identify their quote controls',async()=>{
 const {dom,w,d}=await app();try{
 w.verDetalleCategoria(1);
 const cards=[...d.querySelectorAll('#categoryProductsGrid .product-card')];
 assert.ok(cards[0].querySelector('.product-pricing'),'Category cards expose a price summary');
 assert.match(cards[0].querySelector('.product-pricing').textContent,/S\/ 100\.00/);
 assert.match(cards[1].querySelector('.product-pricing').textContent,/Consultar precio/i);
 assert.match(cards[1].querySelector('.btn-quote-small').getAttribute('aria-label'),/Martillo/);
 }finally{dom.window.close()}
});

test('catalog cards stay visible when intersection observers never report visibility',async()=>{
 const {dom,w,d}=await app();try{
 // app() deliberately supplies an observer that never calls its callback.
 w.initializeAnimations();
 const cards=[...d.querySelectorAll('.product-card, .category-card')];
 assert.ok(cards.length>=3);
 for(const card of cards){
  assert.notEqual(w.getComputedStyle(card).opacity,'0','Published cards must not wait for a scroll callback');
 }
 }finally{dom.window.close()}
});

test('quote quantity and removal controls provide 44px touch targets',async()=>{
 const {dom,w,d}=await app();try{
 const style=d.createElement('style');style.textContent=fs.readFileSync('styles.css','utf8');d.head.append(style);
 w.addToQuote(1);
 const controls=d.querySelectorAll('.qty-control button, .remove-item-btn');
 assert.ok(controls.length>=5);
 for(const control of controls){
  const actual=w.getComputedStyle(control);
  assert.ok(parseFloat(actual.width)>=44,`${control.className||'Quantity button'} needs a 44px width`);
  assert.ok(parseFloat(actual.height)>=44,`${control.className||'Quantity button'} needs a 44px height`);
 }
 }finally{dom.window.close()}
});

test('product photos cannot contribute their intrinsic height to card sizing',async()=>{
 const {dom,w,d}=await app();try{
 const style=d.createElement('style');style.textContent=fs.readFileSync('styles.css','utf8');d.head.append(style);
 const media=d.querySelector('.product-image');
 const photo=media.querySelector('img');
 // A portrait image must be painted inside the square, not size the grid row.
 photo.setAttribute('width','172');photo.setAttribute('height','350');
 assert.equal(w.getComputedStyle(photo).position,'absolute');
 assert.equal(w.getComputedStyle(media).aspectRatio,'1 / 1');
 assert.equal(w.getComputedStyle(media).overflow,'hidden');
 assert.equal(w.getComputedStyle(photo).objectFit,'contain');
 }finally{dom.window.close()}
});
