import { MAP_LAYERS, PALETTES, createStarterMap } from './map/default-map.js';
import { BUILDING_STYLES, PROP_STYLES, INTERACTION_STYLES, styleForBuilding, shadeHex } from './map/world-kit.js';

const STORAGE_KEY='riftcity-2d-map-draft-ground-v2';
const ASSET_LAB_KEY='riftcity-asset-lab-v1';
const groundImage=new Image();
groundImage.src='./assets/downtown-ground.svg';
const $=selector=>document.querySelector(selector);
const canvas=$('#map-canvas');
const minimap=$('#minimap');
const ctx=canvas.getContext('2d');
const miniCtx=minimap.getContext('2d');
const status=$('#status');

const state={
  map:loadDraft()||createStarterMap(),
  tool:'select',
  view:'plan',
  night:false,
  palette:{
    building:PALETTES.building[0].id,
    prop:PALETTES.prop[0].id,
    zone:PALETTES.zone[0].id,
    interaction:PALETTES.interaction[0].id
  },
  selected:null,
  camera:{x:0,y:0,zoom:1},
  hiddenLayers:new Set(),
  grid:true,
  pointer:{screenX:0,screenY:0,worldX:0,worldY:0},
  gesture:null,
  drawPreview:null,
  draggingObject:false,
  dragObjectOffset:null,
  preview:false,
  player:{x:0,y:0,radius:14,speed:270},
  keys:new Set(),
  moveButtons:new Set(),
  touches:new Map(),
  pinch:null,
  undo:[],
  redo:[],
  dpr:1,
  lastFrame:performance.now()
};

const assetLab={
  open:false,
  assets:[],
  selectedId:null,
  background:'checker',
  width:1200,
  height:800,
  dragging:false,
  dragPointer:null,
  dragStart:null,
  imageCache:new Map()
};

init();

function init(){
  state.camera.x=state.map.width/2;
  state.camera.y=state.map.height/2;
  state.player.x=state.map.playerSpawn?.x??state.map.width/2;
  state.player.y=state.map.playerSpawn?.y??state.map.height/2;
  populateStyleSelect();
  bindUi();
  renderLayers();
  renderPalette();
  syncMapInputs();
  updateModeLabel();
  $('#preview-hud').hidden=true;
  $('#mobile-dpad').hidden=true;
  document.body.classList.remove('walk-active');
  refreshInspector();
  refreshStats();
  initAssetLab();
  resizeCanvas();
  requestAnimationFrame(()=>{
    fitMap();
    requestAnimationFrame(frame);
  });
}

function populateStyleSelect(){
  $('#object-style').innerHTML=Object.entries(BUILDING_STYLES)
    .map(([id,style])=>`<option value="${escapeAttr(id)}">${escapeHtml(style.label)}</option>`).join('');
}

function bindUi(){
  window.addEventListener('resize',resizeCanvas);

  document.querySelectorAll('[data-tool]').forEach(button=>{
    button.addEventListener('click',()=>setTool(button.dataset.tool));
  });

  $('#lighting-toggle').addEventListener('click',toggleLighting);

  $('#preview-toggle').addEventListener('click',togglePreview);
  $('#preview-exit').addEventListener('click',togglePreview);

  $('#undo-button').addEventListener('click',undo);
  $('#redo-button').addEventListener('click',redo);
  $('#grid-toggle').addEventListener('click',()=>{
    state.grid=!state.grid;
    $('#grid-toggle').classList.toggle('active',state.grid);
  });

  $('#restore-authored').addEventListener('click',restoreAuthored);
  $('#fit-map').addEventListener('click',fitMap);
  $('#clear-map').addEventListener('click',clearMap);
  $('#map-width').addEventListener('change',applyMapSettings);
  $('#map-height').addEventListener('change',applyMapSettings);
  $('#grid-size').addEventListener('change',applyMapSettings);

  $('#export-json').addEventListener('click',exportMap);
  $('#import-json').addEventListener('click',()=>$('#import-file').click());
  $('#import-file').addEventListener('change',async event=>{
    const file=event.target.files?.[0];
    if(!file)return;
    try{importMap(JSON.parse(await file.text()),file.name);}
    catch(error){say(`Import failed: ${error.message}`);}
    event.target.value='';
  });

  $('#paste-json').addEventListener('click',()=>{
    $('#paste-panel').hidden=false;
    $('#paste-input').focus();
  });
  $('#paste-cancel').addEventListener('click',()=>{
    $('#paste-panel').hidden=true;
    $('#paste-input').value='';
  });
  $('#paste-apply').addEventListener('click',()=>{
    try{
      importMap(JSON.parse($('#paste-input').value),'pasted JSON');
      $('#paste-panel').hidden=true;
      $('#paste-input').value='';
    }catch(error){say(`Import failed: ${error.message}`);}
  });

  $('#library-toggle').addEventListener('click',()=>document.body.classList.toggle('library-open'));
  $('#inspector-toggle').addEventListener('click',()=>document.body.classList.toggle('inspector-open'));
  document.querySelectorAll('[data-close-panel]').forEach(button=>{
    button.addEventListener('click',()=>document.body.classList.remove(`${button.dataset.closePanel}-open`));
  });

  $('#zoom-in').addEventListener('click',()=>zoomAt(canvas.clientWidth/2,canvas.clientHeight/2,1.2));
  $('#zoom-out').addEventListener('click',()=>zoomAt(canvas.clientWidth/2,canvas.clientHeight/2,1/1.2));
  $('#zoom-reset').addEventListener('click',()=>{
    state.camera.zoom=1;
    updateZoomLabel();
  });

  canvas.addEventListener('contextmenu',event=>event.preventDefault());
  canvas.addEventListener('pointerdown',onPointerDown);
  canvas.addEventListener('pointermove',onPointerMove);
  canvas.addEventListener('pointerup',onPointerUp);
  canvas.addEventListener('pointercancel',onPointerUp);
  canvas.addEventListener('wheel',onWheel,{passive:false});

  $('#duplicate-object').addEventListener('click',duplicateSelected);
  $('#delete-object').addEventListener('click',deleteSelected);
  $('#center-object').addEventListener('click',centerSelected);
  $('#set-spawn').addEventListener('click',setSpawnFromSelected);
  $('#raise-object').addEventListener('click',()=>reorderSelected(1));
  $('#lower-object').addEventListener('click',()=>reorderSelected(-1));

  document.querySelectorAll('[data-field]').forEach(input=>{
    input.addEventListener('change',()=>applyInspectorField(input.dataset.field,input.value));
  });
  $('#object-label').addEventListener('change',event=>applySimpleField('label',event.target.value));
  $('#object-color').addEventListener('change',event=>applySimpleField('color',event.target.value));
  $('#object-layer').addEventListener('change',event=>changeSelectedLayer(event.target.value));
  $('#object-collision').addEventListener('change',event=>applySimpleField('collision',event.target.checked));
  $('#object-floors').addEventListener('change',event=>{
    const o=state.selected;if(!o||o.type!=='building')return;
    pushUndo();o.floors=clamp(Math.round(Number(event.target.value)||1),1,30);saveDraft();refreshInspector();
  });
  $('#object-style').addEventListener('change',event=>{
    const o=state.selected;if(!o||o.type!=='building')return;
    pushUndo();o.style=BUILDING_STYLES[event.target.value]?event.target.value:'brick-warm';
    o.color=styleForBuilding(o.style).faceX;saveDraft();refreshInspector();
  });
  $('#object-asset').addEventListener('change',event=>{
    const o=state.selected;if(!o||o.type!=='building')return;
    pushUndo();o.assetId=String(event.target.value||'').trim().slice(0,100);saveDraft();refreshInspector();
  });

  document.querySelectorAll('[data-move]').forEach(button=>{
    const direction=button.dataset.move;
    const add=event=>{event.preventDefault();state.moveButtons.add(direction);};
    const remove=event=>{event.preventDefault();state.moveButtons.delete(direction);};
    button.addEventListener('pointerdown',add);
    button.addEventListener('pointerup',remove);
    button.addEventListener('pointercancel',remove);
    button.addEventListener('pointerleave',remove);
  });

  window.addEventListener('keydown',event=>{
    if(assetLab.open)return;
    if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
    state.keys.add(event.code);
    const mod=event.ctrlKey||event.metaKey;
    if(mod&&event.code==='KeyZ'){event.preventDefault();return event.shiftKey?redo():undo();}
    if(mod&&event.code==='KeyY'){event.preventDefault();return redo();}
    if(mod&&event.code==='KeyD'){event.preventDefault();return duplicateSelected();}
    if(event.code==='Delete'||event.code==='Backspace'){event.preventDefault();return deleteSelected();}
    const shortcuts={KeyV:'select',KeyH:'pan',KeyR:'road',KeyB:'building',KeyP:'prop',KeyZ:'zone',KeyI:'interaction'};
    if(shortcuts[event.code]&&!mod){event.preventDefault();return setTool(shortcuts[event.code]);}
    if(!state.preview&&state.selected&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.code)){
      event.preventDefault();nudgeSelected(event.code,event.shiftKey?4:1);
    }
  });
  window.addEventListener('keyup',event=>state.keys.delete(event.code));
}


