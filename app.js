import { MAP_LAYERS, PALETTES, createStarterMap } from './map/default-map.js';

const STORAGE_KEY='riftcity-2d-map-draft-v1';
const $=selector=>document.querySelector(selector);
const canvas=$('#map-canvas');
const minimap=$('#minimap');
const ctx=canvas.getContext('2d');
const miniCtx=minimap.getContext('2d');
const status=$('#status');

const state={
  map:loadDraft()||createStarterMap(),
  tool:'select',
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
  player:{x:0,y:0,radius:14,speed:250},
  keys:new Set(),
  moveButtons:new Set(),
  undo:[],
  redo:[],
  lastFrame:performance.now()
};

init();

function init(){
  bindUi();
  renderLayers();
  renderPalette();
  syncMapInputs();
  state.player.x=state.map.playerSpawn?.x??state.map.width/2;
  state.player.y=state.map.playerSpawn?.y??state.map.height/2;
  resizeCanvas();
  fitMap();
  refreshInspector();
  refreshCount();
  requestAnimationFrame(frame);
}

function bindUi(){
  window.addEventListener('resize',resizeCanvas);

  document.querySelectorAll('[data-tool]').forEach(button=>{
    button.addEventListener('click',()=>setTool(button.dataset.tool));
  });
  $('#preview-toggle').addEventListener('click',togglePreview);
  $('#preview-exit').addEventListener('click',togglePreview);

  $('#undo-button').addEventListener('click',undo);
  $('#redo-button').addEventListener('click',redo);
  $('#grid-toggle').addEventListener('click',()=>{
    state.grid=!state.grid;
    $('#grid-toggle').classList.toggle('active',state.grid);
  });

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
    $('#zoom-reset').textContent='100%';
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
  $('#raise-object').addEventListener('click',()=>reorderSelected(1));
  $('#lower-object').addEventListener('click',()=>reorderSelected(-1));

  document.querySelectorAll('[data-field]').forEach(input=>{
    input.addEventListener('change',()=>applyInspectorField(input.dataset.field,input.value));
  });
  $('#object-label').addEventListener('change',event=>applySimpleField('label',event.target.value));
  $('#object-color').addEventListener('change',event=>applySimpleField('color',event.target.value));
  $('#object-layer').addEventListener('change',event=>changeSelectedLayer(event.target.value));
  $('#object-collision').addEventListener('change',event=>applySimpleField('collision',event.target.checked));

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
  const dpr=Math.min(window.devicePixelRatio||1,2);
  const width=Math.max(1,Math.floor(rect.width*dpr));
  const height=Math.max(1,Math.floor(rect.height*dpr));
  if(canvas.width!==width||canvas.height!==height){
    canvas.width=width;canvas.height=height;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
}

function setTool(tool){
  if(state.preview)return;
  state.tool=tool;
  state.drawPreview=null;
  document.querySelectorAll('[data-tool]').forEach(button=>button.classList.toggle('active',button.dataset.tool===tool));
  $('#mode-label').textContent=tool.toUpperCase();
  renderPalette();
  say(`${tool.toUpperCase()} tool.`);
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
  $('#palette-help').textContent=state.tool==='road'?'Drag from start to end':list.length?'Choose a placement style':state.tool==='select'?'Tap an object to edit':'Drag to move around the city';
  $('#palette-list').innerHTML=list.map(item=>`
    <button class="palette-item ${state.palette[state.tool]===item.id?'active':''}" data-palette="${item.id}">
      <span class="palette-icon" style="background:${item.color}"></span>
      <span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.id)}</small></span>
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
  canvas.setPointerCapture?.(event.pointerId);
  updatePointer(event);

  if(state.preview)return;

  if(event.pointerType==='touch'){
    trackTouchStart(event);
    if(activeTouchCount()>=2){
      state.draggingObject=false;
      state.dragObjectOffset=null;
      state.drawPreview=null;
      state.gesture=null;
      return;
    }
  }

  if(state.tool==='pan'||event.button===1||event.button===2||event.altKey||event.code==='Space'){
    state.gesture={type:'pan',startX:event.clientX,startY:event.clientY,cameraX:state.camera.x,cameraY:state.camera.y,pointerId:event.pointerId};
    return;
  }

  if(state.tool==='select'){
    const hit=hitTest(state.pointer.worldX,state.pointer.worldY);
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
    refreshCount();
  }
}

function onPointerMove(event){
  updatePointer(event);

  if(event.pointerType==='touch'){
    trackTouchMove(event);
    if(handlePinch())return;
  }

  if(state.preview)return;

  if(state.gesture?.type==='pan'){
    const dx=(event.clientX-state.gesture.startX)/state.camera.zoom;
    const dy=(event.clientY-state.gesture.startY)/state.camera.zoom;
    state.camera.x=state.gesture.cameraX-dx;
    state.camera.y=state.gesture.cameraY-dy;
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
    state.drawPreview.x2=p.x;state.drawPreview.y2=p.y;
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
  if(event.pointerType==='touch')trackTouchEnd(event);
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
        id:newId('road'),type:'road',layer:'roads',x1:d.x1,y1:d.y1,x2:d.x2,y2:d.y2,
        width:96,label:'Road',color:'#343a40',collision:false
      };
      state.map.roads.push(road);selectObject(road);saveDraft();refreshCount();
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
      const object={
        id:newId(tool),type:tool,kind:item.id,layer:tool==='building'?'buildings':(item.layer||'zones'),
        x:d.x+d.width/2,y:d.y+d.height/2,width:d.width,height:d.height,rotation:0,
        label:item.label,color:item.color,collision:tool==='building'?item.collision:false
      };
      collectionForLayer(object.layer).push(object);selectObject(object);saveDraft();refreshCount();
    }
    state.drawPreview=null;
  }
}

function onWheel(event){
  event.preventDefault();
  const factor=Math.exp(-event.deltaY*.0012);
  zoomAt(event.offsetX,event.offsetY,factor);
}

const touches=new Map();
function trackTouchStart(event){touches.set(event.pointerId,{x:event.clientX,y:event.clientY});}
function trackTouchMove(event){if(touches.has(event.pointerId))touches.set(event.pointerId,{x:event.clientX,y:event.clientY});}
function trackTouchEnd(event){touches.delete(event.pointerId);state._pinch=null;}
function activeTouchCount(){return touches.size;}
function handlePinch(){
  if(touches.size!==2)return false;
  const [a,b]=[...touches.values()];
  const distance=Math.hypot(a.x-b.x,a.y-b.y);
  const mid={x:(a.x+b.x)/2-canvas.getBoundingClientRect().left,y:(a.y+b.y)/2-canvas.getBoundingClientRect().top};
  if(!state._pinch)state._pinch={distance,lastMid:mid};
  else{
    const factor=distance/Math.max(1,state._pinch.distance);
    zoomAt(mid.x,mid.y,factor);
    const dx=(mid.x-state._pinch.lastMid.x)/state.camera.zoom;
    const dy=(mid.y-state._pinch.lastMid.y)/state.camera.zoom;
    state.camera.x-=dx;state.camera.y-=dy;
    state._pinch={distance,lastMid:mid};
  }
  return true;
}

function updatePointer(event){
  const rect=canvas.getBoundingClientRect();
  state.pointer.screenX=event.clientX-rect.left;
  state.pointer.screenY=event.clientY-rect.top;
  const world=screenToWorld(state.pointer.screenX,state.pointer.screenY);
  state.pointer.worldX=world.x;state.pointer.worldY=world.y;
  $('#cursor-readout').textContent=`X ${Math.round(world.x)} · Y ${Math.round(world.y)} · ${Math.round(state.camera.zoom*100)}%`;
}

function zoomAt(screenX,screenY,factor){
  const before=screenToWorld(screenX,screenY);
  state.camera.zoom=clamp(state.camera.zoom*factor,.15,4);
  const after=screenToWorld(screenX,screenY);
  state.camera.x+=before.x-after.x;
  state.camera.y+=before.y-after.y;
  clampCamera();
  $('#zoom-reset').textContent=`${Math.round(state.camera.zoom*100)}%`;
}

function fitMap(){
  const rect=canvas.getBoundingClientRect();
  const padding=80;
  const zoom=Math.min((rect.width-padding)/state.map.width,(rect.height-padding)/state.map.height);
  state.camera.zoom=clamp(zoom,.15,2);
  state.camera.x=state.map.width/2-rect.width/(2*state.camera.zoom);
  state.camera.y=state.map.height/2-rect.height/(2*state.camera.zoom);
  clampCamera();
  $('#zoom-reset').textContent=`${Math.round(state.camera.zoom*100)}%`;
}

function clampCamera(){
  const rect=canvas.getBoundingClientRect();
  const visibleW=rect.width/state.camera.zoom,visibleH=rect.height/state.camera.zoom;
  const margin=220/state.camera.zoom;
  state.camera.x=clamp(state.camera.x,-margin,state.map.width-visibleW+margin);
  state.camera.y=clamp(state.camera.y,-margin,state.map.height-visibleH+margin);
}

function screenToWorld(x,y){return {x:state.camera.x+x/state.camera.zoom,y:state.camera.y+y/state.camera.zoom};}
function worldToScreen(x,y){return {x:(x-state.camera.x)*state.camera.zoom,y:(y-state.camera.y)*state.camera.zoom};}
function snapPoint(x,y){
  const s=Math.max(1,state.map.gridSize||32);
  return {x:clamp(Math.round(x/s)*s,0,state.map.width),y:clamp(Math.round(y/s)*s,0,state.map.height)};
}

function frame(now){
  const dt=Math.min(.05,(now-state.lastFrame)/1000);
  state.lastFrame=now;
  if(state.preview)updatePreview(dt);
  draw();
  requestAnimationFrame(frame);
}

function draw(){
  const rect=canvas.getBoundingClientRect();
  ctx.clearRect(0,0,rect.width,rect.height);
  ctx.fillStyle='#10151a';ctx.fillRect(0,0,rect.width,rect.height);

  ctx.save();
  ctx.scale(state.camera.zoom,state.camera.zoom);
  ctx.translate(-state.camera.x,-state.camera.y);

  drawMapBackground();
  if(state.grid)drawGrid();

  drawCollection(state.map.zones,'lots',drawZone);
  drawCollection(state.map.zones,'zones',drawZone);
  drawCollection(state.map.roads,'roads',drawRoad);
  drawCollection(state.map.buildings,'buildings',drawBuilding);
  drawCollection(state.map.props,'props',drawProp);
  drawCollection(state.map.interactions,'interactions',drawInteraction);

  if(state.drawPreview)drawDraftPreview(state.drawPreview);
  if(state.selected&&!state.preview)drawSelection(state.selected);
  if(state.preview)drawPlayer();

  ctx.restore();
  drawMinimap();
}

function drawMapBackground(){
  ctx.fillStyle='#1b211f';
  ctx.fillRect(0,0,state.map.width,state.map.height);
  ctx.strokeStyle='#57605a';ctx.lineWidth=2/state.camera.zoom;
  ctx.strokeRect(0,0,state.map.width,state.map.height);
}

function drawGrid(){
  const step=state.map.gridSize;
  if(step*state.camera.zoom<7)return;
  const startX=Math.max(0,Math.floor(state.camera.x/step)*step);
  const startY=Math.max(0,Math.floor(state.camera.y/step)*step);
  const rect=canvas.getBoundingClientRect();
  const endX=Math.min(state.map.width,state.camera.x+rect.width/state.camera.zoom+step);
  const endY=Math.min(state.map.height,state.camera.y+rect.height/state.camera.zoom+step);
  ctx.beginPath();
  for(let x=startX;x<=endX;x+=step){ctx.moveTo(x,startY);ctx.lineTo(x,endY);}
  for(let y=startY;y<=endY;y+=step){ctx.moveTo(startX,y);ctx.lineTo(endX,y);}
  ctx.strokeStyle='rgba(255,255,255,.055)';ctx.lineWidth=1/state.camera.zoom;ctx.stroke();
}

function drawCollection(items,layer,drawer){
  if(state.hiddenLayers.has(layer))return;
  for(const item of items){
    if((item.layer||layer)!==layer)continue;
    if(isVisible(item))drawer(item);
  }
}

function drawRoad(o){
  ctx.save();
  ctx.lineCap='round';
  ctx.strokeStyle='rgba(0,0,0,.24)';ctx.lineWidth=o.width+12;ctx.beginPath();ctx.moveTo(o.x1,o.y1);ctx.lineTo(o.x2,o.y2);ctx.stroke();
  ctx.strokeStyle=o.color||'#343a40';ctx.lineWidth=o.width;ctx.beginPath();ctx.moveTo(o.x1,o.y1);ctx.lineTo(o.x2,o.y2);ctx.stroke();
  ctx.setLineDash([24,22]);ctx.strokeStyle='rgba(230,220,180,.46)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(o.x1,o.y1);ctx.lineTo(o.x2,o.y2);ctx.stroke();
  ctx.setLineDash([]);ctx.restore();
}

function drawBuilding(o){
  ctx.save();ctx.translate(o.x,o.y);ctx.rotate((o.rotation||0)*Math.PI/180);
  const w=o.width,h=o.height;
  ctx.fillStyle='rgba(0,0,0,.28)';roundRect(ctx,-w/2+7,-h/2+9,w,h,8);ctx.fill();
  ctx.fillStyle=o.color||'#856f63';roundRect(ctx,-w/2,-h/2,w,h,7);ctx.fill();
  ctx.fillStyle=shade(o.color||'#856f63',-.16);ctx.fillRect(-w/2,-h/2,w,Math.max(10,h*.14));
  ctx.strokeStyle='rgba(255,255,255,.16)';ctx.lineWidth=2/state.camera.zoom;roundRect(ctx,-w/2,-h/2,w,h,7);ctx.stroke();
  const windows=Math.max(2,Math.floor(w/55));
  ctx.fillStyle='rgba(30,48,58,.72)';
  for(let i=0;i<windows;i++){
    const cx=-w/2+(i+1)*w/(windows+1);
    ctx.fillRect(cx-9,-7,18,14);
  }
  ctx.fillStyle='rgba(245,238,220,.78)';ctx.font=`${Math.max(10,12/state.camera.zoom)}px system-ui`;
  ctx.textAlign='center';ctx.textBaseline='middle';
  if(state.camera.zoom>.35)ctx.fillText(o.label||o.kind||'Building',0,h*.28,Math.max(30,w-16));
  ctx.restore();
}

function drawProp(o){
  ctx.save();ctx.translate(o.x,o.y);
  const r=o.radius||12;
  if(o.kind==='tree'){
    ctx.fillStyle='#314b36';ctx.beginPath();ctx.arc(3,4,r,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=o.color||'#4f7258';ctx.beginPath();ctx.arc(0,0,r*.78,0,Math.PI*2);ctx.fill();
  }else if(o.kind==='parked-car'){
    ctx.rotate((o.rotation||0)*Math.PI/180);ctx.fillStyle=o.color;roundRect(ctx,-r*1.5,-r*.65,r*3,r*1.3,5);ctx.fill();
  }else{
    ctx.fillStyle=o.color||'#777';ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.3)';ctx.lineWidth=1.5/state.camera.zoom;ctx.stroke();
  }
  ctx.restore();
}

function drawZone(o){
  ctx.save();ctx.translate(o.x,o.y);ctx.rotate((o.rotation||0)*Math.PI/180);
  ctx.globalAlpha=o.layer==='lots'?.11:.16;ctx.fillStyle=o.color||'#695a88';ctx.fillRect(-o.width/2,-o.height/2,o.width,o.height);
  ctx.globalAlpha=.8;ctx.setLineDash([12,8]);ctx.strokeStyle=o.color||'#695a88';ctx.lineWidth=2/state.camera.zoom;ctx.strokeRect(-o.width/2,-o.height/2,o.width,o.height);ctx.setLineDash([]);
  ctx.globalAlpha=.9;ctx.fillStyle='#fff';ctx.font=`${Math.max(10,12/state.camera.zoom)}px system-ui`;ctx.fillText(o.label||'Zone',-o.width/2+8,-o.height/2+18);
  ctx.restore();
}

function drawInteraction(o){
  const r=o.radius||12;
  ctx.save();ctx.translate(o.x,o.y);
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.arc(2,3,r+4,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=o.color||'#d78e36';ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#121212';ctx.font=`bold ${Math.max(8,r)}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('!',0,1);
  ctx.restore();
}

function drawDraftPreview(d){
  ctx.save();ctx.globalAlpha=.72;ctx.strokeStyle='#d78e36';ctx.fillStyle='rgba(215,142,54,.18)';ctx.lineWidth=2/state.camera.zoom;ctx.setLineDash([8,6]);
  if(d.type==='road'){ctx.lineWidth=96;ctx.beginPath();ctx.moveTo(d.x1,d.y1);ctx.lineTo(d.x2,d.y2);ctx.stroke();}
  else{ctx.fillRect(d.x,d.y,d.width,d.height);ctx.strokeRect(d.x,d.y,d.width,d.height);}
  ctx.setLineDash([]);ctx.restore();
}

function drawSelection(o){
  ctx.save();ctx.strokeStyle='#f2b35f';ctx.fillStyle='#f2b35f';ctx.lineWidth=2/state.camera.zoom;ctx.setLineDash([6,4]);
  if(o.type==='road'){
    ctx.beginPath();ctx.moveTo(o.x1,o.y1);ctx.lineTo(o.x2,o.y2);ctx.stroke();
  }else if(o.type==='building'||o.type==='zone'){
    ctx.translate(o.x,o.y);ctx.rotate((o.rotation||0)*Math.PI/180);ctx.strokeRect(-o.width/2-5,-o.height/2-5,o.width+10,o.height+10);
  }else{
    ctx.beginPath();ctx.arc(o.x,o.y,(o.radius||12)+7,0,Math.PI*2);ctx.stroke();
  }
  ctx.setLineDash([]);ctx.restore();
}

function drawPlayer(){
  ctx.save();ctx.translate(state.player.x,state.player.y);
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.arc(3,4,state.player.radius+3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#f0ede7';ctx.beginPath();ctx.arc(0,0,state.player.radius,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#d78e36';ctx.lineWidth=3/state.camera.zoom;ctx.stroke();
  ctx.restore();
}

function isVisible(o){
  const rect=canvas.getBoundingClientRect();
  const left=state.camera.x-200,right=state.camera.x+rect.width/state.camera.zoom+200;
  const top=state.camera.y-200,bottom=state.camera.y+rect.height/state.camera.zoom+200;
  if(o.type==='road')return Math.max(o.x1,o.x2)>=left&&Math.min(o.x1,o.x2)<=right&&Math.max(o.y1,o.y2)>=top&&Math.min(o.y1,o.y2)<=bottom;
  const w=o.width||o.radius*2||20,h=o.height||o.radius*2||20;
  return o.x+w/2>=left&&o.x-w/2<=right&&o.y+h/2>=top&&o.y-h/2<=bottom;
}

function drawMinimap(){
  const w=minimap.width,h=minimap.height;
  miniCtx.clearRect(0,0,w,h);miniCtx.fillStyle='#151a18';miniCtx.fillRect(0,0,w,h);
  const sx=w/state.map.width,sy=h/state.map.height;
  miniCtx.strokeStyle='#4b5258';miniCtx.lineWidth=1;
  for(const road of state.map.roads){miniCtx.lineWidth=Math.max(2,road.width*sx);miniCtx.strokeStyle='#454b52';miniCtx.beginPath();miniCtx.moveTo(road.x1*sx,road.y1*sy);miniCtx.lineTo(road.x2*sx,road.y2*sy);miniCtx.stroke();}
  miniCtx.fillStyle='#91745d';for(const b of state.map.buildings)miniCtx.fillRect((b.x-b.width/2)*sx,(b.y-b.height/2)*sy,b.width*sx,b.height*sy);
  const rect=canvas.getBoundingClientRect();const vw=rect.width/state.camera.zoom,vh=rect.height/state.camera.zoom;
  miniCtx.strokeStyle='#d78e36';miniCtx.lineWidth=2;miniCtx.strokeRect(state.camera.x*sx,state.camera.y*sy,vw*sx,vh*sy);
  if(state.preview){miniCtx.fillStyle='#fff';miniCtx.beginPath();miniCtx.arc(state.player.x*sx,state.player.y*sy,3,0,Math.PI*2);miniCtx.fill();}
}

function hitTest(x,y){
  const order=[
    ...(!state.hiddenLayers.has('interactions')?[...state.map.interactions].reverse():[]),
    ...(!state.hiddenLayers.has('props')?[...state.map.props].reverse():[]),
    ...(!state.hiddenLayers.has('buildings')?[...state.map.buildings].reverse():[]),
    ...(!state.hiddenLayers.has('roads')?[...state.map.roads].reverse():[]),
    ...(!state.hiddenLayers.has('zones')?[...state.map.zones].filter(o=>(o.layer||'zones')==='zones').reverse():[]),
    ...(!state.hiddenLayers.has('lots')?[...state.map.zones].filter(o=>o.layer==='lots').reverse():[])
  ];
  for(const o of order)if(pointHitsObject(x,y,o))return o;
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
  const fields={x:0,y:0,width:0,height:0,rotation:0,roadWidth:0};
  if(o){
    if(o.type==='road'){
      fields.x=o.x1;fields.y=o.y1;fields.width=o.x2;fields.height=o.y2;fields.roadWidth=o.width;
    }else{
      fields.x=o.x??0;fields.y=o.y??0;fields.width=o.width??o.radius*2??0;fields.height=o.height??o.radius*2??0;fields.rotation=o.rotation??0;
    }
  }
  document.querySelectorAll('[data-field]').forEach(input=>{
    input.value=o?Math.round((fields[input.dataset.field]??0)*100)/100:'';
    input.disabled=!o||((input.dataset.field==='roadWidth')!== (o?.type==='road'));
  });
  $('#object-label').value=o?.label||'';$('#object-label').disabled=!o;
  $('#object-color').value=normalizeColor(o?.color||'#777777');$('#object-color').disabled=!o;
  $('#object-layer').value=o?.layer||'buildings';$('#object-layer').disabled=!o||o.type!=='zone';
  $('#object-collision').checked=!!o?.collision;$('#object-collision').disabled=!o;
  for(const id of ['duplicate-object','center-object','raise-object','lower-object','delete-object'])$(`#${id}`).disabled=!o;
}

function applyInspectorField(field,value){
  const o=state.selected;if(!o)return;
  const n=Number(value);if(!Number.isFinite(n))return;
  pushUndo();
  if(o.type==='road'){
    const map={x:'x1',y:'y1',width:'x2',height:'y2',roadWidth:'width'};
    if(map[field])o[map[field]]=field==='roadWidth'?Math.max(4,n):n;
  }else{
    if(field==='x'||field==='y'||field==='rotation')o[field]=n;
    if(field==='width'||field==='height'){
      if('radius' in o)o.radius=Math.max(2,n/2);
      else o[field]=Math.max(2,n);
    }
  }
  saveDraft();refreshInspector();
}

function applySimpleField(field,value){
  const o=state.selected;if(!o)return;pushUndo();o[field]=value;saveDraft();refreshInspector();
}

function changeSelectedLayer(layer){
  const o=state.selected;if(!o||o.layer===layer)return;
  const allowed={
    road:['roads'],
    building:['buildings'],
    prop:['props'],
    zone:['lots','zones'],
    interaction:['interactions']
  }[o.type]||[o.layer];
  if(!allowed.includes(layer)){
    $('#object-layer').value=o.layer;
    return say(`${o.type.toUpperCase()} objects stay on ${allowed.join(' / ')}.`);
  }
  pushUndo();
  o.layer=layer;
  saveDraft();refreshInspector();
}

function moveSelectedTo(worldX,worldY){
  const o=state.selected;if(!o)return;
  const p=snapPoint(worldX,worldY);
  if(o.type==='road'){
    const dx=p.x-state.dragObjectOffset.anchorX,dy=p.y-state.dragObjectOffset.anchorY;
    o.x1=state.dragObjectOffset.x1+dx;o.y1=state.dragObjectOffset.y1+dy;o.x2=state.dragObjectOffset.x2+dx;o.y2=state.dragObjectOffset.y2+dy;
  }else{
    o.x=clamp(p.x-state.dragObjectOffset.x,0,state.map.width);
    o.y=clamp(p.y-state.dragObjectOffset.y,0,state.map.height);
  }
}

function getDragOffset(o,x,y){
  if(o.type==='road')return {anchorX:x,anchorY:y,x1:o.x1,y1:o.y1,x2:o.x2,y2:o.y2};
  return {x:x-o.x,y:y-o.y};
}

function duplicateSelected(){
  const o=state.selected;if(!o)return;
  pushUndo();const copy=structuredCloneSafe(o);copy.id=newId(o.type);copy.label=`${o.label||o.type} copy`;
  if(o.type==='road'){copy.x1+=state.map.gridSize;copy.y1+=state.map.gridSize;copy.x2+=state.map.gridSize;copy.y2+=state.map.gridSize;}
  else{copy.x+=state.map.gridSize;copy.y+=state.map.gridSize;}
  collectionForLayer(copy.layer).push(copy);selectObject(copy);saveDraft();refreshCount();
}

function deleteSelected(){
  const o=state.selected;if(!o)return;
  pushUndo();removeFromCollections(o);state.selected=null;saveDraft();refreshInspector();refreshCount();say('Object deleted.');
}

function centerSelected(){
  const o=state.selected;if(!o)return;
  const center=o.type==='road'?{x:(o.x1+o.x2)/2,y:(o.y1+o.y2)/2}:{x:o.x,y:o.y};
  const rect=canvas.getBoundingClientRect();
  state.camera.x=center.x-rect.width/(2*state.camera.zoom);state.camera.y=center.y-rect.height/(2*state.camera.zoom);clampCamera();
}

function reorderSelected(delta){
  const o=state.selected;if(!o)return;const arr=collectionForLayer(o.layer);const i=arr.indexOf(o);if(i<0)return;
  const next=clamp(i+delta,0,arr.length-1);if(next===i)return;pushUndo();arr.splice(i,1);arr.splice(next,0,o);saveDraft();
}

function nudgeSelected(code,multiplier){
  const o=state.selected;if(!o)return;pushUndo();
  const step=state.map.gridSize*multiplier;
  const dx=code==='ArrowLeft'?-step:code==='ArrowRight'?step:0;
  const dy=code==='ArrowUp'?-step:code==='ArrowDown'?step:0;
  if(o.type==='road'){o.x1+=dx;o.x2+=dx;o.y1+=dy;o.y2+=dy;}
  else{o.x=clamp(o.x+dx,0,state.map.width);o.y=clamp(o.y+dy,0,state.map.height);}
  saveDraft();refreshInspector();
}

function applyMapSettings(){
  pushUndo();
  state.map.width=clamp(Number($('#map-width').value)||2048,512,16384);
  state.map.height=clamp(Number($('#map-height').value)||2048,512,16384);
  state.map.gridSize=clamp(Number($('#grid-size').value)||32,4,256);
  saveDraft();syncMapInputs();clampCamera();
}

function syncMapInputs(){
  $('#map-width').value=state.map.width;$('#map-height').value=state.map.height;$('#grid-size').value=state.map.gridSize;
  $('#map-title').textContent=state.map.name||'RiftCity Draft';
}

function clearMap(){
  pushUndo();
  state.map={format:'riftcity-2d-map',version:1,name:'RiftCity Draft',width:2048,height:2048,gridSize:32,playerSpawn:{x:1024,y:1024},roads:[],buildings:[],props:[],zones:[],interactions:[]};
  state.selected=null;syncMapInputs();saveDraft();refreshInspector();refreshCount();fitMap();say('Map cleared.');
}

function togglePreview(){
  state.preview=!state.preview;
  $('#preview-toggle').classList.toggle('active',state.preview);
  $('#preview-toggle').textContent=state.preview?'■ EDIT':'▶ PREVIEW';
  $('#preview-hud').hidden=!state.preview;
  $('#mobile-dpad').hidden=!state.preview;
  if(state.preview){
    state.player.x=state.map.playerSpawn?.x??state.map.width/2;state.player.y=state.map.playerSpawn?.y??state.map.height/2;
    state.selected=null;refreshInspector();$('#mode-label').textContent='PREVIEW';say('Preview mode: walk the city with WASD/arrows or the mobile pad.');
  }else{
    $('#mode-label').textContent=state.tool.toUpperCase();state.keys.clear();state.moveButtons.clear();say('Back in editor mode.');
  }
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
  $('#preview-position').textContent=`X ${Math.round(state.player.x)} · Y ${Math.round(state.player.y)}`;
  const near=nearestInteraction(state.player.x,state.player.y,65);
  $('#nearby-interaction').textContent=near?`Nearby: ${near.label||near.kind}`:'Walk near an interaction marker.';
  followPlayerCamera();
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
    }else{
      if(Math.hypot(x-o.x,y-o.y)<state.player.radius+(o.radius||10))return true;
    }
  }
  return false;
}

function followPlayerCamera(){
  const rect=canvas.getBoundingClientRect();
  const targetX=state.player.x-rect.width/(2*state.camera.zoom),targetY=state.player.y-rect.height/(2*state.camera.zoom);
  state.camera.x+=(targetX-state.camera.x)*.08;state.camera.y+=(targetY-state.camera.y)*.08;clampCamera();
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
  state.map=map;state.selected=null;state.player.x=map.playerSpawn.x;state.player.y=map.playerSpawn.y;
  syncMapInputs();refreshInspector();refreshCount();saveDraft();fitMap();say(`Loaded ${map.name} from ${source}.`);
}

function validateMap(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Map JSON must be an object.');
  if(raw.format!=='riftcity-2d-map')throw new Error('Expected format "riftcity-2d-map".');
  const width=clampNumber(raw.width,512,16384,'width'),height=clampNumber(raw.height,512,16384,'height'),gridSize=clampNumber(raw.gridSize,4,256,'gridSize');
  const map={format:'riftcity-2d-map',version:1,name:String(raw.name||'RiftCity Draft').slice(0,80),width,height,gridSize,playerSpawn:{x:width/2,y:height/2},roads:[],buildings:[],props:[],zones:[],interactions:[]};
  if(raw.playerSpawn){map.playerSpawn={x:clampNumber(raw.playerSpawn.x,0,width,'playerSpawn.x'),y:clampNumber(raw.playerSpawn.y,0,height,'playerSpawn.y')};}
  for(const key of ['roads','buildings','props','zones','interactions']){
    if(!Array.isArray(raw[key]))continue;
    if(raw[key].length>10000)throw new Error(`${key} contains too many objects.`);
    map[key]=raw[key].map((o,index)=>sanitizeObject(o,key,index,width,height));
  }
  return map;
}

function sanitizeObject(o,key,index,width,height){
  if(!o||typeof o!=='object')throw new Error(`${key}[${index}] must be an object.`);
  const type={roads:'road',buildings:'building',props:'prop',zones:'zone',interactions:'interaction'}[key];
  const base={...o,id:String(o.id||newId(type)).slice(0,100),type,layer:o.layer||key,label:String(o.label||o.kind||type).slice(0,80),color:normalizeColor(o.color||'#777777'),collision:!!o.collision};
  if(type==='road')return {...base,x1:clampNumber(o.x1,0,width,`${key}[${index}].x1`),y1:clampNumber(o.y1,0,height,`${key}[${index}].y1`),x2:clampNumber(o.x2,0,width,`${key}[${index}].x2`),y2:clampNumber(o.y2,0,height,`${key}[${index}].y2`),width:clampNumber(o.width,4,512,`${key}[${index}].width`)};
  if(type==='building'||type==='zone')return {...base,kind:String(o.kind||type),x:clampNumber(o.x,0,width,`${key}[${index}].x`),y:clampNumber(o.y,0,height,`${key}[${index}].y`),width:clampNumber(o.width,2,2048,`${key}[${index}].width`),height:clampNumber(o.height,2,2048,`${key}[${index}].height`),rotation:Number(o.rotation)||0};
  return {...base,kind:String(o.kind||type),x:clampNumber(o.x,0,width,`${key}[${index}].x`),y:clampNumber(o.y,0,height,`${key}[${index}].y`),radius:clampNumber(o.radius||12,2,256,`${key}[${index}].radius`),rotation:Number(o.rotation)||0};
}

function exportMap(){
  const text=JSON.stringify(state.map,null,2);
  const blob=new Blob([text],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`${slug(state.map.name||'riftcity-map')}.map.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  say('Map JSON exported.');
}

function saveDraft(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state.map));}catch(_){}
  refreshCount();
}

function loadDraft(){
  try{
    const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    return raw?.format==='riftcity-2d-map'?raw:null;
  }catch(_){return null;}
}

function pushUndo(){
  const snap=JSON.stringify(state.map);
  if(state.undo.at(-1)!==snap)state.undo.push(snap);
  if(state.undo.length>60)state.undo.shift();
  state.redo.length=0;
}

function undo(){
  if(!state.undo.length)return say('Nothing to undo.');
  state.redo.push(JSON.stringify(state.map));state.map=JSON.parse(state.undo.pop());state.selected=null;syncMapInputs();refreshInspector();saveDraft();say('Undo.');
}
function redo(){
  if(!state.redo.length)return say('Nothing to redo.');
  state.undo.push(JSON.stringify(state.map));state.map=JSON.parse(state.redo.pop());state.selected=null;syncMapInputs();refreshInspector();saveDraft();say('Redo.');
}

function collectionForLayer(layer){
  const map={roads:state.map.roads,lots:state.map.zones,buildings:state.map.buildings,props:state.map.props,zones:state.map.zones,interactions:state.map.interactions};
  return map[layer]||state.map.props;
}
function removeFromCollections(o){for(const arr of [state.map.roads,state.map.buildings,state.map.props,state.map.zones,state.map.interactions]){const i=arr.indexOf(o);if(i>=0)arr.splice(i,1);}}
function getPaletteItem(tool,id){return (PALETTES[tool]||[]).find(item=>item.id===id)||(PALETTES[tool]||[])[0];}
function createPointObject(tool,item,x,y){
  return {id:newId(tool),type:tool,kind:item.id,layer:tool==='prop'?'props':'interactions',x,y,radius:item.radius||12,rotation:0,label:item.label,color:item.color,collision:!!item.collision};
}
function newId(prefix){return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;}
function refreshCount(){const count=state.map.roads.length+state.map.buildings.length+state.map.props.length+state.map.zones.length+state.map.interactions.length;$('#map-object-count').textContent=`${count} objects`;}
function say(message){status.textContent=message;}
function rotatePoint(x,y,a){const c=Math.cos(a),s=Math.sin(a);return{x:x*c-y*s,y:x*s+y*c};}
function distanceToSegment(px,py,x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1;if(dx===0&&dy===0)return Math.hypot(px-x1,py-y1);const t=clamp(((px-x1)*dx+(py-y1)*dy)/(dx*dx+dy*dy),0,1);return Math.hypot(px-(x1+t*dx),py-(y1+t*dy));}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function clampNumber(value,min,max,label){const n=Number(value);if(!Number.isFinite(n))throw new Error(`${label} must be numeric.`);return clamp(n,min,max);}
function normalizeColor(value){return /^#[0-9a-f]{6}$/i.test(String(value))?String(value):'#777777';}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function slug(value){return String(value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'riftcity-map';}
function structuredCloneSafe(value){return window.structuredClone?structuredClone(value):JSON.parse(JSON.stringify(value));}
function shade(hex,amount){const c=normalizeColor(hex).slice(1);let r=parseInt(c.slice(0,2),16),g=parseInt(c.slice(2,4),16),b=parseInt(c.slice(4,6),16);const f=amount<0?1+amount:1-amount;r=clamp(Math.round(r*f),0,255);g=clamp(Math.round(g*f),0,255);b=clamp(Math.round(b*f),0,255);return`rgb(${r},${g},${b})`;}
function roundRect(context,x,y,w,h,r){const rr=Math.min(r,Math.abs(w)/2,Math.abs(h)/2);context.beginPath();context.moveTo(x+rr,y);context.arcTo(x+w,y,x+w,y+h,rr);context.arcTo(x+w,y+h,x,y+h,rr);context.arcTo(x,y+h,x,y,rr);context.arcTo(x,y,x+w,y,rr);context.closePath();}
