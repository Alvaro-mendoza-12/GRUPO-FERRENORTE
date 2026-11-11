const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
async function admin(handler=()=>({data:[],error:null})){
 const dom=new JSDOM(fs.readFileSync('admin.html','utf8'),{url:'https://admin.example.test/',runScripts:'outside-only'});
 const w=dom.window,alerts=[],calls=[];
 w.console={log(){},error(){},warn(){}};w.alert=message=>alerts.push(message);w.confirm=()=>true;
 w.supabaseClient={auth:{getSession:async()=>({data:{session:null},error:null}),signOut:async()=>({error:null})},from(table){
 const request={table,action:'select',filters:[]};
 const q={select(){return q},eq(key,value){request.filters.push([key,value]);return q},order(){return q},single(){return q},delete(){request.action='delete';return q},insert(payload){request.action='insert';request.payload=payload;return q},update(payload){request.action='update';request.payload=payload;return q},then(resolve,reject){calls.push({...request});return Promise.resolve(handler(request)).then(resolve,reject)}};return q;
 }};
 w.eval(fs.readFileSync('admin-script.js','utf8'));
 await new Promise(r=>setTimeout(r,5));
 return{dom,w,d:w.document,alerts,calls};
}
test('admin product content and apostrophes never become markup or executable handlers',async()=>{
 const {dom,w,d}=await admin();try{
 const title=`O'Brien <img src=x onerror=alert(1)>`;
 w.renderProductosTable([{id:1,titulo:title,descripcion:null,imagen_url:'x" onerror="alert(1)',badge:'<b>sale</b>',orden:0,activo:true}]);
 assert.equal(d.querySelector('#productosTableBody strong').textContent,title);
 assert.equal(d.querySelectorAll('[onerror]').length,0);
 const remove=d.querySelector('#productosTableBody button[title="Eliminar"]');assert.equal(remove.hasAttribute('onclick'),false);
 let received;w.deleteProducto=(...args)=>{received=args};remove.click();assert.deepEqual(received,[1,title]);
 }finally{dom.window.close()}
});
test('admin category and variant strings stay literal',async()=>{
 const {dom,w,d}=await admin();try{
 const title='\"><img src=x onerror=alert(1)>';
 w.renderCategoriasTable([{id:1,titulo:title,descripcion:null,icon:title,badge:title}]);w.addVariantRow({titulo:title,imagen_url:title});
 assert.equal(d.querySelector('.variant-titulo').value,title);
 assert.equal(d.querySelectorAll('[onerror]').length,0);
 }finally{dom.window.close()}
});
test('new product form clears previously edited variants',async()=>{
 const {dom,w,d}=await admin();try{w.addVariantRow({id:8,titulo:'Previous product'});w.openProductoModal();assert.equal(d.querySelectorAll('.variant-row').length,0)}finally{dom.window.close()}
});
test('failed category deletion never reports success',async()=>{
 const {dom,w,alerts}=await admin(()=>({data:null,error:{message:'permission denied'}}));try{
 await w.deleteCategoria(1,'Tools');assert.equal(alerts.includes('Categoría eliminada'),false);assert.ok(alerts.some(x=>x.includes('Error')));
 }finally{dom.window.close()}
});
test('failed configuration save never reports success',async()=>{
 const {dom,w,d,alerts}=await admin(()=>({data:null,error:{message:'permission denied'}}));try{
 d.querySelector('#configForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,5));assert.equal(alerts.includes('Configuración guardada correctamente.'),false);assert.ok(alerts.some(x=>x.includes('Error')));
 }finally{dom.window.close()}
});
module.exports={admin};
test('session lookup failure shows login error and releases loading overlay',async()=>{
 const {dom,w,d}=await admin();try{
 assert.equal(typeof w.initializeAdmin,'function');
 w.supabaseClient.auth.getSession=async()=>({data:null,error:{message:'Network unavailable'}});
 await w.initializeAdmin();assert.equal(d.querySelector('#loginScreen').style.display,'flex');assert.equal(d.querySelector('#loadingOverlay').style.display,'none');assert.match(d.querySelector('#loginError').textContent,/No se pudo/);
 }finally{dom.window.close()}
});
test('variant saves preserve IDs and only remove explicitly omitted rows after writes',async()=>{
 const {dom,w,d,calls}=await admin(req=>req.action==='select'?{data:[{id:9},{id:10}],error:null}:req.action==='insert'?{data:{id:11},error:null}:{data:null,error:null});try{
 await w.loadProductoVariantes(1);d.querySelectorAll('.variant-row')[1].remove();d.querySelector('.variant-titulo').value='Existing';w.addVariantRow({titulo:'New'});await w.saveVariantes(1);
 const changes=calls.filter(x=>x.action!=='select');
 assert.ok(changes.some(x=>x.action==='update'&&x.filters.some(([key,id])=>key==='id'&&String(id)==='9')));
 assert.equal(changes.filter(x=>x.action==='delete').length,1);
 assert.ok(changes.at(-1).filters.some(([key,id])=>key==='id'&&String(id)==='10'));
 assert.equal(d.querySelectorAll('.variant-row')[1].dataset.id,'11');
 }finally{dom.window.close()}
});
test('failed variant insert does not delete existing variants or report success',async()=>{
 const {dom,w,calls}=await admin(req=>req.action==='select'?{data:[{id:9}],error:null}:{data:null,error:{message:'write failed'}});try{
 w.openProductoModal();w.addVariantRow({titulo:'New'});await assert.rejects(()=>w.saveVariantes(1));
 assert.equal(calls.filter(x=>x.action==='delete').length,0);
 }finally{dom.window.close()}
});
test('failed variant image upload stops before database changes',async()=>{
 const {dom,w,d,calls}=await admin(()=>({data:[],error:null}));try{
 w.openProductoModal();w.addVariantRow({titulo:'New'});Object.defineProperty(d.querySelector('.variant-file-input'),'files',{value:[{}]});w.uploadImage=async()=>{throw Error('upload failed')};
 await assert.rejects(()=>w.saveVariantes(1));assert.equal(calls.filter(x=>x.action!=='select').length,0);
 }finally{dom.window.close()}
});
test('failed category update stops before altering its images',async()=>{
 const {dom,w,d,calls,alerts}=await admin(()=>({data:null,error:{message:'update failed'}}));try{
 w.openCategoriaModal();d.querySelector('#categoriaId').value='1';d.querySelector('#categoriaImagenesUrls').value='a||b||c||d';
 d.querySelector('#categoriaForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,5));
 assert.equal(calls.filter(x=>x.table==='categoria_imagenes').length,0);assert.equal(alerts.includes('Categoría guardada'),false);
 }finally{dom.window.close()}
});
test('editing category text preserves unchanged image records',async()=>{
 const {dom,w,d,calls}=await admin(()=>({data:[],error:null}));try{
 w.openCategoriaModal();d.querySelector('#categoriaId').value='1';d.querySelector('#categoriaImagenesUrls').value='a||b||c||d';
 d.querySelector('#categoriaForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,5));
 assert.equal(calls.filter(x=>x.table==='categoria_imagenes'&&x.action!=='select').length,0);
 }finally{dom.window.close()}
});
test('category image replacement updates existing rows without deleting first',async()=>{
 const {dom,w,calls}=await admin(req=>req.action==='select'?{data:[{id:20},{id:21},{id:22},{id:23}],error:null}:{data:null,error:null});try{
 assert.equal(typeof w.saveCategoryImages,'function');await w.saveCategoryImages(1,['a','b','c','d']);
 assert.equal(calls.filter(x=>x.action==='update').length,4);assert.equal(calls.filter(x=>x.action==='delete').length,0);
 }finally{dom.window.close()}
});
test('discarded product responses release their loading operation',async()=>{
 let resolve;const response=new Promise(r=>resolve=r);
 const {dom,w,d}=await admin(()=>response);try{
 const pending=w.loadProductoData(1);await Promise.resolve();w.closeProductoModal();resolve({data:{id:1},error:null});await pending;
 assert.equal(d.querySelector('#loadingOverlay').style.display,'none');
 }finally{dom.window.close()}
});
test('confirmed partial inserts remain removable when a later variant fails',async()=>{
 let fail=true;const {dom,w,d,calls}=await admin(req=>req.action==='insert'?(req.payload[0].titulo==='B'&&fail?{data:null,error:{code:'42501',message:'failed'}}:{data:{id:30},error:null}):{data:[],error:null});try{
 w.openProductoModal();w.addVariantRow({titulo:'A'});w.addVariantRow({titulo:'B'});await assert.rejects(()=>w.saveVariantes(1));
 d.querySelectorAll('.variant-row').forEach(row=>row.remove());fail=false;await w.saveVariantes(1);
 assert.ok(calls.some(req=>req.action==='delete'&&req.filters.some(([key,id])=>key==='id'&&String(id)==='30')));
 }finally{dom.window.close()}
});
test('overlapping admin requests keep loading visible until both finish',async()=>{
 const {dom,w,d}=await admin();try{w.showLoading();w.showLoading();w.hideLoading();assert.equal(d.querySelector('#loadingOverlay').style.display,'flex');w.hideLoading();assert.equal(d.querySelector('#loadingOverlay').style.display,'none')}finally{dom.window.close()}
});
test('editing an inactive variant does not reactivate it',async()=>{
 const {dom,w,calls}=await admin(req=>req.action==='select'?{data:[{id:9,titulo:'Hidden',activo:false}],error:null}:{data:null,error:null});try{await w.loadProductoVariantes(1);await w.saveVariantes(1);assert.equal(calls.find(req=>req.action==='update').payload.activo,false)}finally{dom.window.close()}
});
test('failed sign-out keeps the dashboard and releases loading',async()=>{
 const {dom,w,d,alerts}=await admin();try{
 assert.equal(typeof w.logoutAdmin,'function');d.querySelector('#adminDashboard').style.display='grid';w.supabaseClient.auth.signOut=async()=>({error:{message:'offline'}});
 await w.logoutAdmin();assert.equal(d.querySelector('#adminDashboard').style.display,'grid');assert.equal(d.querySelector('#loadingOverlay').style.display,'none');assert.ok(alerts.length);
 }finally{dom.window.close()}
});
test('category loading failure blocks saving a misleading empty editor',async()=>{
 const {dom,w,d,calls,alerts}=await admin(()=>({data:null,error:{message:'load failed'}}));try{
 w.openCategoriaModal(1);await new Promise(r=>setTimeout(r,5));
 d.querySelector('#categoriaImagenesUrls').value='a||b||c||d';
 d.querySelector('#categoriaForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,5));
 assert.equal(calls.filter(req=>req.action!=='select').length,0);assert.ok(alerts.some(message=>message.includes('carg')));
 }finally{dom.window.close()}
});
test('late category data cannot replace a newly opened blank editor',async()=>{
 let resolve;const response=new Promise(r=>resolve=r);
 const {dom,w,d}=await admin(req=>req.table==='categorias'?response:{data:[],error:null});try{
 const pending=w.loadCategoriaData(1);await Promise.resolve();w.openCategoriaModal();
 resolve({data:{id:1,titulo:'Old category',descripcion:'Old',icon:'fa',activo:true},error:null});await pending;
 assert.equal(d.querySelector('#categoriaId').value,'');assert.equal(d.querySelector('#categoriaTitulo').value,'');
 }finally{dom.window.close()}
});
test('repeated category submit starts only one write',async()=>{
 let resolve;const response=new Promise(r=>resolve=r);
 const {dom,w,d,calls}=await admin(req=>req.action==='update'?response:{data:[],error:null});try{
 w.openCategoriaModal();d.querySelector('#categoriaId').value='1';d.querySelector('#categoriaImagenesUrls').value='a||b||c||d';
 d.querySelector('#categoriaForm').dispatchEvent(new w.Event('submit',{cancelable:true}));d.querySelector('#categoriaForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,5));
 assert.equal(calls.filter(req=>req.action==='update').length,1);resolve({data:null,error:null});await new Promise(r=>setTimeout(r,5));
 }finally{resolve?.({data:null,error:null});dom.window.close()}
});
test('an unconfirmed variant insertion cannot be blindly retried',async()=>{
 const {dom,w,calls}=await admin(()=>({data:null,error:{message:'Failed to fetch'}}));try{
 w.openProductoModal();w.addVariantRow({titulo:'Uncertain'});await assert.rejects(()=>w.saveVariantes(1));await assert.rejects(()=>w.saveVariantes(1));
 assert.equal(calls.filter(req=>req.action==='insert').length,1);
 }finally{dom.window.close()}
});
test('insert confirmation distinguishes server rejection from uncertain response',async()=>{
 const {dom,w}=await admin();try{
 assert.equal(typeof w.confirmInsertedRecord,'function');
 assert.equal(w.confirmInsertedRecord({data:{id:7},error:null}).id,7);
 assert.throws(()=>w.confirmInsertedRecord({data:null,error:{code:'42501',message:'permission denied'}}),error=>!error.uncertainWrite);
 assert.throws(()=>w.confirmInsertedRecord({data:null,error:{message:'Failed to fetch'}}),error=>error.uncertainWrite===true);
 assert.throws(()=>w.confirmInsertedRecord({data:null,error:null}),error=>error.uncertainWrite===true);
 }finally{dom.window.close()}
});
test('confirmed configuration ID is retained so the next save updates it',async()=>{
 const {dom,w,d,calls}=await admin(()=>({data:{id:77},error:null}));try{
 d.querySelector('#configForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,5));
 assert.equal(d.querySelector('#configId').value,'77');
 d.querySelector('#configForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,5));
 assert.equal(calls.filter(req=>req.action==='insert').length,1);assert.equal(calls.filter(req=>req.action==='update').length,1);
 }finally{dom.window.close()}
});
test('transport failures with codes remain uncertain, including aborted requests',async()=>{
 const {dom,w}=await admin();try{
 const reset=Object.assign(new Error('socket reset'),{code:'ECONNRESET'});
 await assert.rejects(()=>w.awaitConfirmedInsert(Promise.reject(reset)),error=>error.uncertainWrite===true);
 await assert.rejects(()=>w.awaitConfirmedInsert(Promise.reject(new w.DOMException('aborted','AbortError'))),error=>error.uncertainWrite===true);
 assert.throws(()=>w.confirmInsertedRecord({data:null,error:reset}),error=>error.uncertainWrite===true);
 }finally{dom.window.close()}
});