function initAssetLab(){
  try{
    const saved=JSON.parse(localStorage.getItem(ASSET_LAB_KEY)||'null');
    if(saved?.format==='riftcity-asset-lab'&&Array.isArray(saved.assets)){
      assetLab.assets=saved.assets;
      assetLab.selectedId=saved.selectedId||saved.assets[0]?.id||null;
      assetLab.background=saved.background||'checker';
      assetLab.width=Number(saved.width)||1200;
      assetLab.height=Number(saved.height)||800;
    }
  }catch(_){}

  $('#asset-lab-toggle').addEventListener('click',()=>setAssetLabOpen(true));
  $('#asset-lab-close').addEventListener('click',()=>setAssetLabOpen(false));
  $('#asset-import').addEventListener('click',()=>$('#asset-import-file').click());
  $('#asset-import-file').addEventListener('change',importAssetFiles);
  $('#asset-duplicate').addEventListener('click',duplicateAsset);
  $('#asset-delete').addEventListener('click',deleteAsset);
  $('#asset-reset-transform').addEventListener('click',resetAssetTransform);
  $('#asset-fit').addEventListener('click',fitSelectedAsset);
  $('#asset-export-png').addEventListener('click',exportAssetPreviewPng);
  $('#asset-export-pack').addEventListener('click',exportAssetPack);
  $('#asset-import-pack').addEventListener('click',()=>$('#asset-pack-file').click());
  $('#asset-pack-file').addEventListener('change',importAssetPack);

  document.querySelectorAll('[data-asset-bg]').forEach(button=>{
    button.addEventListener('click',()=>{
      assetLab.background=button.dataset.assetBg;
      document.querySelectorAll('[data-asset-bg]').forEach(b=>b.classList.toggle('active',b===button));
      saveAssetLab();
      drawAssetStage();
    });
  });

  for(const id of ['asset-name','asset-id','asset-x','asset-y','asset-scale','asset-rotation','asset-opacity','asset-ground-y']){
    $('#'+id).addEventListener('input',applyAssetInspector);
  }
  $('#asset-shadow').addEventListener('change',applyAssetInspector);
  $('#asset-guide').addEventListener('change',()=>{
    $('#asset-lab').classList.toggle('hide-ground-guide',!$('#asset-guide').checked);
  });
  $('#asset-preview-size').addEventListener('change',event=>{
    const [w,h]=event.target.value.split('x').map(Number);
    assetLab.width=w;assetLab.height=h;
    const stage=$('#asset-stage');stage.width=w;stage.height=h;
    saveAssetLab();fitSelectedAsset();renderAssetLab();
  });

  const stage=$('#asset-stage');
  stage.addEventListener('pointerdown',assetPointerDown);
  stage.addEventListener('pointermove',assetPointerMove);
  stage.addEventListener('pointerup',assetPointerUp);
  stage.addEventListener('pointercancel',assetPointerUp);
  stage.addEventListener('wheel',event=>{
    if(!selectedAsset())return;
    event.preventDefault();
    const a=selectedAsset();
    a.scale=clamp(a.scale*Math.exp(-event.deltaY*.0015),.05,8);
    syncAssetInspector();saveAssetLab();drawAssetStage();
  },{passive:false});

  const sizeValue=`${assetLab.width}x${assetLab.height}`;
  if([...$('#asset-preview-size').options].some(o=>o.value===sizeValue))$('#asset-preview-size').value=sizeValue;
  stage.width=assetLab.width;stage.height=assetLab.height;
  renderAssetLab();
}

function setAssetLabOpen(open){
  assetLab.open=!!open;
  $('#asset-lab').hidden=!open;
  document.body.classList.toggle('asset-lab-open',open);
  $('#asset-lab-toggle').classList.toggle('active',open);
  if(open){
    state.preview=false;
    document.body.classList.remove('walk-active');
    $('#preview-hud').hidden=true;
    $('#mobile-dpad').hidden=true;
    renderAssetLab();
    requestAnimationFrame(drawAssetStage);
  }
}

