import { MAP_LAYERS, PALETTES, createStarterMap } from './map/default-map.js';
import { BUILDING_STYLES, PROP_STYLES, INTERACTION_STYLES, styleForBuilding, shadeHex } from './map/world-kit.js';

const STORAGE_KEY='riftcity-25d-map-draft-v2';
const ISO_X=.5;
const ISO_Y=.25;
const FLOOR_HEIGHT=50;
const $=selector=>document.querySelector(selector);
const canvas=$('#map-canvas');
const minimap=$('#minimap');
const ctx=canvas.getContext('2d');
const miniCtx=minimap.getContext('2d');
const status=$('#status');

const state={
  map:loadDraft()||createStarterMap(),
  tool:'select',
  view:'iso',
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
  refreshInspector();
  refreshStats();
  resizeCanvas();
  requestAnimationFrame(()=>{
    focusCurrentView(true);
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

  $('#view-plan').addEventListener('click',()=>setView('plan'));
  $('#view-iso').addEventListener('click',()=>setView('iso'));
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
    if(state.view==='iso')ensureIsoReviewZoom(true);
    else{
      state.camera.zoom=1;
      updateZoomLabel();
    }
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
    if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
    state.keys.add(event.code);
    const mod=event.ctrlKey||event.metaKey;
    if(mod&&event.code==='KeyZ'){event.preventDefault();return event.shiftKey?redo():undo();}
    if(mod&&event.code==='KeyY'){event.preventDefault();return redo();}
    if(mod&&event.code==='KeyD'){event.preventDefault();return duplicateSelected();}
    if(event.code==='Delete'||event.code==='Backspace'){event.preventDefault();return deleteSelected();}
    if(event.code==='Digit1'){event.preventDefault();return setView('plan');}
    if(event.code==='Digit2'){event.preventDefault();return setView('iso');}
    const shortcuts={KeyV:'select',KeyH:'pan',KeyR:'road',KeyB:'building',KeyP:'prop',KeyZ:'zone',KeyI:'interaction'};
    if(shortcuts[event.code]&&!mod){event.preventDefault();return setTool(shortcuts[event.code]);}
    if(!state.preview&&state.selected&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.code)){
      event.preventDefault();nudgeSelected(event.code,event.shiftKey?4:1);
    }
  });
  window.addEventListener('keyup',event=>state.keys.delete(event.code));
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
    if(state.view==='iso'&&state.camera.zoom>0)ensureIsoReviewZoom();
  }
}

