export function buildAsset(B,scene,shadowGenerator,definition,{onPartMesh}={}) {
  const root=new B.TransformNode(`asset-root-${definition.id}`,scene);
  const records=new Map();

  for(const part of definition.parts||[]){
    const mesh=createPartMesh(B,scene,part);
    mesh.parent=root;
    mesh.metadata={...(mesh.metadata||{}),assetPartId:part.id};
    mesh.position.set(...vector3(part.position,[0,0,0]));
    const rotation=vector3(part.rotation,[0,0,0]).map(deg=>deg*Math.PI/180);
    mesh.rotation.set(...rotation);
    const scale=vector3(part.size,[1,1,1]);
    applyShapeScale(mesh,part.shape,scale);
    mesh.setEnabled(part.hidden!==true);

    const material=new B.PBRMaterial(`mat-${definition.id}-${part.id}`,scene);
    material.albedoColor=B.Color3.FromHexString(normalizeHex(part.color));
    material.metallic=clamp(Number(part.metallic??0),0,1);
    material.roughness=clamp(Number(part.roughness??.82),0,1);
    mesh.material=material;

    mesh.receiveShadows=true;
    shadowGenerator?.addShadowCaster(mesh);
    records.set(part.id,{part,mesh,material});
    onPartMesh?.(mesh,part);
  }

  return {
    root,
    records,
    getRecord(id){return records.get(id)||null;},
    getMeshes(){return [...records.values()].map(record=>record.mesh);},
    dispose(){
      for(const {mesh,material} of records.values()){
        try{mesh.dispose(false,false);}catch(_){}
        try{material.dispose();}catch(_){}
      }
      records.clear();
      try{root.dispose(false,false);}catch(_){}
    }
  };
}

export function syncPartFromMesh(part,mesh) {
  part.position=[round(mesh.position.x),round(mesh.position.y),round(mesh.position.z)];
  part.rotation=[
    round(mesh.rotation.x*180/Math.PI),
    round(mesh.rotation.y*180/Math.PI),
    round(mesh.rotation.z*180/Math.PI)
  ];
  part.size=readShapeScale(mesh,part.shape);
}

export function applyPartToRecord(B,part,record) {
  if(!record)return;
  const {mesh,material}=record;
  mesh.position.set(...vector3(part.position,[0,0,0]));
  mesh.rotation.set(...vector3(part.rotation,[0,0,0]).map(deg=>deg*Math.PI/180));
  applyShapeScale(mesh,part.shape,vector3(part.size,[1,1,1]));
  mesh.setEnabled(part.hidden!==true);
  material.albedoColor=B.Color3.FromHexString(normalizeHex(part.color));
  material.metallic=clamp(Number(part.metallic??0),0,1);
  material.roughness=clamp(Number(part.roughness??.82),0,1);
}

export function assetStats(assetInstance) {
  let meshes=0,vertices=0,triangles=0;
  for(const mesh of assetInstance?.getMeshes?.()||[]){
    if(mesh.isDisposed?.())continue;
    meshes++;
    vertices+=mesh.getTotalVertices?.()||0;
    const indices=mesh.getIndices?.();
    triangles+=indices?Math.floor(indices.length/3):0;
  }
  return {meshes,vertices,triangles};
}

function createPartMesh(B,scene,part){
  const shape=part.shape||'box';
  if(shape==='cylinder'){
    return B.MeshBuilder.CreateCylinder(`part-${part.id}`,{
      height:1,diameter:1,tessellation:12
    },scene);
  }
  if(shape==='sphere'){
    return B.MeshBuilder.CreateSphere(`part-${part.id}`,{
      diameter:1,segments:10
    },scene);
  }
  return B.MeshBuilder.CreateBox(`part-${part.id}`,{size:1},scene);
}

function applyShapeScale(mesh,shape,size){
  // Primitive meshes are authored as unit shapes, so scaling is the editable size.
  mesh.scaling.set(
    Math.max(.01,Number(size[0])||1),
    Math.max(.01,Number(size[1])||1),
    Math.max(.01,Number(size[2])||1)
  );
}

function readShapeScale(mesh){
  return [round(mesh.scaling.x),round(mesh.scaling.y),round(mesh.scaling.z)];
}

function vector3(value,fallback){
  if(!Array.isArray(value))return [...fallback];
  return [0,1,2].map(index=>{
    const number=Number(value[index]);
    return Number.isFinite(number)?number:fallback[index];
  });
}
function normalizeHex(value){
  const text=String(value||'#777777').trim();
  return /^#[0-9a-f]{6}$/i.test(text)?text:'#777777';
}
function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
function round(value){return Math.round(Number(value||0)*1000)/1000;}