function assetId(){
  return `asset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
}

function selectedAsset(){
  return assetLab.assets.find(a=>a.id===assetLab.selectedId)||null;
}

async function importAssetFiles(event){
  const list=[...(event.target.files||[])];
  for(const file of list){
    if(!/^image\//.test(file.type))continue;
    const dataUrl=await fileToDataUrl(file);
    const dimensions=await imageDimensions(dataUrl);
    const item={
      id:assetId(),
      name:file.name.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' '),
      assetId:`building.${file.name.replace(/\.[^.]+$/,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}.a`,
      fileName:file.name,
      mime:file.type||'image/png',
      src:dataUrl,
      sourceWidth:dimensions.width,
      sourceHeight:dimensions.height,
      x:assetLab.width/2,
      y:Math.round(assetLab.height*.74),
      scale:1,
      rotation:0,
      opacity:1,
      groundY:Math.round(assetLab.height*.78),
      shadow:true
    };
    assetLab.assets.push(item);
    assetLab.selectedId=item.id;
    await ensureAssetImage(item);
    fitSelectedAsset(false);
  }
  event.target.value='';
  saveAssetLab();renderAssetLab();
  say(`${list.length} artwork file${list.length===1?'':'s'} imported into Asset Lab.`);
}

function fileToDataUrl(file){
  return new Promise((resolve,reject)=>{
    const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(r.error);r.readAsDataURL(file);
  });
}
function imageDimensions(src){
  return new Promise((resolve,reject)=>{
    const img=new Image();img.onload=()=>resolve({width:img.naturalWidth,height:img.naturalHeight});img.onerror=reject;img.src=src;
  });
}
function ensureAssetImage(asset){
  if(!asset)return Promise.resolve(null);
  const cached=assetLab.imageCache.get(asset.id);
  if(cached?.complete)return Promise.resolve(cached);
  return new Promise((resolve,reject)=>{
    const img=new Image();img.onload=()=>{assetLab.imageCache.set(asset.id,img);resolve(img);drawAssetStage();};
    img.onerror=reject;img.src=asset.src;
  });
}

function renderAssetLab(){
  $('#asset-count').textContent=`${assetLab.assets.length} asset${assetLab.assets.length===1?'':'s'}`;
  $('#asset-list').innerHTML=assetLab.assets.length?assetLab.assets.map(asset=>`
    <button class="asset-list-item ${asset.id===assetLab.selectedId?'active':''}" data-asset-select="${escapeAttr(asset.id)}">
      <span class="asset-thumb"><img src="${asset.src}" alt=""></span>
      <span><strong>${escapeHtml(asset.name||'Untitled asset')}</strong><small>${escapeHtml(asset.assetId||'No asset ID')}</small></span>
    </button>
  `).join(''):'<div class="asset-empty">Import the first transparent storefront image.</div>';
  document.querySelectorAll('[data-asset-select]').forEach(button=>{
    button.addEventListener('click',()=>{
      assetLab.selectedId=button.dataset.assetSelect;
      syncAssetInspector();saveAssetLab();renderAssetLab();drawAssetStage();
    });
  });

  document.querySelectorAll('[data-asset-bg]').forEach(button=>button.classList.toggle('active',button.dataset.assetBg===assetLab.background));
  syncAssetInspector();
  $('#asset-duplicate').disabled=!selectedAsset();
  $('#asset-delete').disabled=!selectedAsset();
  $('#asset-export-png').disabled=!selectedAsset();
  drawAssetStage();
}

function syncAssetInspector(){
  const a=selectedAsset();
  const values={
    'asset-name':a?.name||'','asset-id':a?.assetId||'',
    'asset-x':a?round(a.x):'','asset-y':a?round(a.y):'',
    'asset-scale':a?Number(a.scale||1).toFixed(2):'',
    'asset-rotation':a?round(a.rotation||0):'',
    'asset-opacity':a?Number(a.opacity??1).toFixed(2):'',
    'asset-ground-y':a?round(a.groundY??assetLab.height*.78):''
  };
  for(const [id,value] of Object.entries(values)){
    $('#'+id).value=value;$('#'+id).disabled=!a;
  }
  $('#asset-shadow').checked=!!a?.shadow;
  $('#asset-shadow').disabled=!a;
  $('#asset-stage-readout').textContent=a?`${a.sourceWidth}×${a.sourceHeight} source · ${Math.round((a.scale||1)*100)}%`:'No asset loaded';
}

function applyAssetInspector(){
  const a=selectedAsset();if(!a)return;
  a.name=$('#asset-name').value.slice(0,80);
  a.assetId=$('#asset-id').value.slice(0,100);
  a.x=clamp(Number($('#asset-x').value)||0,-assetLab.width,assetLab.width*2);
  a.y=clamp(Number($('#asset-y').value)||0,-assetLab.height,assetLab.height*2);
  a.scale=clamp(Number($('#asset-scale').value)||1,.05,8);
  a.rotation=clamp(Number($('#asset-rotation').value)||0,-180,180);
  a.opacity=clamp(Number($('#asset-opacity').value)||1,.1,1);
  a.groundY=clamp(Number($('#asset-ground-y').value)||assetLab.height*.78,0,assetLab.height);
  a.shadow=$('#asset-shadow').checked;
  saveAssetLab();renderAssetLab();
}

function fitSelectedAsset(center=true){
  const a=selectedAsset();if(!a)return;
  const maxW=assetLab.width*.72,maxH=assetLab.height*.68;
  a.scale=Math.min(maxW/Math.max(1,a.sourceWidth),maxH/Math.max(1,a.sourceHeight));
  if(center){a.x=assetLab.width/2;a.y=assetLab.height*.77;}
  a.groundY=assetLab.height*.79;
  syncAssetInspector();saveAssetLab();drawAssetStage();
}

function resetAssetTransform(){
  const a=selectedAsset();if(!a)return;
  a.x=assetLab.width/2;a.y=assetLab.height*.77;a.rotation=0;a.opacity=1;a.shadow=true;
  fitSelectedAsset(false);saveAssetLab();renderAssetLab();
}

function duplicateAsset(){
  const a=selectedAsset();if(!a)return;
  const copy=clone(a);copy.id=assetId();copy.name=`${a.name} Copy`;copy.assetId=`${a.assetId}.copy`;
  copy.x+=35;copy.y+=20;assetLab.assets.push(copy);assetLab.selectedId=copy.id;
  saveAssetLab();renderAssetLab();
}
function deleteAsset(){
  const a=selectedAsset();if(!a)return;
  assetLab.assets=assetLab.assets.filter(x=>x.id!==a.id);assetLab.imageCache.delete(a.id);
  assetLab.selectedId=assetLab.assets[0]?.id||null;saveAssetLab();renderAssetLab();
}

function assetPointerDown(event){
  const a=selectedAsset();if(!a)return;
  const p=assetPointerPosition(event);
  if(!assetHit(a,p.x,p.y))return;
  event.preventDefault();
  $('#asset-stage').setPointerCapture?.(event.pointerId);
  assetLab.dragging=true;assetLab.dragPointer=event.pointerId;
  assetLab.dragStart={clientX:event.clientX,clientY:event.clientY,x:a.x,y:a.y};
}
function assetPointerMove(event){
  if(!assetLab.dragging||event.pointerId!==assetLab.dragPointer)return;
  const a=selectedAsset();if(!a)return;
  const rect=$('#asset-stage').getBoundingClientRect();
  const sx=assetLab.width/rect.width,sy=assetLab.height/rect.height;
  a.x=assetLab.dragStart.x+(event.clientX-assetLab.dragStart.clientX)*sx;
  a.y=assetLab.dragStart.y+(event.clientY-assetLab.dragStart.clientY)*sy;
  syncAssetInspector();drawAssetStage();
}
function assetPointerUp(event){
  if(event.pointerId!==assetLab.dragPointer)return;
  assetLab.dragging=false;assetLab.dragPointer=null;assetLab.dragStart=null;saveAssetLab();
}
function assetPointerPosition(event){
  const rect=$('#asset-stage').getBoundingClientRect();
  return{x:(event.clientX-rect.left)*assetLab.width/rect.width,y:(event.clientY-rect.top)*assetLab.height/rect.height};
}
function assetHit(a,x,y){
  const w=a.sourceWidth*a.scale,h=a.sourceHeight*a.scale;
  return x>=a.x-w/2&&x<=a.x+w/2&&y>=a.y-h&&y<=a.y+20;
}

function drawAssetStage(){
  if(!$('#asset-stage'))return;
  const stage=$('#asset-stage'),c=stage.getContext('2d');
  c.clearRect(0,0,stage.width,stage.height);
  drawAssetBackground(c,stage.width,stage.height);
  const a=selectedAsset();
  if(!a){
    c.fillStyle='#aab2b7';c.font='700 28px system-ui';c.textAlign='center';
    c.fillText('IMPORT A STOREFRONT ASSET',stage.width/2,stage.height/2);
    return;
  }
  const img=assetLab.imageCache.get(a.id);
  if(!img){ensureAssetImage(a).catch(()=>{});return;}
  const w=a.sourceWidth*a.scale,h=a.sourceHeight*a.scale;
  c.save();
  if(a.shadow){
    c.fillStyle='rgba(0,0,0,.28)';
    c.beginPath();c.ellipse(a.x,a.groundY+10,Math.max(40,w*.34),Math.max(10,w*.055),0,0,Math.PI*2);c.fill();
  }
  c.globalAlpha=a.opacity??1;
  c.translate(a.x,a.y);
  c.rotate((a.rotation||0)*Math.PI/180);
  c.drawImage(img,-w/2,-h,w,h);
  c.restore();

  c.save();c.strokeStyle='#d78e36';c.setLineDash([8,6]);c.lineWidth=2;
  c.strokeRect(a.x-w/2,a.y-h,w,h);c.restore();
}

function drawAssetBackground(c,w,h){
  if(assetLab.background==='checker'){
    const s=32;
    for(let y=0;y<h;y+=s)for(let x=0;x<w;x+=s){
      c.fillStyle=((x/s+y/s)&1)?'#20262b':'#161b20';c.fillRect(x,y,s,s);
    }
  }else if(assetLab.background==='street'){
    c.fillStyle='#9baeb5';c.fillRect(0,0,w,h*.52);
    c.fillStyle='#c1beb2';c.fillRect(0,h*.52,w,h*.24);
    c.fillStyle='#373c3f';c.fillRect(0,h*.76,w,h*.24);
    c.strokeStyle='#d9cf85';c.lineWidth=4;c.setLineDash([28,22]);c.beginPath();c.moveTo(0,h*.90);c.lineTo(w,h*.90);c.stroke();c.setLineDash([]);
  }else{
    const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#102033');g.addColorStop(.55,'#27333a');g.addColorStop(.56,'#88867e');g.addColorStop(.77,'#88867e');g.addColorStop(.78,'#22282d');g.addColorStop(1,'#11161b');c.fillStyle=g;c.fillRect(0,0,w,h);
    c.fillStyle='#e2c77b18';for(let x=40;x<w;x+=180)c.fillRect(x,h*.54,3,h*.18);
  }
  c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=2;c.beginPath();c.moveTo(0,h*.79);c.lineTo(w,h*.79);c.stroke();
}

function saveAssetLab(){
  try{
    localStorage.setItem(ASSET_LAB_KEY,JSON.stringify({
      format:'riftcity-asset-lab',version:1,
      selectedId:assetLab.selectedId,background:assetLab.background,width:assetLab.width,height:assetLab.height,
      assets:assetLab.assets
    }));
  }catch(error){
    console.warn('Asset Lab local save failed',error);
  }
}

function exportAssetPack(){
  const pack={
    format:'riftcity-asset-pack',version:1,
    exportedAt:new Date().toISOString(),
    preview:{width:assetLab.width,height:assetLab.height,background:assetLab.background},
    assets:assetLab.assets
  };
  downloadText(JSON.stringify(pack,null,2),'riftcity-storefront-assets.json','application/json');
}
async function importAssetPack(event){
  const file=event.target.files?.[0];if(!file)return;
  try{
    const raw=JSON.parse(await file.text());
    if(raw?.format!=='riftcity-asset-pack'||!Array.isArray(raw.assets))throw new Error('Not a RiftCity asset pack.');
    assetLab.assets=raw.assets.slice(0,100);
    assetLab.width=clamp(Number(raw.preview?.width)||1200,400,2400);
    assetLab.height=clamp(Number(raw.preview?.height)||800,300,1800);
    assetLab.background=raw.preview?.background||'checker';
    assetLab.selectedId=assetLab.assets[0]?.id||null;
    const stage=$('#asset-stage');stage.width=assetLab.width;stage.height=assetLab.height;
    assetLab.imageCache.clear();
    saveAssetLab();renderAssetLab();say(`Loaded ${assetLab.assets.length} storefront assets.`);
  }catch(error){say(`Asset pack import failed: ${error.message}`);}
  event.target.value='';
}
function exportAssetPreviewPng(){
  const a=selectedAsset();if(!a)return;
  const stage=$('#asset-stage');
  stage.toBlob(blob=>{
    if(!blob)return;
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=`${(a.assetId||a.name||'riftcity-asset').replace(/[^a-z0-9._-]+/gi,'-')}-preview.png`;
    link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  },'image/png');
}
function downloadText(text,name,type){
  const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function resizeCanvas(){
  const rect=canvas.getBoundingClientRect();
  state.dpr=Math.min(window.devicePixelRatio||1,2);
  const width=Math.max(1,Math.floor(rect.width*state.dpr));
  const height=Math.max(1,Math.floor(rect.height*state.dpr));
  if(canvas.width!==width||canvas.height!==height){
    canvas.width=width;
    canvas.height=height;
    ctx.setTransform(state.dpr,0,0,state.dpr,0,0);

  }
}

function toggleLighting(){
  state.night=!state.night;
  $('#lighting-toggle').classList.toggle('active',state.night);
  $('#lighting-toggle').textContent=state.night?'DAY':'NIGHT';
  say(state.night?'Night preview enabled.':'Day preview enabled.');
}

function setTool(tool){
  if(state.preview)return;
  state.tool=tool;
  state.drawPreview=null;
  document.querySelectorAll('[data-tool]').forEach(button=>button.classList.toggle('active',button.dataset.tool===tool));
  updateModeLabel();
  renderPalette();
  say(`${tool.toUpperCase()} tool.`);
}

function updateModeLabel(){
  $('#mode-label').textContent=state.preview?'WALK · 2D':`${state.tool.toUpperCase()} · 2D`;
}

function renderLayers(){
  $('#layer-list').innerHTML=MAP_LAYERS.map(layer=>`
    <div class="layer-row">
      <span class="layer-swatch" style="background:${layer.color}"></span>
      <button data-layer-toggle="${layer.id}">${layer.label}</button>
    </div>
  `).join('');
  document.querySelectorAll('[data-layer-toggle]').forEach(button=>{
    button.addEventListener('click',()=>{
      const layer=button.dataset.layerToggle;
      if(state.hiddenLayers.has(layer))state.hiddenLayers.delete(layer);
      else state.hiddenLayers.add(layer);
      button.classList.toggle('hidden-layer',state.hiddenLayers.has(layer));
    });
  });
}

function paletteForTool(){
  if(['building','prop','zone','interaction'].includes(state.tool))return PALETTES[state.tool];
  return [];
}

function renderPalette(){
  const list=paletteForTool();
  const title={select:'SELECT',pan:'PAN',road:'ROADS',building:'BUILDINGS',prop:'PROPS',zone:'ZONES',interaction:'INTERACTIONS'}[state.tool]||'TOOLS';
  $('#palette-title').textContent=title;
  $('#palette-help').textContent=state.tool==='road'?'Drag from start to end':list.length?'Choose a placement style':state.tool==='select'?'Tap an object to review':'Drag to move around the district';
  $('#palette-list').innerHTML=list.map(item=>`
    <button class="palette-item ${state.palette[state.tool]===item.id?'active':''}" data-palette="${escapeAttr(item.id)}">
      <span class="palette-icon" style="background:${normalizeColor(item.color||'#777777')}"></span>
      <span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.style||item.id)}</small></span>
    </button>
  `).join('');
  document.querySelectorAll('[data-palette]').forEach(button=>{
    button.addEventListener('click',()=>{
      state.palette[state.tool]=button.dataset.palette;
      renderPalette();
    });
  });
}

function onPointerDown(event){
  canvas.focus({preventScroll:true});
  canvas.setPointerCapture?.(event.pointerId);
  updatePointer(event);

  if(event.pointerType==='touch'){
    state.touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(state.touches.size>=2){
      state.draggingObject=false;
      state.dragObjectOffset=null;
      state.drawPreview=null;
      state.gesture=null;
      return;
    }
  }

  if(state.preview)return;

  if(state.tool==='pan'||event.button===1||event.button===2||event.altKey){
    state.gesture={type:'pan',startX:event.clientX,startY:event.clientY,cameraX:state.camera.x,cameraY:state.camera.y,pointerId:event.pointerId};
    return;
  }

  if(state.tool==='select'){
    const hit=hitTest(state.pointer.worldX,state.pointer.worldY,state.pointer.screenX,state.pointer.screenY);
    selectObject(hit);
    if(hit){
      pushUndo();
      state.draggingObject=true;
      state.dragObjectOffset=getDragOffset(hit,state.pointer.worldX,state.pointer.worldY);
    }
    return;
  }

  if(state.tool==='road'){
    const p=snapPoint(state.pointer.worldX,state.pointer.worldY);
    state.drawPreview={type:'road',x1:p.x,y1:p.y,x2:p.x,y2:p.y};
    return;
  }

  if(state.tool==='building'||state.tool==='zone'){
    const p=snapPoint(state.pointer.worldX,state.pointer.worldY);
    state.drawPreview={type:state.tool,startX:p.x,startY:p.y,x:p.x,y:p.y,width:0,height:0};
    return;
  }

  if(state.tool==='prop'||state.tool==='interaction'){
    pushUndo();
    const p=snapPoint(state.pointer.worldX,state.pointer.worldY);
    const item=getPaletteItem(state.tool,state.palette[state.tool]);
    const object=createPointObject(state.tool,item,p.x,p.y);
    collectionForLayer(object.layer).push(object);
    selectObject(object);
    saveDraft();
  }
}

function onPointerMove(event){
  if(event.pointerType==='touch'&&state.touches.has(event.pointerId)){
    state.touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(handlePinch())return;
  }

  updatePointer(event);
  if(state.preview)return;

  if(state.gesture?.type==='pan'){
    const dx=event.clientX-state.gesture.startX;
    const dy=event.clientY-state.gesture.startY;
    const delta=screenDeltaToWorld(dx,dy,state.camera.zoom,state.view);
    state.camera.x=state.gesture.cameraX-delta.x;
    state.camera.y=state.gesture.cameraY-delta.y;
    clampCamera();
    return;
  }

  if(state.draggingObject&&state.selected){
    moveSelectedTo(state.pointer.worldX,state.pointer.worldY);
    refreshInspector();
    return;
  }

  if(state.drawPreview?.type==='road'){
    const p=snapPoint(state.pointer.worldX,state.pointer.worldY);
    state.drawPreview.x2=p.x;
    state.drawPreview.y2=p.y;
    return;
  }

  if(state.drawPreview&&(state.drawPreview.type==='building'||state.drawPreview.type==='zone')){
    const p=snapPoint(state.pointer.worldX,state.pointer.worldY);
    const x1=state.drawPreview.startX,y1=state.drawPreview.startY;
    state.drawPreview.x=Math.min(x1,p.x);
    state.drawPreview.y=Math.min(y1,p.y);
    state.drawPreview.width=Math.abs(p.x-x1);
    state.drawPreview.height=Math.abs(p.y-y1);
  }
}

function onPointerUp(event){
  if(event.pointerType==='touch'){
    state.touches.delete(event.pointerId);
    if(state.touches.size<2)state.pinch=null;
  }
  if(state.preview)return;

  if(state.gesture?.pointerId===event.pointerId)state.gesture=null;

  if(state.draggingObject){
    state.draggingObject=false;
    state.dragObjectOffset=null;
    saveDraft();
  }

  if(state.drawPreview?.type==='road'){
    const d=state.drawPreview;
    if(Math.hypot(d.x2-d.x1,d.y2-d.y1)>=state.map.gridSize){
      pushUndo();
      const road={
        id:newId('road'),type:'road',kind:'road',style:'local',layer:'roads',
        x1:d.x1,y1:d.y1,x2:d.x2,y2:d.y2,width:96,label:'Road',color:'#353b41',collision:false
      };
      state.map.roads.push(road);
      selectObject(road);
      saveDraft();
    }
    state.drawPreview=null;
  }

  if(state.drawPreview&&(state.drawPreview.type==='building'||state.drawPreview.type==='zone')){
    const d=state.drawPreview;
    const min=state.map.gridSize;
    if(d.width>=min&&d.height>=min){
      pushUndo();
      const tool=d.type;
      const item=getPaletteItem(tool,state.palette[tool]);
      const object=tool==='building'?{
        id:newId('building'),type:'building',kind:item.id,layer:'buildings',
        x:d.x+d.width/2,y:d.y+d.height/2,width:d.width,height:d.height,rotation:0,
        floors:item.floors||3,style:item.style||'brick-warm',assetId:item.assetId||`building.${item.id}.a`,
        label:item.label,color:item.color,collision:item.collision!==false
      }:{
        id:newId('zone'),type:'zone',kind:item.id,layer:item.layer||'zones',
        x:d.x+d.width/2,y:d.y+d.height/2,width:d.width,height:d.height,rotation:0,
        label:item.label,color:item.color,collision:false
      };
      collectionForLayer(object.layer).push(object);
      selectObject(object);
      saveDraft();
    }
    state.drawPreview=null;
  }
}

function handlePinch(){
  if(state.touches.size!==2)return false;
  const [a,b]=[...state.touches.values()];
  const rect=canvas.getBoundingClientRect();
  const distance=Math.hypot(a.x-b.x,a.y-b.y);
  const mid={x:(a.x+b.x)/2-rect.left,y:(a.y+b.y)/2-rect.top};
  if(!state.pinch){
    state.pinch={distance,mid};
  }else{
    const factor=distance/Math.max(1,state.pinch.distance);
    zoomAt(mid.x,mid.y,factor);
    const dx=mid.x-state.pinch.mid.x;
    const dy=mid.y-state.pinch.mid.y;
    const delta=screenDeltaToWorld(dx,dy,state.camera.zoom,state.view);
    state.camera.x-=delta.x;
    state.camera.y-=delta.y;
    state.pinch={distance,mid};
  }
  return true;
}

function onWheel(event){
  event.preventDefault();
  const factor=Math.exp(-event.deltaY*.0012);
  zoomAt(event.offsetX,event.offsetY,factor);
}

function updatePointer(event){
  const rect=canvas.getBoundingClientRect();
  state.pointer.screenX=event.clientX-rect.left;
  state.pointer.screenY=event.clientY-rect.top;
  const world=screenToWorld(state.pointer.screenX,state.pointer.screenY);
  state.pointer.worldX=world.x;
  state.pointer.worldY=world.y;
  $('#cursor-readout').textContent=`X ${Math.round(world.x)} · Y ${Math.round(world.y)} · ${Math.round(state.camera.zoom*100)}%`;
}

function zoomAt(screenX,screenY,factor){
  const before=screenToWorld(screenX,screenY);
  state.camera.zoom=clamp(state.camera.zoom*factor,.08,4);
  const after=screenToWorld(screenX,screenY);
  state.camera.x+=before.x-after.x;
  state.camera.y+=before.y-after.y;
  clampCamera();
  updateZoomLabel();
}

function updateZoomLabel(){
  $('#zoom-reset').textContent=`${Math.round(state.camera.zoom*100)}%`;
}

function fitMap(){
  const rect=canvas.getBoundingClientRect();
  const padding=Math.min(120,Math.max(56,rect.width*.12));
  const zoom=Math.min((rect.width-padding)/state.map.width,(rect.height-padding)/state.map.height);
  state.view='plan';
  state.camera.zoom=clamp(zoom,.08,2.5);
  state.camera.x=state.map.width/2;
  state.camera.y=state.map.height/2;
  updateZoomLabel();
}

function clampCamera(){
  const margin=Math.max(state.map.width,state.map.height)*.2;
  state.camera.x=clamp(state.camera.x,-margin,state.map.width+margin);
  state.camera.y=clamp(state.camera.y,-margin,state.map.height+margin);
}

function screenDeltaToWorld(dx,dy,zoom){
  return{x:dx/zoom,y:dy/zoom};
}

function worldToScreen(x,y){
  const cx=canvas.clientWidth/2,cy=canvas.clientHeight/2;
  return{
    x:cx+(x-state.camera.x)*state.camera.zoom,
    y:cy+(y-state.camera.y)*state.camera.zoom
  };
}

function screenToWorld(x,y){
  const cx=canvas.clientWidth/2,cy=canvas.clientHeight/2;
  return{x:state.camera.x+(x-cx)/state.camera.zoom,y:state.camera.y+(y-cy)/state.camera.zoom};
}

function snapPoint(x,y){
  const s=Math.max(1,state.map.gridSize||32);
  return{
    x:clamp(Math.round(x/s)*s,0,state.map.width),
    y:clamp(Math.round(y/s)*s,0,state.map.height)
  };
}

function frame(now){
  const dt=Math.min(.05,(now-state.lastFrame)/1000);
  state.lastFrame=now;
  if(state.preview)updatePreview(dt);
  draw(now);
  requestAnimationFrame(frame);
}

function draw(now){
  const rect=canvas.getBoundingClientRect();
  ctx.clearRect(0,0,rect.width,rect.height);
  ctx.fillStyle=state.night?'#080c12':'#12181b';
  ctx.fillRect(0,0,rect.width,rect.height);

  drawPlan(now);

  drawMinimap();
}

function drawPlan(now){
  drawPlanBackground();
  drawGroundImage();
  if(state.grid)drawPlanGrid();
  // Downtown ground art owns lots, roads, sidewalks, alleys and markings.
  drawPlanZones('zones');
  if(!state.hiddenLayers.has('buildings'))for(const building of state.map.buildings)drawPlanBuilding(building);
  if(!state.hiddenLayers.has('props'))for(const prop of state.map.props)drawPlanProp(prop);
  drawSpawnMarker(false);
  if(!state.hiddenLayers.has('interactions'))for(const interaction of state.map.interactions)drawInteractionMarker(interaction,now,false);
  if(state.drawPreview)drawDraftPreview(state.drawPreview);
  if(state.selected&&!state.preview)drawSelection(state.selected);
  if(state.preview)drawPlayer(false);
}


function drawGroundImage(){
  if(!groundImage.complete||!groundImage.naturalWidth)return;
  const a=worldToScreen(0,0),b=worldToScreen(state.map.width,state.map.height);
  ctx.drawImage(groundImage,a.x,a.y,b.x-a.x,b.y-a.y);
}

function drawPlanBackground(){
  const a=worldToScreen(0,0),b=worldToScreen(state.map.width,state.map.height);
  ctx.fillStyle=state.night?'#131b1c':'#1b2420';
  ctx.fillRect(a.x,a.y,b.x-a.x,b.y-a.y);
  ctx.strokeStyle=state.night?'#3d484a':'#58635c';
  ctx.lineWidth=2;
  ctx.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y);
}

function drawPlanGrid(){
  const step=state.map.gridSize;
  if(step*state.camera.zoom<7)return;
  ctx.beginPath();
  for(let x=0;x<=state.map.width;x+=step){
    const a=worldToScreen(x,0),b=worldToScreen(x,state.map.height);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
  }
  for(let y=0;y<=state.map.height;y+=step){
    const a=worldToScreen(0,y),b=worldToScreen(state.map.width,y);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
  }
  ctx.strokeStyle='rgba(255,255,255,.045)';ctx.lineWidth=1;ctx.stroke();
}

function drawPlanZones(layer){
  if(state.hiddenLayers.has(layer))return;
  for(const o of state.map.zones){
    if((o.layer||'zones')!==layer)continue;
    const pts=footprintCorners(o).map(p=>worldToScreen(p.x,p.y));
    fillPolygon(pts,withAlpha(o.color||'#695a88',layer==='lots'?.16:.12));
    strokePolygon(pts,withAlpha(o.color||'#695a88',.78),1.5,[8,6]);
    if(state.camera.zoom>.45)drawTextLabel(o.label,polygonCenter(pts),layer==='lots'?'#c8c5b4':'#d7cbe5');
  }
}

function drawPlanRoad(o){
  const a=worldToScreen(o.x1,o.y1),b=worldToScreen(o.x2,o.y2);
  const z=state.camera.zoom;
  const alley=o.style==='alley';
  const avenue=o.style==='avenue';
  const curb=alley?8:avenue?28:20;

  ctx.save();
  ctx.lineCap=alley?'butt':'round';

  // Sidewalk / curb band. Alleys get only a narrow service edge.
  ctx.strokeStyle=state.night?'#373b3e':'#666966';
  ctx.lineWidth=(o.width+curb)*z;
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();

  ctx.strokeStyle=o.color||'#353b41';
  ctx.lineWidth=o.width*z;
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();

  if(!alley){
    ctx.setLineDash([(avenue?24:18)*z,(avenue?18:15)*z]);
    ctx.strokeStyle=avenue?'rgba(235,202,112,.72)':'rgba(230,220,180,.5)';
    ctx.lineWidth=Math.max(1,(avenue?2.5:2)*z);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }else if(z>.35){
    ctx.setLineDash([6*z,8*z]);
    ctx.strokeStyle='rgba(190,190,180,.22)';
    ctx.lineWidth=Math.max(1,z);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  ctx.restore();
}

function drawPlanBuilding(o){
  const pts=footprintCorners(o).map(p=>worldToScreen(p.x,p.y));
  const style=resolvedBuildingStyle(o);
  const z=state.camera.zoom;

  const shadow=pts.map(p=>({x:p.x+Math.max(2,5*z),y:p.y+Math.max(2,6*z)}));
  fillPolygon(shadow,state.night?'rgba(0,0,0,.38)':'rgba(0,0,0,.22)');

  fillPolygon(pts,state.night?shadeHex(style.faceX,-.25):style.faceX);
  strokePolygon(pts,state.night?'rgba(255,255,255,.12)':'rgba(255,255,255,.22)',Math.max(1,1.25*z));

  const inset=clamp(10,5,Math.min(o.width,o.height)*.16);
  const roof={...o,width:Math.max(4,o.width-inset*2),height:Math.max(4,o.height-inset*2)};
  const roofPts=footprintCorners(roof).map(p=>worldToScreen(p.x,p.y));
  fillPolygon(roofPts,state.night?shadeHex(style.top,-.18):style.top);
  strokePolygon(roofPts,'rgba(0,0,0,.22)',Math.max(.8,z));

  draw2DRoofDetails(o,style);

  if(state.camera.zoom>.28||state.selected===o){
    const center=worldToScreen(o.x,o.y);
    draw2DBuildingLabel(o,center,style);
  }
}

function draw2DRoofDetails(o,style){
  const p=worldToScreen(o.x,o.y);
  const z=state.camera.zoom;
  if(z<.22)return;
  const angle=(Number(o.rotation)||0)*Math.PI/180;

  ctx.save();
  ctx.translate(p.x,p.y);
  ctx.rotate(angle);
  const w=o.width*z,h=o.height*z;

  if(['office','hospital','bank'].includes(o.kind)){
    ctx.fillStyle=state.night?'#3c4145':'#686d70';
    ctx.fillRect(-w*.16,-h*.11,w*.32,h*.22);
    ctx.strokeStyle='rgba(255,255,255,.16)';
    ctx.strokeRect(-w*.16,-h*.11,w*.32,h*.22);
  }else if(o.kind==='casino'||o.kind==='nightclub'){
    ctx.fillStyle=style.accent||'#b47ed0';
    ctx.fillRect(-w*.30,-h*.08,w*.60,h*.16);
  }else if(o.kind==='corner-store'){
    ctx.fillStyle=style.accent||'#c98643';
    ctx.fillRect(-w*.42,h*.27,w*.84,Math.max(3,h*.08));
  }else if(o.kind==='warehouse'){
    ctx.strokeStyle='rgba(255,255,255,.18)';
    ctx.lineWidth=Math.max(1,z);
    for(let x=-w*.3;x<=w*.3;x+=Math.max(10,24*z)){
      ctx.beginPath();ctx.moveTo(x,-h*.3);ctx.lineTo(x,h*.3);ctx.stroke();
    }
  }else{
    ctx.fillStyle=state.night?'#464a4c':'#74797b';
    ctx.fillRect(-w*.12,-h*.09,w*.24,h*.18);
  }
  ctx.restore();
}

function draw2DBuildingLabel(o,p,style){
  const text=o.label||o.kind||'Building';
  ctx.save();
  ctx.font='800 10px system-ui';
  const w=Math.min(170,ctx.measureText(text).width+14);
  ctx.fillStyle=state.night?'rgba(5,8,11,.78)':'rgba(13,16,18,.72)';
  ctx.fillRect(p.x-w/2,p.y-9,w,18);
  ctx.fillStyle=style.accent||'#d78e36';
  ctx.fillRect(p.x-w/2,p.y-9,3,18);
  ctx.fillStyle='#f3eee7';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(text,p.x,p.y,w-10);
  ctx.restore();
}

function drawPlanProp(o){
  const p=worldToScreen(o.x,o.y),z=state.camera.zoom;
  const r=Math.max(3,(o.radius||10)*z);
  ctx.save();
  ctx.translate(p.x,p.y);
  ctx.rotate((Number(o.rotation)||0)*Math.PI/180);

  if(o.kind==='tree'){
    ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(3*z,4*z,r*.95,r*.62,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=state.night?'#2f5139':'#54785b';ctx.beginPath();ctx.arc(-r*.24,-r*.12,r*.72,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=state.night?'#385f42':'#668c6a';ctx.beginPath();ctx.arc(r*.30,r*.02,r*.63,0,Math.PI*2);ctx.fill();
  }else if(o.kind==='parked-car'){
    const w=Math.max(12,42*z),h=Math.max(7,20*z);
    ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(-w/2+2,-h/2+3,w,h);
    ctx.fillStyle=o.color||'#687785';ctx.fillRect(-w/2,-h/2,w,h);
    ctx.fillStyle='#263b47';ctx.fillRect(-w*.22,-h*.35,w*.44,h*.70);
  }else if(o.kind==='streetlight'){
    ctx.strokeStyle=o.color||'#879199';ctx.lineWidth=Math.max(1.5,2*z);ctx.beginPath();ctx.moveTo(0,-r*.8);ctx.lineTo(0,r*.8);ctx.stroke();
    ctx.fillStyle=state.night?'#f4d58b':'#c9ced0';ctx.beginPath();ctx.arc(0,-r*.82,Math.max(2,3*z),0,Math.PI*2);ctx.fill();
  }else if(o.kind==='bench'){
    ctx.fillStyle=o.color||'#7e634d';ctx.fillRect(-r,-r*.35,r*2,r*.7);
  }else if(o.kind==='dumpster'){
    ctx.fillStyle=o.color||'#466052';ctx.fillRect(-r,-r*.7,r*2,r*1.4);
    ctx.strokeStyle='rgba(255,255,255,.15)';ctx.strokeRect(-r,-r*.7,r*2,r*1.4);
  }else if(o.kind==='bus-stop'){
    ctx.fillStyle=o.color||'#536e7c';ctx.fillRect(-r*.75,-r*.18,r*1.5,r*.36);
    ctx.fillStyle='#b8c4c8';ctx.fillRect(r*.45,-r*.8,Math.max(2,2*z),r*1.6);
  }else{
    ctx.fillStyle=o.color||'#777';ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}

function resolvedBuildingStyle(o){
  const base=styleForBuilding(o.style);
  const faceX=normalizeColor(o.color||base.faceX);
  return{
    ...base,
    faceX,
    faceY:shadeHex(faceX,-.13),
    top:shadeHex(faceX,.12),
    roof:base.roof||shadeHex(faceX,-.2)
  };
}

function footprintCorners(o){
  const w=Math.max(2,Number(o.width)||2),h=Math.max(2,Number(o.height)||2);
  const local=[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]];
  const a=(Number(o.rotation)||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  return local.map(([x,y])=>({x:o.x+x*c-y*s,y:o.y+x*s+y*c}));
}

function drawInteractionMarker(o,now,isIso){
  const p=worldToScreen(o.x,o.y,isIso?18:0);
  const pulse=1+(Math.sin(now*.004+(hashCode(o.id)%10))*.12);
  const r=7*pulse;
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.arc(p.x+2,p.y+2,r+3,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=withAlpha(o.color||'#d78e36',.55);ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,r+5,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle=o.color||'#d78e36';ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#101010';ctx.font='900 10px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('!',p.x,p.y+.5);
  if(state.selected===o||state.preview&&nearestInteraction(state.player.x,state.player.y,70)===o){
    drawTextLabel(o.label,{x:p.x,y:p.y-17},'#f4e6cf');
  }
  ctx.restore();
}

function drawSpawnMarker(isIso){
  if(state.preview)return;
  const spawn=state.map.playerSpawn;
  if(!spawn)return;
  const p=worldToScreen(spawn.x,spawn.y,isIso?4:0);
  ctx.save();ctx.strokeStyle='rgba(111,184,218,.8)';ctx.lineWidth=1.5;ctx.setLineDash([4,3]);
  ctx.beginPath();ctx.arc(p.x,p.y,8,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#9ccfe5';ctx.font='800 8px system-ui';ctx.textAlign='center';ctx.fillText('SPAWN',p.x,p.y-12);ctx.restore();
}

function drawPlayer(isIso){
  const base=worldToScreen(state.player.x,state.player.y,0);
  if(!isIso){
    ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.arc(base.x+2,base.y+3,9,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#efece6';ctx.beginPath();ctx.arc(base.x,base.y,7,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#d78e36';ctx.lineWidth=2;ctx.stroke();
    return;
  }
  const foot=worldToScreen(state.player.x,state.player.y,3);
  const torso=worldToScreen(state.player.x,state.player.y,23);
  const head=worldToScreen(state.player.x,state.player.y,34);
  const s=clamp(state.camera.zoom,.45,1.25);
  ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(base.x+3,base.y+3,8*s,4*s,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#d78e36';ctx.lineWidth=5*s;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(foot.x,foot.y);ctx.lineTo(torso.x,torso.y);ctx.stroke();
  ctx.fillStyle='#f0ede7';ctx.beginPath();ctx.arc(head.x,head.y,5*s,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#1b1d20';ctx.lineWidth=1;ctx.stroke();
}

function drawDraftPreview(d){
  ctx.save();
  ctx.globalAlpha=.74;
  ctx.strokeStyle='#e5a452';
  ctx.fillStyle='rgba(229,164,82,.16)';
  ctx.lineWidth=2;
  ctx.setLineDash([7,5]);
  if(d.type==='road'){
    const a=worldToScreen(d.x1,d.y1),b=worldToScreen(d.x2,d.y2);
    ctx.lineWidth=96*state.camera.zoom;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }else{
    const fake={x:d.x+d.width/2,y:d.y+d.height/2,width:d.width,height:d.height,rotation:0};
    const pts=footprintCorners(fake).map(p=>worldToScreen(p.x,p.y));
    fillPolygon(pts,'rgba(229,164,82,.18)');
    strokePolygon(pts,'#e5a452',1.5,[7,5]);
  }
  ctx.restore();
}

function drawSelection(o){
  ctx.save();
  ctx.strokeStyle='#f2b35f';
  ctx.lineWidth=2;
  ctx.setLineDash([6,4]);
  if(o.type==='road'){
    const a=worldToScreen(o.x1,o.y1),b=worldToScreen(o.x2,o.y2);
    ctx.lineWidth=Math.max(3,(o.width+10)*state.camera.zoom);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }else if(o.type==='building'||o.type==='zone'){
    const pts=footprintCorners(o).map(p=>worldToScreen(p.x,p.y));
    strokePolygon(pts,'#f2b35f',2,[6,4]);
  }else{
    const p=worldToScreen(o.x,o.y);
    ctx.beginPath();ctx.arc(p.x,p.y,13,0,Math.PI*2);ctx.stroke();
  }
  ctx.restore();
}

function hitTest(worldX,worldY){
  const order=[
    ...(!state.hiddenLayers.has('interactions')?[...state.map.interactions].reverse():[]),
    ...(!state.hiddenLayers.has('props')?[...state.map.props].reverse():[]),
    ...(!state.hiddenLayers.has('buildings')?[...state.map.buildings].reverse():[]),
    ...(!state.hiddenLayers.has('roads')?[...state.map.roads].reverse():[]),
    ...(!state.hiddenLayers.has('zones')?[...state.map.zones].filter(o=>(o.layer||'zones')==='zones').reverse():[]),
    ...(!state.hiddenLayers.has('lots')?[...state.map.zones].filter(o=>o.layer==='lots').reverse():[])
  ];
  for(const o of order)if(pointHitsObject(worldX,worldY,o))return o;
  return null;
}

function pointHitsObject(x,y,o){
  if(o.type==='road')return distanceToSegment(x,y,o.x1,o.y1,o.x2,o.y2)<=Math.max(12,o.width/2);
  if(o.type==='building'||o.type==='zone'){
    const p=rotatePoint(x-o.x,y-o.y,-(o.rotation||0)*Math.PI/180);
    return Math.abs(p.x)<=o.width/2&&Math.abs(p.y)<=o.height/2;
  }
  return Math.hypot(x-o.x,y-o.y)<=(o.radius||12)+10/state.camera.zoom;
}

function selectObject(object){
  state.selected=object||null;
  refreshInspector();
  if(object)say(`Selected ${object.label||object.id}.`);
}

function refreshInspector(){
  const o=state.selected;
  $('#selected-name').textContent=o?.label||'Nothing selected';
  $('#selected-meta').textContent=o?`${o.type.toUpperCase()} · ${o.id}`:'Choose SELECT, then tap an object.';

  const values={x:0,y:0,width:0,height:0,rotation:0,roadWidth:0};
  if(o){
    if(o.type==='road'){
      values.x=o.x1;values.y=o.y1;values.width=o.x2;values.height=o.y2;values.roadWidth=o.width;
    }else{
      values.x=o.x??0;values.y=o.y??0;
      values.width=o.width??((o.radius||0)*2);
      values.height=o.height??((o.radius||0)*2);
      values.rotation=o.rotation??0;
    }
  }

  document.querySelectorAll('[data-field]').forEach(input=>{
    const field=input.dataset.field;
    input.value=o?round(values[field]??0):'';
    if(!o)input.disabled=true;
    else if(field==='roadWidth')input.disabled=o.type!=='road';
    else if(field==='rotation')input.disabled=o.type==='road';
    else input.disabled=false;
  });

  $('#object-label').value=o?.label||'';
  $('#object-label').disabled=!o;
  $('#object-color').value=normalizeColor(o?.color||'#777777');
  $('#object-color').disabled=!o;
  $('#object-layer').value=o?.layer||'buildings';
  $('#object-layer').disabled=!o||o.type!=='zone';
  $('#object-collision').checked=!!o?.collision;
  $('#object-collision').disabled=!o||o.type==='road';

  const building=o?.type==='building';
  $('#building-fields').hidden=!building;
  $('#object-floors').value=building?o.floors||3:'';
  $('#object-floors').disabled=!building;
  $('#object-style').value=building&&BUILDING_STYLES[o.style]?o.style:'brick-warm';
  $('#object-style').disabled=!building;
  $('#object-asset').value=building?o.assetId||'':'';
  $('#object-asset').disabled=!building;

  for(const id of ['duplicate-object','center-object','set-spawn','raise-object','lower-object','delete-object'])$(`#${id}`).disabled=!o;
}