function setView(view,announce=true){
  if(view!=='plan'&&view!=='iso')return;
  const previous=state.view;
  state.view=view;
  $('#view-plan').classList.toggle('active',view==='plan');
  $('#view-iso').classList.toggle('active',view==='iso');

  if(view==='plan'){
    if(previous!=='plan')fitMap();
  }else if(previous!=='iso'){
    ensureIsoReviewZoom();
  }

  updateModeLabel();
  updateZoomLabel();
  if(announce)say(view==='iso'?'2.5D neighborhood review. Pan around the district; FIT MAP is only for an intentional full-city overview.':'Plan overview. The full district is fitted for layout work.');
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
  $('#mode-label').textContent=state.preview?'WALK · 2.5D':`${state.tool.toUpperCase()} · ${state.view==='iso'?'2.5D':'PLAN'}`;
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

function preferredIsoZoom(){
  const width=canvas.clientWidth||window.innerWidth||390;
  if(width<=430)return .40;
  if(width<=700)return .44;
  if(width<=980)return .48;
  return .56;
}

function preferredWalkZoom(){
  const width=canvas.clientWidth||window.innerWidth||390;
  if(width<=430)return .52;
  if(width<=700)return .56;
  return .62;
}

function ensureIsoReviewZoom(force=false){
  const preferred=preferredIsoZoom();
  if(force||state.camera.zoom<preferred*.82||state.camera.zoom>preferred*2.2){
    state.camera.zoom=preferred;
  }
  clampCamera();
  updateZoomLabel();
}

function focusIsoReview(target=null,walk=false){
  const focus=target||state.selected&&objectCenter(state.selected)||state.map.playerSpawn||{x:state.map.width/2,y:state.map.height/2};
  state.camera.x=clamp(Number(focus.x)||state.map.width/2,0,state.map.width);
  state.camera.y=clamp(Number(focus.y)||state.map.height/2,0,state.map.height);
  state.camera.zoom=walk?preferredWalkZoom():preferredIsoZoom();
  clampCamera();
  updateZoomLabel();
}

function focusCurrentView(initial=false){
  if(state.view==='plan'){
    fitMap();
    return;
  }
  const target=initial?(state.map.playerSpawn||{x:state.map.width/2,y:state.map.height/2}):null;
  focusIsoReview(target,false);
}

function fitMap(){
  const rect=canvas.getBoundingClientRect();
  const padding=Math.min(120,Math.max(56,rect.width*.12));
  let zoom;
  if(state.view==='plan'){
    zoom=Math.min((rect.width-padding)/state.map.width,(rect.height-padding)/state.map.height);
  }else{
    const projectedW=(state.map.width+state.map.height)*ISO_X;
    const projectedH=(state.map.width+state.map.height)*ISO_Y+520;
    zoom=Math.min((rect.width-padding)/projectedW,(rect.height-padding)/projectedH);
  }
  state.camera.zoom=clamp(zoom,.08,2.5);
  state.camera.x=state.map.width/2;
  state.camera.y=state.map.height/2;
  updateZoomLabel();
  if(state.view==='iso')say('Full-city 2.5D overview. Switch views or zoom in to return to neighborhood scale.');
}

function clampCamera(){
  const margin=Math.max(state.map.width,state.map.height)*.2;
  state.camera.x=clamp(state.camera.x,-margin,state.map.width+margin);
  state.camera.y=clamp(state.camera.y,-margin,state.map.height+margin);
}

function screenDeltaToWorld(dx,dy,zoom,view){
  if(view==='plan')return{x:dx/zoom,y:dy/zoom};
  const a=dx/(ISO_X*zoom);
  const b=dy/(ISO_Y*zoom);
  return{x:(a+b)/2,y:(b-a)/2};
}

function worldToScreen(x,y,z=0){
  const cx=canvas.clientWidth/2,cy=canvas.clientHeight/2;
  const dx=x-state.camera.x,dy=y-state.camera.y;
  if(state.view==='plan'){
    return{x:cx+dx*state.camera.zoom,y:cy+dy*state.camera.zoom};
  }
  return{
    x:cx+(dx-dy)*ISO_X*state.camera.zoom,
    y:cy+(dx+dy)*ISO_Y*state.camera.zoom-z*state.camera.zoom
  };
}

function screenToWorld(x,y){
  const cx=canvas.clientWidth/2,cy=canvas.clientHeight/2;
  if(state.view==='plan'){
    return{x:state.camera.x+(x-cx)/state.camera.zoom,y:state.camera.y+(y-cy)/state.camera.zoom};
  }
  const a=(x-cx)/(ISO_X*state.camera.zoom);
  const b=(y-cy)/(ISO_Y*state.camera.zoom);
  return{x:state.camera.x+(a+b)/2,y:state.camera.y+(b-a)/2};
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

  if(state.view==='plan')drawPlan(now);
  else drawIso(now);

  drawMinimap();
}

function drawPlan(now){
  drawPlanBackground();
  if(state.grid)drawPlanGrid();
  drawPlanZones('lots');
  drawPlanZones('zones');
  if(!state.hiddenLayers.has('roads'))for(const road of state.map.roads)drawPlanRoad(road);
  if(!state.hiddenLayers.has('buildings'))for(const building of state.map.buildings)drawPlanBuilding(building);
  if(!state.hiddenLayers.has('props'))for(const prop of state.map.props)drawPlanProp(prop);
  drawSpawnMarker(false);
  if(!state.hiddenLayers.has('interactions'))for(const interaction of state.map.interactions)drawInteractionMarker(interaction,now,false);
  if(state.drawPreview)drawDraftPreview(state.drawPreview);
  if(state.selected&&!state.preview)drawSelection(state.selected);
  if(state.preview)drawPlayer(false);
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
  ctx.save();ctx.lineCap='round';
  ctx.strokeStyle=state.night?'#373b3e':'#5d5f5e';ctx.lineWidth=(o.width+22)*state.camera.zoom;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  ctx.strokeStyle=o.color||'#353b41';ctx.lineWidth=o.width*state.camera.zoom;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  ctx.setLineDash([18*state.camera.zoom,15*state.camera.zoom]);ctx.strokeStyle='rgba(230,220,180,.5)';ctx.lineWidth=Math.max(1,2*state.camera.zoom);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  ctx.restore();
}

function drawPlanBuilding(o){
  const pts=footprintCorners(o).map(p=>worldToScreen(p.x,p.y));
  const style=resolvedBuildingStyle(o);
  fillPolygon(pts,style.faceX);
  strokePolygon(pts,'rgba(255,255,255,.18)',1.4);
  const center=worldToScreen(o.x,o.y);
  if(state.camera.zoom>.5){
    ctx.fillStyle=state.night?'#e9d69d':'#e8e1d4';ctx.font=`700 ${clamp(10*state.camera.zoom,9,13)}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(`${o.label||o.kind} · ${o.floors||3}F`,center.x,center.y,Math.max(40,o.width*state.camera.zoom-10));
  }
}

function drawPlanProp(o){
  const p=worldToScreen(o.x,o.y),r=Math.max(3,(o.radius||10)*state.camera.zoom);
  ctx.fillStyle=o.color||'#777';ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();
}

function drawIso(now){
  drawIsoGround();
  if(state.grid)drawIsoGrid();
  drawIsoZones('lots');
  drawIsoZones('zones');
  if(!state.hiddenLayers.has('roads'))for(const road of state.map.roads)drawIsoRoad(road);

  const entities=[];
  if(!state.hiddenLayers.has('buildings'))for(const o of state.map.buildings)entities.push({type:'building',o,depth:entityDepth(o)});
  if(!state.hiddenLayers.has('props'))for(const o of state.map.props)entities.push({type:'prop',o,depth:entityDepth(o)});
  if(state.preview)entities.push({type:'player',o:state.player,depth:state.player.x+state.player.y});
  entities.sort((a,b)=>a.depth-b.depth);

  for(const item of entities){
    if(item.type==='building')drawIsoBuilding(item.o,now);
    else if(item.type==='prop')drawIsoProp(item.o,now);
    else drawPlayer(true);
  }

  drawSpawnMarker(true);
  if(!state.hiddenLayers.has('interactions'))for(const interaction of state.map.interactions)drawInteractionMarker(interaction,now,true);
  if(state.drawPreview)drawDraftPreview(state.drawPreview);
  if(state.selected&&!state.preview)drawSelection(state.selected);
}

function drawIsoGround(){
  const pts=[
    worldToScreen(0,0),worldToScreen(state.map.width,0),
    worldToScreen(state.map.width,state.map.height),worldToScreen(0,state.map.height)
  ];
  fillPolygon(pts,state.night?'#101819':'#1d2822');
  strokePolygon(pts,state.night?'#334042':'#57665d',2);
}

function drawIsoGrid(){
  const step=Math.max(state.map.gridSize,state.map.gridSize*4);
  if(step*state.camera.zoom<16)return;
  ctx.save();ctx.strokeStyle=state.night?'rgba(150,170,180,.055)':'rgba(255,255,255,.055)';ctx.lineWidth=1;
  ctx.beginPath();
  for(let x=0;x<=state.map.width;x+=step){
    const a=worldToScreen(x,0),b=worldToScreen(x,state.map.height);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
  }
  for(let y=0;y<=state.map.height;y+=step){
    const a=worldToScreen(0,y),b=worldToScreen(state.map.width,y);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
  }
  ctx.stroke();ctx.restore();
}

function drawIsoZones(layer){
  if(state.hiddenLayers.has(layer))return;
  for(const o of state.map.zones){
    if((o.layer||'zones')!==layer)continue;
    const pts=footprintCorners(o).map(p=>worldToScreen(p.x,p.y));
    fillPolygon(pts,withAlpha(o.color||'#695a88',layer==='lots'?.18:.09));
    strokePolygon(pts,withAlpha(o.color||'#695a88',layer==='lots'?.5:.62),1.2,layer==='zones'?[8,6]:[]);
    if(layer==='zones'&&state.camera.zoom>.45)drawTextLabel(o.label,polygonCenter(pts),'#d8cae8');
  }
}

function roadWorldPolygon(o,extra=0){
  const dx=o.x2-o.x1,dy=o.y2-o.y1;
  const len=Math.hypot(dx,dy)||1;
  const px=-dy/len,py=dx/len;
  const half=o.width/2+extra;
  return[
    {x:o.x1+px*half,y:o.y1+py*half},
    {x:o.x2+px*half,y:o.y2+py*half},
    {x:o.x2-px*half,y:o.y2-py*half},
    {x:o.x1-px*half,y:o.y1-py*half}
  ];
}

function drawIsoRoad(o){
  const sidewalk=roadWorldPolygon(o,18).map(p=>worldToScreen(p.x,p.y));
  const asphalt=roadWorldPolygon(o,0).map(p=>worldToScreen(p.x,p.y));
  fillPolygon(sidewalk,state.night?'#444847':'#706f68');
  fillPolygon(asphalt,o.style==='alley'?(state.night?'#24282c':'#30353a'):(state.night?'#292e34':o.color||'#353b41'));
  strokePolygon(asphalt,'rgba(255,255,255,.08)',1);

  const a=worldToScreen(o.x1,o.y1),b=worldToScreen(o.x2,o.y2);
  ctx.save();
  ctx.setLineDash([13*state.camera.zoom+4,11*state.camera.zoom+4]);
  ctx.strokeStyle=o.style==='alley'?'rgba(255,255,255,.12)':'rgba(229,213,161,.48)';
  ctx.lineWidth=Math.max(1,1.8*state.camera.zoom);
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore();
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

function buildingElevation(o){
  return clamp(Number(o.floors)||3,1,30)*FLOOR_HEIGHT;
}

function footprintCorners(o){
  const w=Math.max(2,Number(o.width)||2),h=Math.max(2,Number(o.height)||2);
  const local=[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]];
  const a=(Number(o.rotation)||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  return local.map(([x,y])=>({x:o.x+x*c-y*s,y:o.y+x*s+y*c}));
}

function visibleBuildingEdges(corners){
  const view={x:1,y:1};
  const out=[];
  for(let i=0;i<4;i++){
    const a=corners[i],b=corners[(i+1)%4];
    const dx=b.x-a.x,dy=b.y-a.y;
    const normal={x:dy,y:-dx};
    if(normal.x*view.x+normal.y*view.y>0)out.push(i);
  }
  return out;
}

function buildingGeometry(o){
  const corners=footprintCorners(o);
  const elevation=buildingElevation(o);
  const base=corners.map(p=>worldToScreen(p.x,p.y,0));
  const top=corners.map(p=>worldToScreen(p.x,p.y,elevation));
  const edges=visibleBuildingEdges(corners);
  const faces=edges.map(i=>{
    const j=(i+1)%4;
    return{edge:i,points:[base[i],base[j],top[j],top[i]],baseA:base[i],baseB:base[j],topA:top[i],topB:top[j],
      span:Math.hypot(corners[j].x-corners[i].x,corners[j].y-corners[i].y)};
  });
  return{corners,base,top,faces,elevation};
}

function drawIsoBuilding(o,now){
  const g=buildingGeometry(o);
  const style=resolvedBuildingStyle(o);

  drawBuildingGrounding(o,g,style);

  for(const face of g.faces){
    const tone=face.edge===1?style.faceX:style.faceY;
    fillPolygon(face.points,state.night?shadeHex(tone,-.26):tone);
    strokePolygon(face.points,'rgba(0,0,0,.28)',1);
    drawFacade(o,face,style,now);
    drawFoundationBand(face,style);
  }

  fillPolygon(g.top,state.night?shadeHex(style.top,-.22):style.top);
  strokePolygon(g.top,'rgba(255,255,255,.13)',1.1);

  drawRoofDetails(o,g,style);

  if(isNamedLandmark(o)||state.selected===o||state.camera.zoom>.78){
    const labelPoint=worldToScreen(o.x,o.y,g.elevation*.63);
    drawBuildingLabel(o,labelPoint,style);
  }
}

function expandedFootprint(o,padding){
  const w=Math.max(2,Number(o.width)||2);
  const h=Math.max(2,Number(o.height)||2);
  const sx=(w+padding*2)/w;
  const sy=(h+padding*2)/h;
  const a=(Number(o.rotation)||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  const local=[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]];
  return local.map(([x,y])=>{
    const ex=x*sx,ey=y*sy;
    return{x:o.x+ex*c-ey*s,y:o.y+ex*s+ey*c};
  });
}

function drawBuildingGrounding(o,g,style){
  const zoom=state.camera.zoom;
  const apronWorld=expandedFootprint(o,Math.max(8,Math.min(18,Math.min(o.width,o.height)*.08)));
  const apron=apronWorld.map(p=>worldToScreen(p.x,p.y,0));

  // A thin concrete apron visually connects the footprint to the lot/sidewalk.
  const apronColor=state.night?'#34383a':'#77756d';
  fillPolygon(apron,apronColor);
  strokePolygon(apron,state.night?'rgba(195,202,204,.12)':'rgba(255,255,255,.13)',Math.max(.7,zoom));

  // Soft cast shadow stays close to the structure; it should never look like a gap.
  const cast=g.base.map(p=>({x:p.x+2.2*zoom,y:p.y+3.2*zoom}));
  fillPolygon(cast,state.night?'rgba(0,0,0,.28)':'rgba(0,0,0,.16)');

  // Strong contact shadow sits directly under the wall footprint.
  const contact=g.base.map(p=>({x:p.x+.55*zoom,y:p.y+.8*zoom}));
  fillPolygon(contact,state.night?'rgba(0,0,0,.48)':'rgba(0,0,0,.32)');

  // Crisp footing line makes the exact wall/ground join obvious.
  strokePolygon(g.base,state.night?'rgba(12,15,17,.78)':'rgba(28,30,29,.62)',Math.max(1,1.35*zoom));
}

function drawFoundationBand(face,style){
  const band=faceQuad(face,0,1,.965,1);
  const baseTone=state.night?shadeHex(style.faceY||style.faceX,-.42):shadeHex(style.faceY||style.faceX,-.24);
  fillPolygon(band,baseTone);
  const seamA=facePoint(face,0,.965),seamB=facePoint(face,1,.965);
  ctx.save();
  ctx.strokeStyle=state.night?'rgba(220,225,224,.08)':'rgba(255,255,255,.10)';
  ctx.lineWidth=Math.max(.6,state.camera.zoom*.8);
  ctx.beginPath();ctx.moveTo(seamA.x,seamA.y);ctx.lineTo(seamB.x,seamB.y);ctx.stroke();
  ctx.restore();
}

function drawFacade(o,face,style,now){
  const floors=clamp(Math.round(Number(o.floors)||3),1,30);
  const cols=clamp(Math.floor(face.span/48),2,7);
  const special=['corner-store','bank','casino','nightclub','gym','hospital'].includes(o.kind);

  for(let floor=0;floor<floors;floor++){
    if(floor===0&&special){
      const quad=faceQuad(face,.07,.93,1-(.76/floors),1-(.08/floors));
      fillPolygon(quad,state.night?shadeHex(style.windowNight,-.18):style.window);
      strokePolygon(quad,withAlpha(style.trim,.55),.8);
      continue;
    }

    for(let col=0;col<cols;col++){
      const gap=.12;
      const cell=1/cols;
      const u0=col*cell+cell*gap,u1=(col+1)*cell-cell*gap;
      const v0=1-((floor+.76)/floors),v1=1-((floor+.22)/floors);
      const quad=faceQuad(face,u0,u1,v0,v1);
      const lit=state.night&&windowLit(o.id,floor,col);
      fillPolygon(quad,lit?style.windowNight:style.window);
      strokePolygon(quad,withAlpha(style.trim,.4),.55);
    }

    if(floor>0){
      const y=1-floor/floors;
      const a=facePoint(face,0,y),b=facePoint(face,1,y);
      ctx.strokeStyle=withAlpha(style.trim,.28);ctx.lineWidth=.7;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
  }

  if(special){
    const sign=faceQuad(face,.15,.85,1-(.96/floors),1-(.80/floors));
    fillPolygon(sign,state.night?style.accent:shadeHex(style.accent,-.08));
  }
}

function facePoint(face,u,v){
  const top={x:lerp(face.topA.x,face.topB.x,u),y:lerp(face.topA.y,face.topB.y,u)};
  const bottom={x:lerp(face.baseA.x,face.baseB.x,u),y:lerp(face.baseA.y,face.baseB.y,u)};
  return{x:lerp(top.x,bottom.x,v),y:lerp(top.y,bottom.y,v)};
}

function faceQuad(face,u0,u1,v0,v1){
  return[
    facePoint(face,u0,v0),facePoint(face,u1,v0),
    facePoint(face,u1,v1),facePoint(face,u0,v1)
  ];
}

function drawRoofDetails(o,g,style){
  if((o.floors||1)<2)return;
  const count=(o.kind==='office'||o.kind==='hospital')?2:1;
  for(let i=0;i<count;i++){
    const ox=(i-(count-1)/2)*Math.min(o.width*.18,50);
    drawMiniPrism(o.x+ox,o.y-o.height*.06,Math.min(55,o.width*.23),Math.min(38,o.height*.22),g.elevation,18,shadeHex(style.roof||style.top,-.1));
  }
}

function drawMiniPrism(x,y,w,h,zBase,zHeight,color){
  const fake={x,y,width:w,height:h,rotation:0};
  const corners=footprintCorners(fake);
  const base=corners.map(p=>worldToScreen(p.x,p.y,zBase));
  const top=corners.map(p=>worldToScreen(p.x,p.y,zBase+zHeight));
  fillPolygon([base[1],base[2],top[2],top[1]],shadeHex(color,-.18));
  fillPolygon([base[2],base[3],top[3],top[2]],shadeHex(color,-.3));
  fillPolygon(top,color);
}

function drawBuildingLabel(o,p,style){
  const text=o.label||o.kind||'Building';
  ctx.save();
  ctx.font='800 10px system-ui';
  const w=Math.min(180,ctx.measureText(text).width+14);
  const x=p.x-w/2,y=p.y-7;
  ctx.fillStyle=state.night?'rgba(4,7,11,.82)':'rgba(17,20,21,.78)';
  ctx.fillRect(x,y-9,w,18);
  ctx.fillStyle=style.accent||'#d78e36';
  ctx.fillRect(x,y-9,3,18);
  ctx.fillStyle='#f1eee8';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(text,p.x,y,w-10);
  ctx.restore();
}

function isNamedLandmark(o){
  return['bank','casino','nightclub','hospital','gym','corner-store'].includes(o.kind);
}

function entityDepth(o){
  if(o.type==='building'){
    const corners=footprintCorners(o);
    return Math.max(...corners.map(p=>p.x+p.y));
  }
  return (o.x||0)+(o.y||0)+(o.radius||0);
}

function drawIsoProp(o,now){
  const p=worldToScreen(o.x,o.y,0);
  const scale=clamp(state.camera.zoom,.35,1.35);

  if(o.kind==='tree'){
    const trunkTop=worldToScreen(o.x,o.y,36);
    ctx.strokeStyle='#584335';ctx.lineWidth=5*scale;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(trunkTop.x,trunkTop.y);ctx.stroke();
    const crown=worldToScreen(o.x,o.y,56);
    ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(p.x+5,p.y+4,16*scale,7*scale,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=state.night?'#294634':o.color||'#4f7258';ctx.beginPath();ctx.arc(crown.x,crown.y,17*scale,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=state.night?'#31543c':'#5b8062';ctx.beginPath();ctx.arc(crown.x-7*scale,crown.y-4*scale,10*scale,0,Math.PI*2);ctx.fill();
    return;
  }

  if(o.kind==='streetlight'){
    const top=worldToScreen(o.x,o.y,72);
    ctx.strokeStyle='#586168';ctx.lineWidth=Math.max(1.5,2.4*scale);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(top.x,top.y);ctx.stroke();
    ctx.fillStyle=state.night?'#ffe2a1':'#cfd4d5';ctx.beginPath();ctx.arc(top.x,top.y,3.5*scale,0,Math.PI*2);ctx.fill();
    if(state.night){
      const g=ctx.createRadialGradient(top.x,top.y,0,top.x,top.y,28*scale);
      g.addColorStop(0,'rgba(255,218,145,.28)');g.addColorStop(1,'rgba(255,218,145,0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(top.x,top.y,28*scale,0,Math.PI*2);ctx.fill();
    }
    return;
  }

  if(o.kind==='parked-car'){
    drawMiniWorldObject(o,48,22,12,o.color||'#687785');
    return;
  }
  if(o.kind==='dumpster'){
    drawMiniWorldObject(o,30,24,24,o.color||'#466052');
    return;
  }
  if(o.kind==='planter'){
    drawMiniWorldObject(o,28,28,12,o.color||'#586958');
    const leaf=worldToScreen(o.x,o.y,25);
    ctx.fillStyle=state.night?'#2e4f36':'#52745a';ctx.beginPath();ctx.arc(leaf.x,leaf.y,7*scale,0,Math.PI*2);ctx.fill();
    return;
  }
  if(o.kind==='bench'){
    drawMiniWorldObject(o,34,12,9,o.color||'#7e634d');
    return;
  }
  if(o.kind==='bus-stop'){
    const left=worldToScreen(o.x-15,o.y,0),leftTop=worldToScreen(o.x-15,o.y,44);
    const right=worldToScreen(o.x+15,o.y,0),rightTop=worldToScreen(o.x+15,o.y,44);
    ctx.strokeStyle='#69747a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(left.x,left.y);ctx.lineTo(leftTop.x,leftTop.y);ctx.moveTo(right.x,right.y);ctx.lineTo(rightTop.x,rightTop.y);ctx.stroke();
    ctx.strokeStyle='#96a5aa';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(leftTop.x,leftTop.y);ctx.lineTo(rightTop.x,rightTop.y);ctx.stroke();
    return;
  }

  ctx.fillStyle=o.color||'#777';ctx.beginPath();ctx.arc(p.x,p.y,Math.max(3,(o.radius||8)*scale*.5),0,Math.PI*2);ctx.fill();
}

function drawMiniWorldObject(o,w,h,zHeight,color){
  const fake={x:o.x,y:o.y,width:w,height:h,rotation:o.rotation||0};
  const corners=footprintCorners(fake);
  const base=corners.map(p=>worldToScreen(p.x,p.y,0));
  const top=corners.map(p=>worldToScreen(p.x,p.y,zHeight));
  fillPolygon([base[1],base[2],top[2],top[1]],shadeHex(color,-.15));
  fillPolygon([base[2],base[3],top[3],top[2]],shadeHex(color,-.28));
  fillPolygon(top,color);
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
  ctx.save();ctx.globalAlpha=.74;ctx.strokeStyle='#e5a452';ctx.fillStyle='rgba(229,164,82,.16)';ctx.lineWidth=2;ctx.setLineDash([7,5]);
  if(d.type==='road'){
    if(state.view==='iso'){
      const temp={...d,width:96};
      const pts=roadWorldPolygon(temp,0).map(p=>worldToScreen(p.x,p.y));fillPolygon(pts,'rgba(229,164,82,.22)');strokePolygon(pts,'#e5a452',1.5,[7,5]);
    }else{
      const a=worldToScreen(d.x1,d.y1),b=worldToScreen(d.x2,d.y2);ctx.lineWidth=96*state.camera.zoom;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
  }else{
    const fake={x:d.x+d.width/2,y:d.y+d.height/2,width:d.width,height:d.height,rotation:0};
    const pts=footprintCorners(fake).map(p=>worldToScreen(p.x,p.y));
    fillPolygon(pts,'rgba(229,164,82,.18)');strokePolygon(pts,'#e5a452',1.5,[7,5]);
  }
  ctx.restore();
}

function drawSelection(o){
  if(state.view==='iso'&&o.type==='building'){
    const g=buildingGeometry(o);
    strokePolygon(g.top,'#f2b35f',2,[6,4]);
    strokePolygon(g.base,'rgba(242,179,95,.72)',1.5,[5,4]);
    for(let i=0;i<4;i++){
      ctx.strokeStyle='#f2b35f';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(g.base[i].x,g.base[i].y);ctx.lineTo(g.top[i].x,g.top[i].y);ctx.stroke();
    }
    return;
  }

  ctx.save();ctx.strokeStyle='#f2b35f';ctx.lineWidth=2;ctx.setLineDash([6,4]);
  if(o.type==='road'){
    const pts=roadWorldPolygon(o,5).map(p=>worldToScreen(p.x,p.y));strokePolygon(pts,'#f2b35f',2,[6,4]);
  }else if(o.type==='building'||o.type==='zone'){
    const pts=footprintCorners(o).map(p=>worldToScreen(p.x,p.y));strokePolygon(pts,'#f2b35f',2,[6,4]);
  }else{
    const p=worldToScreen(o.x,o.y,state.view==='iso'?10:0);ctx.beginPath();ctx.arc(p.x,p.y,13,0,Math.PI*2);ctx.stroke();
  }
  ctx.restore();
}

function hitTest(worldX,worldY,screenX,screenY){
  if(state.view==='iso'){
    if(!state.hiddenLayers.has('interactions')){
      for(const o of [...state.map.interactions].reverse()){
        const p=worldToScreen(o.x,o.y,18);if(Math.hypot(screenX-p.x,screenY-p.y)<=16)return o;
      }
    }
    if(!state.hiddenLayers.has('props')){
      const props=[...state.map.props].sort((a,b)=>entityDepth(b)-entityDepth(a));
      for(const o of props){
        const p=worldToScreen(o.x,o.y,20);if(Math.hypot(screenX-p.x,screenY-p.y)<=Math.max(11,(o.radius||10)*state.camera.zoom))return o;
      }
    }
    if(!state.hiddenLayers.has('buildings')){
      const buildings=[...state.map.buildings].sort((a,b)=>entityDepth(b)-entityDepth(a));
      for(const o of buildings){
        const g=buildingGeometry(o);
        if(pointInPolygon(screenX,screenY,g.top))return o;
        for(const face of g.faces)if(pointInPolygon(screenX,screenY,face.points))return o;
      }
    }
  }

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
  saveDraft();syncMapInputs();refreshInspector();refreshStats();focusCurrentView(true);
  say('Authored Downtown Proof restored.');
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
  saveDraft();syncMapInputs();refreshInspector();focusCurrentView(true);say('Map cleared.');
}

function togglePreview(){
  state.preview=!state.preview;
  if(state.preview&&state.view!=='iso')setView('iso',false);
  $('#preview-toggle').classList.toggle('active',state.preview);
  $('#preview-toggle').textContent=state.preview?'■ EDIT':'▶ WALK';
  $('#preview-hud').hidden=!state.preview;
  $('#mobile-dpad').hidden=!state.preview;

  if(state.preview){
    state.player.x=state.map.playerSpawn?.x??state.map.width/2;
    state.player.y=state.map.playerSpawn?.y??state.map.height/2;
    state.selected=null;
    refreshInspector();
    focusIsoReview(state.player,true);
    updatePreviewHud();
    say('Walk test: closer 2.5D camera enabled. Use WASD/arrows or the mobile pad.');
  }else{
    state.keys.clear();
    state.moveButtons.clear();
    ensureIsoReviewZoom(true);
    say('Back in 2.5D neighborhood review mode.');
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
  syncMapInputs();refreshInspector();refreshStats();saveDraft();focusCurrentView(true);
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
