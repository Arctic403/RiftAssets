export async function loadModelAsset(B,scene,shadowGenerator,definition,{overrides=[]}={}) {
  if(!definition?.modelUrl)throw new Error('Model asset is missing modelUrl.');
  if(!B.SceneLoader?.ImportMeshAsync)throw new Error('Babylon model loaders are unavailable.');

  const url=new URL(definition.modelUrl,window.location.href);
  const slash=url.href.lastIndexOf('/');
  const rootUrl=url.href.slice(0,slash+1);
  const filename=url.href.slice(slash+1);
  const result=await B.SceneLoader.ImportMeshAsync('',rootUrl,filename,scene);

  const meshes=(result.meshes||[]).filter(mesh=>(mesh.getTotalVertices?.()||0)>0);
  const records=new Map();
  const used=new Set();
  const overrideMap=new Map((overrides||[]).map(part=>[part.id,part]));

  for(const mesh of meshes){
    const id=uniqueId(slug(mesh.name||mesh.id||'mesh'),used);
    used.add(id);
    mesh.metadata={...(mesh.metadata||{}),assetPartId:id,modelMesh:true};

    const material=mesh.material||null;
    const part={
      id,
      name:cleanName(mesh.name||id),
      shape:'model-mesh',
      color:readColor(material),
      position:[round(mesh.position.x),round(mesh.position.y),round(mesh.position.z)],
      rotation:[
        round(mesh.rotation.x*180/Math.PI),
        round(mesh.rotation.y*180/Math.PI),
        round(mesh.rotation.z*180/Math.PI)
      ],
      size:[round(mesh.scaling.x),round(mesh.scaling.y),round(mesh.scaling.z)],
      metallic:readNumber(material?.metallic,0),
      roughness:readNumber(material?.roughness,.8),
      hidden:false,
      modelMesh:true
    };

    const saved=overrideMap.get(id);
    if(saved)applyOverride(B,mesh,material,saved);

    // Read back after override.
    part.position=[round(mesh.position.x),round(mesh.position.y),round(mesh.position.z)];
    part.rotation=[
      round(mesh.rotation.x*180/Math.PI),
      round(mesh.rotation.y*180/Math.PI),
      round(mesh.rotation.z*180/Math.PI)
    ];
    part.size=[round(mesh.scaling.x),round(mesh.scaling.y),round(mesh.scaling.z)];
    part.color=saved?.color||readColor(material);
    part.metallic=saved?.metallic??readNumber(material?.metallic,0);
    part.roughness=saved?.roughness??readNumber(material?.roughness,.8);
    part.hidden=saved?.hidden===true;
    mesh.setEnabled(!part.hidden);

    mesh.receiveShadows=true;
    shadowGenerator?.addShadowCaster(mesh);
    records.set(id,{part,mesh,material});
  }

  const allNodes=[
    ...(result.meshes||[]),
    ...(result.transformNodes||[])
  ];

  return {
    model:true,
    records,
    parts:[...records.values()].map(record=>record.part),
    getRecord(id){return records.get(id)||null;},
    getMeshes(){return [...records.values()].map(record=>record.mesh);},
    getBounds(){
      const boxes=[...records.values()].map(record=>record.mesh.getBoundingInfo?.()?.boundingBox).filter(Boolean);
      if(!boxes.length)return null;
      let min=boxes[0].minimumWorld.clone(),max=boxes[0].maximumWorld.clone();
      for(const box of boxes.slice(1)){
        min=B.Vector3.Minimize(min,box.minimumWorld);
        max=B.Vector3.Maximize(max,box.maximumWorld);
      }
      return {min,max,center:min.add(max).scale(.5),size:max.subtract(min)};
    },
    dispose(){
      for(const node of allNodes.reverse()){
        try{node.dispose?.(false,false);}catch(_){}
      }
      records.clear();
    }
  };
}

function applyOverride(B,mesh,material,part){
  const p=vector3(part.position,[mesh.position.x,mesh.position.y,mesh.position.z]);
  const r=vector3(part.rotation,[
    mesh.rotation.x*180/Math.PI,
    mesh.rotation.y*180/Math.PI,
    mesh.rotation.z*180/Math.PI
  ]);
  const s=vector3(part.size,[mesh.scaling.x,mesh.scaling.y,mesh.scaling.z]);
  mesh.position.set(...p);
  mesh.rotation.set(...r.map(deg=>deg*Math.PI/180));
  mesh.scaling.set(...s.map(value=>Math.max(.01,value)));
  mesh.setEnabled(part.hidden!==true);
  if(material&&/^#[0-9a-f]{6}$/i.test(String(part.color||''))){
    if('albedoColor' in material)material.albedoColor=B.Color3.FromHexString(part.color);
    else if('diffuseColor' in material)material.diffuseColor=B.Color3.FromHexString(part.color);
  }
  if(material&&Number.isFinite(Number(part.metallic))&&'metallic' in material)material.metallic=Math.max(0,Math.min(1,Number(part.metallic)));
  if(material&&Number.isFinite(Number(part.roughness))&&'roughness' in material)material.roughness=Math.max(0,Math.min(1,Number(part.roughness)));
}
function readColor(material){
  const c=material?.albedoColor||material?.diffuseColor;
  if(!c)return '#777777';
  const byte=v=>Math.max(0,Math.min(255,Math.round(v*255))).toString(16).padStart(2,'0');
  return `#${byte(c.r)}${byte(c.g)}${byte(c.b)}`;
}
function readNumber(value,fallback){const n=Number(value);return Number.isFinite(n)?n:fallback;}
function vector3(value,fallback){
  if(!Array.isArray(value))return [...fallback];
  return [0,1,2].map(index=>{
    const n=Number(value[index]);
    return Number.isFinite(n)?n:fallback[index];
  });
}
function slug(value){
  return String(value||'mesh').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'mesh';
}
function uniqueId(base,used){
  let id=base,index=2;
  while(used.has(id))id=`${base}-${index++}`;
  return id;
}
function cleanName(value){return String(value||'Mesh').replace(/[_-]+/g,' ').replace(/\b\w/g,ch=>ch.toUpperCase());}
function round(value){return Math.round(Number(value||0)*1000)/1000;}