function applyInspectorField(field,value){
  const o=state.selected;if(!o)return;
  const n=Number(value);if(!Number.isFinite(n))return;
  pushUndo();

  if(o.type==='road'){
    const map={x:'x1',y:'y1',width:'x2',height:'y2',roadWidth:'width'};
    if(map[field])o[map[field]]=field==='roadWidth'?Math.max(4,n):n;
  }else{
    if(field==='x')o.x=clamp(n,0,state.map.width);
    if(field==='y')o.y=clamp(n,0,state.map.height);
    if(field==='rotation')o.rotation=n;
    if(field==='width'||field==='height'){
      if('radius' in o)o.radius=Math.max(2,n/2);
      else o[field]=Math.max(2,n);
    }
  }
  saveDraft();
  refreshInspector();
}

function applySimpleField(field,value){
  const o=state.selected;if(!o)return;
  pushUndo();o[field]=value;saveDraft();refreshInspector();
}

function changeSelectedLayer(layer){
  const o=state.selected;if(!o||o.layer===layer)return;
  const allowed={road:['roads'],building:['buildings'],prop:['props'],zone:['lots','zones'],interaction:['interactions']}[o.type]||[o.layer];
  if(!allowed.includes(layer)){
    $('#object-layer').value=o.layer;
    return say(`${o.type.toUpperCase()} objects stay on ${allowed.join(' / ')}.`);
  }
  pushUndo();o.layer=layer;saveDraft();refreshInspector();
}

