const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {File}=require('node:buffer');
const {JSDOM}=require('jsdom');
async function admin(handler=()=>({data:[],error:null})){
 const dom=new JSDOM(fs.readFileSync('admin.html','utf8'),{url:'https://admin.example.test/',runScripts:'outside-only'});
 const w=dom.window,alerts=[],calls=[];
 w.console={log(){},error(){},warn(){}};w.alert=message=>alerts.push(message);w.confirm=()=>true;
 w.supabaseClient={auth:{getSession:async()=>({data:{session:null},error:null}),signOut:async()=>({error:null})},from(table){
 const request={table,action:'select',filters:[]};
 const q={select(){return q},eq(key,value){request.filters.push([key,value]);return q},order(){return q},limit(value){request.limit=value;return q},single(){return q},delete(){request.action='delete';return q},insert(payload){request.action='insert';request.payload=payload;return q},update(payload){request.action='update';request.payload=payload;return q},then(resolve,reject){calls.push({...request});return Promise.resolve(handler(request)).then(resolve,reject)}};return q;
 }};
 w.eval(fs.readFileSync('upload-validation.js','utf8'));
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
 const {dom,w,d,alerts}=await admin(req=>req.action==='select'?{data:[],error:null}:{data:null,error:{code:'42501',message:'permission denied'}});try{
 await w.loadConfiguracion();
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
 const {dom,w,d,calls}=await admin(req=>req.action==='select'?{data:[{id:9},{id:10}],error:null}:req.action==='insert'?{data:{id:11},error:null}:{data:{id:9},error:null});try{
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
 w.openProductoModal();w.addVariantRow({titulo:'New'});Object.defineProperty(d.querySelector('.variant-file-input'),'files',{value:[new File([Uint8Array.from([255,216,255])],'photo.jpg',{type:'image/jpeg'})]});w.uploadImage=async()=>{throw Error('upload failed')};
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
 const {dom,w,d,calls,alerts}=await admin(req=>({data:req.action==='select'?[]:{id:1},error:null}));try{
 w.openCategoriaModal();d.querySelector('#categoriaId').value='1';d.querySelector('#categoriaImagenesUrls').value='a||b||c||d';
 d.querySelector('#categoriaForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,5));
 assert.equal(calls.filter(x=>x.table==='categoria_imagenes'&&x.action!=='select').length,0);assert.ok(alerts.includes('Categoría guardada'));
 }finally{dom.window.close()}
});
test('category image replacement updates existing rows without deleting first',async()=>{
 const {dom,w,calls}=await admin(req=>req.action==='select'?{data:[{id:20},{id:21},{id:22},{id:23}],error:null}:{data:{id:9},error:null});try{
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
 let fail=true;const {dom,w,d,calls}=await admin(req=>req.action==='insert'?(req.payload[0].titulo==='B'&&fail?{data:null,error:{code:'42501',message:'failed'}}:{data:{id:30},error:null}):{data:{id:30},error:null});try{
 w.openProductoModal();w.addVariantRow({titulo:'A'});w.addVariantRow({titulo:'B'});await assert.rejects(()=>w.saveVariantes(1));
 d.querySelectorAll('.variant-row').forEach(row=>row.remove());fail=false;await w.saveVariantes(1);
 assert.ok(calls.some(req=>req.action==='delete'&&req.filters.some(([key,id])=>key==='id'&&String(id)==='30')));
 }finally{dom.window.close()}
});
test('overlapping admin requests keep loading visible until both finish',async()=>{
 const {dom,w,d}=await admin();try{w.showLoading();w.showLoading();w.hideLoading();assert.equal(d.querySelector('#loadingOverlay').style.display,'flex');w.hideLoading();assert.equal(d.querySelector('#loadingOverlay').style.display,'none')}finally{dom.window.close()}
});
test('editing an inactive variant does not reactivate it',async()=>{
 const {dom,w,calls}=await admin(req=>req.action==='select'?{data:[{id:9,titulo:'Hidden',activo:false}],error:null}:{data:{id:9},error:null});try{await w.loadProductoVariantes(1);await w.saveVariantes(1);assert.equal(calls.find(req=>req.action==='update').payload.activo,false)}finally{dom.window.close()}
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
 assert.equal(calls.filter(req=>req.action==='update').length,1);resolve({data:{id:1},error:null});await new Promise(r=>setTimeout(r,5));
 }finally{resolve?.({data:{id:1},error:null});dom.window.close()}
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
 const {dom,w,d,calls}=await admin(req=>({data:req.action==='select'?[]:{id:77},error:null}));try{
 await w.loadConfiguracion();
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

async function submitConfiguration(w,d){
 d.querySelector('#configForm').dispatchEvent(new w.Event('submit',{cancelable:true}));
 await new Promise(r=>setTimeout(r,5));
}
test('configuration cannot be saved before a confirmed initial load',async()=>{
 const {dom,w,d,calls,alerts}=await admin();try{
 await submitConfiguration(w,d);
 assert.equal(calls.filter(req=>req.action!=='select').length,0);
 assert.ok(alerts.some(message=>/carg/i.test(message)));
 }finally{dom.window.close()}
});
for (const [label,result] of [
 ['read error',{data:null,error:{message:'offline'}}],
 ['multiple rows',{data:[{id:1},{id:2}],error:null}],
 ['missing collection',{data:null,error:null}],
 ['missing row ID',{data:[{nombre_sitio:'Invalid'}],error:null}]
]) test(`configuration ${label} blocks writes and reports the problem`,async()=>{
 const {dom,w,d,calls,alerts}=await admin(()=>result);try{
 await w.loadConfiguracion();
 assert.ok(alerts.length,'loading failure must be visible before submit');
 await submitConfiguration(w,d);
 assert.equal(calls.filter(req=>req.action!=='select').length,0);
 assert.equal(d.querySelector('#loadingOverlay').style.display,'none');
 }finally{dom.window.close()}
});
test('one loaded configuration is updated, never inserted',async()=>{
 const {dom,w,d,calls}=await admin(req=>({data:req.action==='select'?[{id:12,nombre_sitio:'Existing'}]:{id:12},error:null}));try{
 await w.loadConfiguracion();assert.equal(d.querySelector('#configNombre').value,'Existing');
 await submitConfiguration(w,d);
 const writes=calls.filter(req=>req.action!=='select');
 assert.equal(writes.length,1);assert.equal(writes[0].action,'update');
 assert.deepEqual(writes[0].filters,[['id','12']]);
 }finally{dom.window.close()}
});
test('a confirmed empty configuration clears stale fields and permits insertion',async()=>{
 const {dom,w,d,calls}=await admin(req=>({data:req.action==='select'?[]:{id:13},error:null}));try{
 d.querySelector('#configId').value='old';d.querySelector('#configNombre').value='Old';
 d.querySelector('#configLogoPreview').innerHTML='<img src="old">';
 await w.loadConfiguracion();
 assert.equal(d.querySelector('#configId').value,'');assert.equal(d.querySelector('#configNombre').value,'');
 assert.equal(d.querySelector('#configLogoPreview').children.length,0);
 await submitConfiguration(w,d);assert.equal(calls.filter(req=>req.action==='insert').length,1);
 }finally{dom.window.close()}
});
test('only the latest configuration load can unlock saving or replace fields',async()=>{
 let resolve;let count=0;const pending=new Promise(r=>resolve=r);
 const {dom,w,d,calls}=await admin(req=>req.action==='select'?(++count===1?pending:{data:[{id:22,nombre_sitio:'Latest'}],error:null}):{data:{id:9},error:null});try{
 const first=w.loadConfiguracion();await Promise.resolve();
 await submitConfiguration(w,d);assert.equal(calls.filter(req=>req.action!=='select').length,0);
 await w.loadConfiguracion();resolve({data:[{id:11,nombre_sitio:'Stale'}],error:null});await first;
 assert.equal(d.querySelector('#configId').value,'22');assert.equal(d.querySelector('#configNombre').value,'Latest');
 assert.equal(d.querySelector('#loadingOverlay').style.display,'none');
 }finally{resolve?.({data:[],error:null});dom.window.close()}
});
test('failed reload invalidates previously valid configuration for saving',async()=>{
 let fail=false;const {dom,w,d,calls}=await admin(()=>fail?{data:null,error:{message:'offline'}}:{data:[{id:21}],error:null});try{
 await w.loadConfiguracion();fail=true;await w.loadConfiguracion();await submitConfiguration(w,d);
 assert.equal(calls.filter(req=>req.action!=='select').length,0);
 }finally{dom.window.close()}
});
test('reload cannot clear the uncertain configuration insert guard',async()=>{
 const {dom,w,d,calls}=await admin(req=>req.action==='select'?{data:[],error:null}:{data:null,error:{message:'Failed to fetch'}});try{
 await w.loadConfiguracion();await submitConfiguration(w,d);await w.loadConfiguracion();await submitConfiguration(w,d);
 assert.equal(calls.filter(req=>req.action==='insert').length,1);
 }finally{dom.window.close()}
});
test('configuration reloads and repeated submits cannot race an in-flight save',async()=>{
 let resolve;const pending=new Promise(r=>resolve=r);
 const {dom,w,d,calls}=await admin(req=>req.action==='select'?{data:[],error:null}:pending);try{
 await w.loadConfiguracion();await submitConfiguration(w,d);await w.loadConfiguracion();await submitConfiguration(w,d);
 assert.equal(calls.filter(req=>req.action==='select').length,1);
 assert.equal(calls.filter(req=>req.action==='insert').length,1);
 resolve({data:{id:24},error:null});await new Promise(r=>setTimeout(r,5));
 assert.equal(d.querySelector('#configId').value,'24');
 }finally{resolve?.({data:{id:24},error:null});dom.window.close()}
});
test('blanking an existing variant title never implicitly deletes it',async()=>{
 const {dom,w,d,calls}=await admin(req=>({data:req.action==='select'?[{id:7,titulo:'Original'}]:{id:7},error:null}));try{
 await w.loadProductoVariantes(1);d.querySelector('.variant-titulo').value='  ';
 await assert.rejects(()=>w.saveVariantes(1),/título/);assert.equal(calls.filter(req=>req.action!=='select').length,0);
 }finally{dom.window.close()}
});
test('invalid variant titles are rejected before saving the parent product',async()=>{
 const {dom,w,d,calls}=await admin(()=>({data:{id:1},error:null}));try{
 w.openProductoModal();w.addVariantRow({titulo:'  '});d.querySelector('#productoId').value='1';d.querySelector('#productoImagenUrl').value='img/logo.jpeg';
 d.querySelector('#productoForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,5));assert.equal(calls.filter(req=>req.action!=='select').length,0);
 }finally{dom.window.close()}
});
test('zero-row configuration updates are not reported as successful saves',async()=>{
 const {dom,w,d,alerts}=await admin(req=>({data:req.action==='select'?[{id:2}]:[],error:null}));try{
 await w.loadConfiguracion();await submitConfiguration(w,d);assert.equal(alerts.includes('Configuración guardada correctamente.'),false);assert.ok(alerts.some(message=>message.includes('Error')));
 }finally{dom.window.close()}
});
test('zero-row variant updates preserve the editor and report a conflict',async()=>{
 const {dom,w}=await admin(req=>({data:req.action==='select'?[{id:7,titulo:'Original'}]:[],error:null}));try{
 await w.loadProductoVariantes(1);await assert.rejects(()=>w.saveVariantes(1));
 }finally{dom.window.close()}
});
test('zero-row category deletion never announces deletion',async()=>{
 const {dom,w,alerts}=await admin(()=>({data:[],error:null}));try{await w.deleteCategoria(1,'Missing');assert.equal(alerts.includes('Categoría eliminada'),false);assert.ok(alerts.some(message=>message.includes('Error')))}finally{dom.window.close()}
});
test('zero-row image update stops replacement instead of claiming success',async()=>{
 const {dom,w}=await admin(req=>({data:req.action==='select'?[{id:20}]:[],error:null}));try{await assert.rejects(()=>w.saveCategoryImages(1,['new.jpg']))}finally{dom.window.close()}
});
test('uploadImage rejects invalid files before reaching storage',async()=>{
 const {dom,w}=await admin();try{
 let uploaded=0;w.supabaseClient.storage={from(){return{upload:async()=>{uploaded++;return{error:null}},getPublicUrl:()=>({data:{publicUrl:'https://example.test/file'}})}}};
 await assert.rejects(()=>w.uploadImage(new File(['hello'],'bad.txt',{type:'text/plain'}),'productos'));assert.equal(uploaded,0);
 }finally{dom.window.close()}
});
test('valid uploaded image uses its normalized extension',async()=>{
 const {dom,w}=await admin();try{
 let path;w.supabaseClient.storage={from(){return{upload:async name=>{path=name;return{error:null}},getPublicUrl:()=>({data:{publicUrl:'https://example.test/photo.jpg'}})}}};
 assert.equal(await w.uploadImage(new File([Uint8Array.from([255,216,255])],'photo.JPEG',{type:'image/jpeg'}),'productos'),'https://example.test/photo.jpg');assert.match(path,/\.jpg$/);
 }finally{dom.window.close()}
});
test('failed variant upload does not save the parent product first',async()=>{
 const {dom,w,d,calls}=await admin(()=>({data:{id:1},error:null}));try{
 w.openProductoModal();w.addVariantRow({titulo:'New'});Object.defineProperty(d.querySelector('.variant-file-input'),'files',{value:[new File([Uint8Array.from([255,216,255])],'photo.jpg',{type:'image/jpeg'})]});w.uploadImage=async()=>{throw Error('upload failed')};
 d.querySelector('#productoId').value='1';d.querySelector('#productoImagenUrl').value='img/logo.jpeg';d.querySelector('#productoForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,10));assert.equal(calls.filter(req=>req.action!=='select').length,0);
 }finally{dom.window.close()}
});
test('all category images are validated before uploading the first one',async()=>{
 const {dom,w,d,calls}=await admin(()=>({data:{id:1},error:null}));try{
 let uploads=0;w.uploadImage=async()=>{uploads++;return'https://example.test/image.jpg'};w.openCategoriaModal();
 const valid=new File([Uint8Array.from([255,216,255])],'photo.jpg',{type:'image/jpeg'});const invalid=new File(['bad'],'bad.txt',{type:'text/plain'});
 Object.defineProperty(d.querySelector('#categoriaImagenes'),'files',{value:[valid,invalid,valid,valid]});d.querySelector('#categoriaForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,10));assert.equal(uploads,0);assert.equal(calls.filter(req=>req.action!=='select').length,0);
 }finally{dom.window.close()}
});
test('invalid main product image prevents uploading variant images first',async()=>{
 const {dom,w,d}=await admin(()=>({data:{id:1},error:null}));try{
 let uploads=0;w.uploadImage=async()=>{uploads++;return'https://example.test/image.jpg'};w.openProductoModal();w.addVariantRow({titulo:'Valid option'});
 Object.defineProperty(d.querySelector('.variant-file-input'),'files',{value:[new File([Uint8Array.from([255,216,255])],'photo.jpg',{type:'image/jpeg'})]});Object.defineProperty(d.querySelector('#productoImagen'),'files',{value:[new File(['bad'],'bad.txt',{type:'text/plain'})]});
 d.querySelector('#productoForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,10));assert.equal(uploads,0);
 }finally{dom.window.close()}
});