function moveSelectedTo(worldX,worldY){
  const o=state.selected;if(!o)return;
  const p=snapPoint(worldX,worldY);
  if(o.type==='road'){
    const dx=p.x-state.dragObjectOffset.anchorX,dy=p.y-state.dragObjectOffset.anchorY;
    o.x1=clamp(state.dragObjectOffset.x1+dx,0,state.map.width);
    o.y1=clamp(state.dragObjectOffset.y1+dy,0,state.map.height);
    o.x2=clamp(state.dragObjectOffset.x2+dx,0,state.map.width);
    o.y2=clamp(state.dragObjectOffset.y2+dy,0,state.map.height);
  }else{
    o.x=clamp(p.x-state.dragObjectOffset.x,0,state.map.width);
    o.y=clamp(p.y-state.dragObjectOffset.y,0,state.map.height);
  }
}

function getDragOffset(o,x,y){
  if(o.type==='road')return{anchorX:x,anchorY:y,x1:o.x1,y1:o.y1,x2:o.x2,y2:o.y2};
  return{x:x-o.x,y:y-o.y};
}

function duplicateSelected(){
  const o=state.selected;if(!o)return;
  pushUndo();
  const copy=clone(o);
  copy.id=newId(o.type);
  copy.label=`${o.label||o.type} copy`;
  if(o.type==='road'){
    copy.x1+=state.map.gridSize;copy.y1+=state.map.gridSize;copy.x2+=state.map.gridSize;copy.y2+=state.map.gridSize;
  }else{
    copy.x=clamp(copy.x+state.map.gridSize,0,state.map.width);
    copy.y=clamp(copy.y+state.map.gridSize,0,state.map.height);
  }
  collectionForLayer(copy.layer).push(copy);
  selectObject(copy);
  saveDraft();
}

function deleteSelected(){
  const o=state.selected;if(!o)return;
  pushUndo();removeFromCollections(o);state.selected=null;saveDraft();refreshInspector();say('Object deleted.');
}

function centerSelected(){
  const o=state.selected;if(!o)return;
  const center=objectCenter(o);
  state.camera.x=center.x;state.camera.y=center.y;
}

function setSpawnFromSelected(){
  const o=state.selected;if(!o)return;
  pushUndo();
  const c=objectCenter(o);
  let x=c.x,y=c.y;
  if(o.type==='building')y+=o.height/2+56;
  state.map.playerSpawn={x:clamp(x,0,state.map.width),y:clamp(y,0,state.map.height)};
  state.player.x=state.map.playerSpawn.x;state.player.y=state.map.playerSpawn.y;
  saveDraft();say(`Player spawn moved near ${o.label||o.id}.`);
}

function reorderSelected(delta){
  const o=state.selected;if(!o)return;
  const arr=collectionForLayer(o.layer),i=arr.indexOf(o);
  if(i<0)return;
  const next=clamp(i+delta,0,arr.length-1);
  if(next===i)return;
  pushUndo();arr.splice(i,1);arr.splice(next,0,o);saveDraft();
}

function nudgeSelected(code,multiplier){
  const o=state.selected;if(!o)return;
  pushUndo();
  const step=state.map.gridSize*multiplier;
  const dx=code==='ArrowLeft'?-step:code==='ArrowRight'?step:0;
  const dy=code==='ArrowUp'?-step:code==='ArrowDown'?step:0;
  if(o.type==='road'){
    o.x1=clamp(o.x1+dx,0,state.map.width);o.x2=clamp(o.x2+dx,0,state.map.width);
    o.y1=clamp(o.y1+dy,0,state.map.height);o.y2=clamp(o.y2+dy,0,state.map.height);
  }else{
    o.x=clamp(o.x+dx,0,state.map.width);o.y=clamp(o.y+dy,0,state.map.height);
  }
  saveDraft();refreshInspector();
}

function applyMapSettings(){
  pushUndo();
  state.map.width=clamp(Number($('#map-width').value)||3072,512,16384);
  state.map.height=clamp(Number($('#map-height').value)||3072,512,16384);
  state.map.gridSize=clamp(Number($('#grid-size').value)||32,4,256);
  state.camera.x=clamp(state.camera.x,0,state.map.width);
  state.camera.y=clamp(state.camera.y,0,state.map.height);
  saveDraft();syncMapInputs();
}

function syncMapInputs(){
  $('#map-width').value=state.map.width;
  $('#map-height').value=state.map.height;
  $('#grid-size').value=state.map.gridSize;
  $('#map-title').textContent=state.map.name||'RiftCity Draft';
}

function restoreAuthored(){
  pushUndo();
  state.map=createStarterMap();
  state.selected=null;
  state.player.x=state.map.playerSpawn.x;state.player.y=state.map.playerSpawn.y;
  state.camera.x=state.map.width/2;state.camera.y=state.map.height/2;
  saveDraft();syncMapInputs();refreshInspector();refreshStats();fitMap();
  say('Clean Downtown ground plan restored.');
}

function clearMap(){
  pushUndo();
  state.map={
    format:'riftcity-2d-map',version:2,name:'RiftCity Draft',revision:'custom',
    width:3072,height:3072,gridSize:32,playerSpawn:{x:1536,y:1536},
    roads:[],buildings:[],props:[],zones:[],interactions:[]
  };
  state.selected=null;
  state.player.x=1536;state.player.y=1536;
  saveDraft();syncMapInputs();refreshInspector();fitMap();say('Map cleared.');
}

function togglePreview(){
  state.preview=!state.preview;
  state.view='plan';
  $('#preview-toggle').classList.toggle('active',state.preview);
  $('#preview-toggle').textContent=state.preview?'■ EDIT':'▶ WALK';
  $('#preview-hud').hidden=!state.preview;
  $('#mobile-dpad').hidden=!state.preview;
  document.body.classList.toggle('walk-active',state.preview);

  if(state.preview){
    state.player.x=state.map.playerSpawn?.x??state.map.width/2;
    state.player.y=state.map.playerSpawn?.y??state.map.height/2;
    state.camera.x=state.player.x;
    state.camera.y=state.player.y;
    state.camera.zoom=(canvas.clientWidth||390)<=700?.9:1.05;
    state.selected=null;
    refreshInspector();
    updatePreviewHud();
    updateZoomLabel();
    say('2D walk test: use WASD/arrows or the mobile pad.');
  }else{
    state.keys.clear();
    state.moveButtons.clear();
    say('Back in 2D review mode.');
  }
  updateModeLabel();
}

function updatePreview(dt){
  let dx=0,dy=0;
  if(state.keys.has('KeyA')||state.keys.has('ArrowLeft')||state.moveButtons.has('left'))dx-=1;
  if(state.keys.has('KeyD')||state.keys.has('ArrowRight')||state.moveButtons.has('right'))dx+=1;
  if(state.keys.has('KeyW')||state.keys.has('ArrowUp')||state.moveButtons.has('up'))dy-=1;
  if(state.keys.has('KeyS')||state.keys.has('ArrowDown')||state.moveButtons.has('down'))dy+=1;

  if(dx||dy){
    const len=Math.hypot(dx,dy);dx/=len;dy/=len;
    const distance=state.player.speed*dt;
    tryMovePlayer(dx*distance,dy*distance);
  }

  updatePreviewHud();
  followPlayerCamera();
}

function updatePreviewHud(){
  $('#preview-position').textContent=`X ${Math.round(state.player.x)} · Y ${Math.round(state.player.y)}`;
  const near=nearestInteraction(state.player.x,state.player.y,78);
  $('#nearby-interaction').textContent=near?`Nearby: ${near.label||near.kind}`:'Walk near an interaction marker.';
}

function tryMovePlayer(dx,dy){
  const nextX=clamp(state.player.x+dx,state.player.radius,state.map.width-state.player.radius);
  if(!playerCollides(nextX,state.player.y))state.player.x=nextX;
  const nextY=clamp(state.player.y+dy,state.player.radius,state.map.height-state.player.radius);
  if(!playerCollides(state.player.x,nextY))state.player.y=nextY;
}

function playerCollides(x,y){
  for(const o of [...state.map.buildings,...state.map.props]){
    if(!o.collision)continue;
    if(o.type==='building'){
      const p=rotatePoint(x-o.x,y-o.y,-(o.rotation||0)*Math.PI/180);
      const r=state.player.radius;
      if(Math.abs(p.x)<o.width/2+r&&Math.abs(p.y)<o.height/2+r)return true;
    }else if(Math.hypot(x-o.x,y-o.y)<state.player.radius+(o.radius||10))return true;
  }
  return false;
}

function followPlayerCamera(){
  state.camera.x+=(state.player.x-state.camera.x)*.09;
  state.camera.y+=(state.player.y-state.camera.y)*.09;
}

function nearestInteraction(x,y,maxDistance){
  let best=null,bestD=maxDistance;
  for(const o of state.map.interactions){
    const d=Math.hypot(x-o.x,y-o.y);
    if(d<bestD){best=o;bestD=d;}
  }
  return best;
}

function importMap(raw,source='JSON'){
  const map=validateMap(raw);
  pushUndo();
  state.map=map;
  state.selected=null;
  state.player.x=map.playerSpawn.x;state.player.y=map.playerSpawn.y;
  state.camera.x=map.width/2;state.camera.y=map.height/2;
  syncMapInputs();refreshInspector();refreshStats();saveDraft();fitMap();
  say(`Loaded ${map.name} from ${source}.`);
}

function validateMap(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Map JSON must be an object.');
  if(raw.format!=='riftcity-2d-map')throw new Error('Expected format "riftcity-2d-map".');

  const width=clampNumber(raw.width,512,16384,'width');
  const height=clampNumber(raw.height,512,16384,'height');
  const gridSize=clampNumber(raw.gridSize,4,256,'gridSize');

  const map={
    format:'riftcity-2d-map',
    version:2,
    name:String(raw.name||'RiftCity Draft').slice(0,80),
    revision:String(raw.revision||'imported').slice(0,80),
    width,height,gridSize,
    playerSpawn:{x:width/2,y:height/2},
    roads:[],buildings:[],props:[],zones:[],interactions:[]
  };

  if(raw.playerSpawn){
    map.playerSpawn={
      x:clampNumber(raw.playerSpawn.x,0,width,'playerSpawn.x'),
      y:clampNumber(raw.playerSpawn.y,0,height,'playerSpawn.y')
    };
  }

  for(const key of ['roads','buildings','props','zones','interactions']){
    if(!Array.isArray(raw[key]))continue;
    if(raw[key].length>12000)throw new Error(`${key} contains too many objects.`);
    map[key]=raw[key].map((o,index)=>sanitizeObject(o,key,index,width,height));
  }
  return map;
}

function sanitizeObject(o,key,index,width,height){
  if(!o||typeof o!=='object')throw new Error(`${key}[${index}] must be an object.`);
  const type={roads:'road',buildings:'building',props:'prop',zones:'zone',interactions:'interaction'}[key];
  const base={
    ...o,id:String(o.id||newId(type)).slice(0,100),type,layer:o.layer||key,
    label:String(o.label||o.kind||type).slice(0,80),color:normalizeColor(o.color||'#777777'),collision:!!o.collision
  };

  if(type==='road'){
    return{
      ...base,kind:'road',style:String(o.style||'local'),
      x1:clampNumber(o.x1,0,width,`${key}[${index}].x1`),
      y1:clampNumber(o.y1,0,height,`${key}[${index}].y1`),
      x2:clampNumber(o.x2,0,width,`${key}[${index}].x2`),
      y2:clampNumber(o.y2,0,height,`${key}[${index}].y2`),
      width:clampNumber(o.width,4,512,`${key}[${index}].width`),
      collision:false
    };
  }

  if(type==='building'){
    const fallback=PALETTES.building.find(item=>item.id===o.kind)||PALETTES.building[0];
    const style=BUILDING_STYLES[o.style]?o.style:fallback.style;
    return{
      ...base,kind:String(o.kind||'apartment'),layer:'buildings',
      x:clampNumber(o.x,0,width,`${key}[${index}].x`),
      y:clampNumber(o.y,0,height,`${key}[${index}].y`),
      width:clampNumber(o.width,2,2048,`${key}[${index}].width`),
      height:clampNumber(o.height,2,2048,`${key}[${index}].height`),
      rotation:Number(o.rotation)||0,
      floors:clamp(Math.round(Number(o.floors)||fallback.floors||3),1,30),
      style,
      assetId:String(o.assetId||fallback.assetId||`building.${o.kind||'apartment'}.a`).slice(0,100),
      color:normalizeColor(o.color||styleForBuilding(style).faceX),
      collision:o.collision!==false
    };
  }

  if(type==='zone'){
    return{
      ...base,kind:String(o.kind||'district'),layer:o.layer==='lots'?'lots':'zones',
      x:clampNumber(o.x,0,width,`${key}[${index}].x`),
      y:clampNumber(o.y,0,height,`${key}[${index}].y`),
      width:clampNumber(o.width,2,4096,`${key}[${index}].width`),
      height:clampNumber(o.height,2,4096,`${key}[${index}].height`),
      rotation:Number(o.rotation)||0,collision:false
    };
  }

  const catalog=type==='prop'?PROP_STYLES:INTERACTION_STYLES;
  const fallback=catalog[o.kind]||Object.values(catalog)[0];
  return{
    ...base,kind:String(o.kind||type),layer:type==='prop'?'props':'interactions',
    x:clampNumber(o.x,0,width,`${key}[${index}].x`),
    y:clampNumber(o.y,0,height,`${key}[${index}].y`),
    radius:clampNumber(o.radius||fallback?.radius||12,2,256,`${key}[${index}].radius`),
    rotation:Number(o.rotation)||0,
    collision:type==='prop'?!!o.collision:false
  };
}

function exportMap(){
  const text=JSON.stringify(state.map,null,2);
  const blob=new Blob([text],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=`${slug(state.map.name||'riftcity-map')}.map.json`;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  say('Map JSON exported.');
}

function saveDraft(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state.map));}catch(_){}
  refreshStats();
}

function loadDraft(){
  try{
    const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    if(raw?.format!=='riftcity-2d-map')return null;
    return validateMap(raw);
  }catch(_){return null;}
}

function pushUndo(){
  const snap=JSON.stringify(state.map);
  if(state.undo.at(-1)!==snap)state.undo.push(snap);
  if(state.undo.length>80)state.undo.shift();
  state.redo.length=0;
}

function undo(){
  if(!state.undo.length)return say('Nothing to undo.');
  state.redo.push(JSON.stringify(state.map));
  state.map=JSON.parse(state.undo.pop());
  state.selected=null;
  syncMapInputs();refreshInspector();saveDraft();say('Undo.');
}

function redo(){
  if(!state.redo.length)return say('Nothing to redo.');
  state.undo.push(JSON.stringify(state.map));
  state.map=JSON.parse(state.redo.pop());
  state.selected=null;
  syncMapInputs();refreshInspector();saveDraft();say('Redo.');
}

function refreshStats(){
  const count=state.map.roads.length+state.map.buildings.length+state.map.props.length+state.map.zones.length+state.map.interactions.length;
  $('#map-object-count').textContent=`${count} objects`;
  $('#stat-buildings').textContent=state.map.buildings.length;
  $('#stat-roads').textContent=state.map.roads.length;
  $('#stat-props').textContent=state.map.props.length;
  $('#stat-interactions').textContent=state.map.interactions.length;
}

function drawMinimap(){
  const w=minimap.width,h=minimap.height;
  miniCtx.clearRect(0,0,w,h);
  miniCtx.fillStyle=state.night?'#101717':'#18211d';miniCtx.fillRect(0,0,w,h);
  const sx=w/state.map.width,sy=h/state.map.height;

  for(const zone of state.map.zones){
    if(zone.layer!=='lots')continue;
    miniCtx.fillStyle='rgba(125,121,103,.28)';
    miniCtx.fillRect((zone.x-zone.width/2)*sx,(zone.y-zone.height/2)*sy,zone.width*sx,zone.height*sy);
  }

  for(const road of state.map.roads){
    miniCtx.lineWidth=Math.max(2,road.width*sx);
    miniCtx.strokeStyle='#454b52';miniCtx.beginPath();miniCtx.moveTo(road.x1*sx,road.y1*sy);miniCtx.lineTo(road.x2*sx,road.y2*sy);miniCtx.stroke();
  }

  miniCtx.fillStyle='#91745d';
  for(const b of state.map.buildings)miniCtx.fillRect((b.x-b.width/2)*sx,(b.y-b.height/2)*sy,b.width*sx,b.height*sy);

  const rect=canvas.getBoundingClientRect();
  const worldRadius=Math.min(state.map.width,state.map.height)*.12/Math.max(.25,state.camera.zoom);
  miniCtx.strokeStyle='#d78e36';miniCtx.lineWidth=2;
  miniCtx.strokeRect((state.camera.x-worldRadius)*sx,(state.camera.y-worldRadius)*sy,worldRadius*2*sx,worldRadius*2*sy);

  miniCtx.fillStyle='#9ccfe5';miniCtx.beginPath();miniCtx.arc(state.map.playerSpawn.x*sx,state.map.playerSpawn.y*sy,3,0,Math.PI*2);miniCtx.fill();
  if(state.preview){
    miniCtx.fillStyle='#fff';miniCtx.beginPath();miniCtx.arc(state.player.x*sx,state.player.y*sy,3,0,Math.PI*2);miniCtx.fill();
  }
}

function objectCenter(o){
  return o.type==='road'?{x:(o.x1+o.x2)/2,y:(o.y1+o.y2)/2}:{x:o.x,y:o.y};
}

function collectionForLayer(layer){
  const map={roads:state.map.roads,lots:state.map.zones,buildings:state.map.buildings,props:state.map.props,zones:state.map.zones,interactions:state.map.interactions};
  return map[layer]||state.map.props;
}

function removeFromCollections(o){
  for(const arr of [state.map.roads,state.map.buildings,state.map.props,state.map.zones,state.map.interactions]){
    const i=arr.indexOf(o);if(i>=0)arr.splice(i,1);
  }
}

function getPaletteItem(tool,id){
  return (PALETTES[tool]||[]).find(item=>item.id===id)||(PALETTES[tool]||[])[0];
}

function createPointObject(tool,item,x,y){
  return{
    id:newId(tool),type:tool,kind:item.id,layer:tool==='prop'?'props':'interactions',
    x,y,radius:item.radius||12,rotation:0,label:item.label,color:item.color,collision:tool==='prop'&&!!item.collision
  };
}

function windowLit(id,row,col){
  return Math.abs(hashCode(`${id}:${row}:${col}`))%4!==0;
}

function hashCode(text){
  let h=2166136261;
  for(let i=0;i<String(text).length;i++){h^=String(text).charCodeAt(i);h=Math.imul(h,16777619);}
  return h|0;
}

function fillPolygon(points,color){
  if(!points?.length)return;
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
  ctx.closePath();ctx.fill();
}

function strokePolygon(points,color,width=1,dash=[]){
  if(!points?.length)return;
  ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);
  ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
  ctx.closePath();ctx.stroke();ctx.restore();
}

function polygonCenter(points){
  const sum=points.reduce((acc,p)=>({x:acc.x+p.x,y:acc.y+p.y}),{x:0,y:0});
  return{x:sum.x/points.length,y:sum.y/points.length};
}

function drawTextLabel(text,p,color='#fff'){
  if(!text)return;
  ctx.save();ctx.font='700 9px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
  const w=Math.min(160,ctx.measureText(text).width+10);
  ctx.fillStyle='rgba(5,7,9,.68)';ctx.fillRect(p.x-w/2,p.y-8,w,16);
  ctx.fillStyle=color;ctx.fillText(text,p.x,p.y,w-6);ctx.restore();
}

function pointInPolygon(x,y,points){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const xi=points[i].x,yi=points[i].y,xj=points[j].x,yj=points[j].y;
    const intersect=((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi||1e-9)+xi);
    if(intersect)inside=!inside;
  }
  return inside;
}

function rotatePoint(x,y,a){
  const c=Math.cos(a),s=Math.sin(a);return{x:x*c-y*s,y:x*s+y*c};
}

function distanceToSegment(px,py,x1,y1,x2,y2){
  const dx=x2-x1,dy=y2-y1;
  if(dx===0&&dy===0)return Math.hypot(px-x1,py-y1);
  const t=clamp(((px-x1)*dx+(py-y1)*dy)/(dx*dx+dy*dy),0,1);
  return Math.hypot(px-(x1+t*dx),py-(y1+t*dy));
}

function withAlpha(hex,alpha){
  const safe=normalizeColor(hex).slice(1);
  const r=parseInt(safe.slice(0,2),16),g=parseInt(safe.slice(2,4),16),b=parseInt(safe.slice(4,6),16);
  return`rgba(${r},${g},${b},${clamp(alpha,0,1)})`;
}

function newId(prefix){return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;}
function say(message){status.textContent=message;}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function clampNumber(value,min,max,label){const n=Number(value);if(!Number.isFinite(n))throw new Error(`${label} must be numeric.`);return clamp(n,min,max);}
function normalizeColor(value){return /^#[0-9a-f]{6}$/i.test(String(value))?String(value):'#777777';}
function lerp(a,b,t){return a+(b-a)*t;}
function round(n){return Math.round(Number(n||0)*100)/100;}
function clone(value){return JSON.parse(JSON.stringify(value));}
function slug(value){return String(value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'riftcity-map';}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function escapeAttr(value){return escapeHtml(value);}
