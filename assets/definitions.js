const part=(id,name,shape,color,position=[0,0,0],size=[1,1,1],rotation=[0,0,0],extra={})=>({
  id,name,shape,color,position,size,rotation,
  metallic:extra.metallic??0,
  roughness:extra.roughness??0.82,
  hidden:false,
  ...extra
});

const box=(id,name,color,p,s,r=[0,0,0],extra={})=>part(id,name,'box',color,p,s,r,extra);
const cyl=(id,name,color,p,s,r=[0,0,0],extra={})=>part(id,name,'cylinder',color,p,s,r,extra);
const sphere=(id,name,color,p,s,r=[0,0,0],extra={})=>part(id,name,'sphere',color,p,s,r,extra);

function wheels(prefix,zFront,zRear,x=0.96,y=0.38,color='#171a1e'){
  return [
    cyl(`${prefix}-wheel-fl`,'Front left wheel',color,[-x,y,zFront],[0.62,0.28,0.62],[0,0,90],{roughness:.95}),
    cyl(`${prefix}-wheel-fr`,'Front right wheel',color,[x,y,zFront],[0.62,0.28,0.62],[0,0,90],{roughness:.95}),
    cyl(`${prefix}-wheel-rl`,'Rear left wheel',color,[-x,y,zRear],[0.62,0.28,0.62],[0,0,90],{roughness:.95}),
    cyl(`${prefix}-wheel-rr`,'Rear right wheel',color,[x,y,zRear],[0.62,0.28,0.62],[0,0,90],{roughness:.95})
  ];
}

function windows(prefix,width,depth,floors=3,color='#315064'){
  const out=[];
  for(let floor=0;floor<floors;floor++){
    const y=3.2+floor*2.35;
    for(const x of [-width*.28,0,width*.28]){
      out.push(box(`${prefix}-window-${floor}-${String(x).replace('.','_')}`,'Window',color,[x,y,depth/2+.08],[1.45,1.05,.12],[0,0,0],{metallic:.18,roughness:.25}));
    }
  }
  return out;
}

const assets=[
  {
    id:'corner-store-01',name:'Corner Store 01',category:'Buildings',
    description:'Compact neighborhood storefront with glass frontage, awning, signage and rooftop equipment.',
    cameraRadius:18,
    parts:[
      box('shell','Main masonry shell','#6f665d',[0,2.75,0],[10.8,5.5,8.2]),
      box('parapet','Roof parapet','#514b46',[0,5.72,0],[11.2,.5,8.6]),
      box('storefront','Glass storefront','#24485a',[0,1.8,4.14],[6.8,3.25,.14],[0,0,0],{metallic:.25,roughness:.22}),
      box('door','Front door','#1b2f39',[2.95,1.55,4.22],[1.35,2.95,.12],[0,0,0],{metallic:.2,roughness:.25}),
      box('awning','Fabric awning','#ba6e31',[0,3.55,4.65],[7.8,.3,1.15],[-8,0,0]),
      box('sign','Store sign','#d6a34b',[0,4.48,4.25],[6.2,.78,.18]),
      box('side-door','Side service door','#342f2b',[-5.48,1.45,.7],[.14,2.8,1.6]),
      box('ac-base','Roof AC','#777d80',[1.5,6.12,-1.2],[2.5,.65,1.7]),
      box('ac-top','Roof AC fan','#4a4f52',[1.5,6.5,-1.2],[1.5,.25,1.2]),
      box('utility','Utility box','#555b5c',[-4.3,1.0,-4.15],[1.2,1.6,.3])
    ]
  },
  {
    id:'apartment-03f-01',name:'3-Storey Apartment',category:'Buildings',
    description:'Small urban apartment with balconies, repeated windows and a rooftop utility block.',
    cameraRadius:22,
    parts:[
      box('shell','Apartment shell','#5d6268',[0,5.25,0],[11.5,10.5,8.5]),
      box('entry','Entry recess','#29323a',[0,1.55,4.32],[2.2,3.0,.18]),
      box('roof-trim','Roof trim','#3d4247',[0,10.7,0],[12,.45,9]),
      box('roof-unit','Roof utility','#676e72',[-2.6,11.3,-1.1],[3.1,.8,2.2]),
      ...windows('apt',11.5,8.5,3),
      box('balcony-1','Balcony lower','#888276',[3.8,3.35,4.75],[3.1,.22,1.15]),
      box('balcony-2','Balcony upper','#888276',[3.8,5.7,4.75],[3.1,.22,1.15]),
      box('balcony-rail-1','Balcony rail','#2f3337',[3.8,3.92,5.24],[3.1,.85,.1],[],{metallic:.45,roughness:.4}),
      box('balcony-rail-2','Balcony rail','#2f3337',[3.8,6.28,5.24],[3.1,.85,.1],[],{metallic:.45,roughness:.4}),
      box('fire-escape','Fire escape landing','#31353a',[-5.85,6.3,.5],[.16,5.4,3.2],[0,0,0],{metallic:.5,roughness:.42})
    ]
  },
  {
    id:'office-midrise-01',name:'Mid-Rise Office',category:'Buildings',
    description:'Five-storey concrete-and-glass office building with lobby canopy and rooftop plant.',
    cameraRadius:28,
    parts:[
      box('core','Office core','#45494d',[0,8.0,0],[13,16,10]),
      box('glass-front','Curtain glass','#203f50',[0,8.3,5.06],[9.8,14,.16],[0,0,0],{metallic:.32,roughness:.2}),
      box('left-column','Left concrete column','#77736d',[-5.55,8,5.2],[1.0,16.2,.35]),
      box('right-column','Right concrete column','#77736d',[5.55,8,5.2],[1.0,16.2,.35]),
      box('canopy','Lobby canopy','#b17337',[0,3.2,5.85],[6.8,.28,1.65]),
      box('lobby','Lobby door','#172d38',[0,1.65,5.18],[3.4,3.1,.18],[0,0,0],{metallic:.25,roughness:.18}),
      box('roof-line','Roof line','#2d3134',[0,16.3,0],[13.5,.55,10.5]),
      box('plant-1','Roof plant','#676d70',[-2.8,17.1,-1.0],[3.4,1.0,2.5]),
      box('plant-2','Roof plant','#565c60',[2.4,16.9,-1.4],[2.6,.75,2.0])
    ]
  },
  {
    id:'warehouse-01',name:'Warehouse 01',category:'Buildings',
    description:'Industrial warehouse with loading doors, side office, vents and a shallow roof profile.',
    cameraRadius:25,
    parts:[
      box('shell','Warehouse shell','#565b5e',[0,4.0,0],[16,8,12]),
      box('roof','Warehouse roof','#3d4245',[0,8.25,0],[16.6,.5,12.6]),
      box('loading-1','Loading bay 1','#252b30',[-4.1,2.4,6.06],[3.3,4.5,.16]),
      box('loading-2','Loading bay 2','#252b30',[.1,2.4,6.06],[3.3,4.5,.16]),
      box('loading-3','Loading bay 3','#252b30',[4.3,2.4,6.06],[3.3,4.5,.16]),
      box('dock','Loading dock','#77736b',[0,.38,6.8],[13.5,.7,1.4]),
      box('office','Side office','#6c6257',[-6.6,2.15,-4.75],[5.0,4.3,3.0]),
      box('office-glass','Office windows','#2a4a59',[-6.6,2.4,-6.29],[3.4,1.35,.12],[],{metallic:.18,roughness:.25}),
      box('vent-1','Roof vent','#777d80',[-2.5,8.85,-1.2],[2.4,.7,1.8]),
      box('vent-2','Roof vent','#777d80',[2.2,8.85,-1.2],[2.4,.7,1.8])
    ]
  },
  {
    id:'sedan-01',name:'Sedan 01',category:'Vehicles',
    description:'Compact four-door sedan with proper hood, trunk, cabin, windows, lights and wheels.',
    cameraRadius:9,
    parts:[
      box('lower','Lower body','#8b3f3a',[0,.72,0],[1.9,.65,4.3]),
      box('hood','Hood','#9c4943',[0,1.04,1.42],[1.78,.28,1.2],[-4,0,0]),
      box('trunk','Trunk','#7d3935',[0,1.0,-1.65],[1.75,.3,.78],[3,0,0]),
      box('cabin','Cabin','#263a46',[0,1.35,-.18],[1.58,.78,1.9],[0,0,0],{metallic:.18,roughness:.2}),
      box('front-glass','Windshield','#1b3441',[0,1.47,.81],[1.48,.64,.12],[-22,0,0],{metallic:.25,roughness:.15}),
      box('rear-glass','Rear glass','#1b3441',[0,1.46,-1.14],[1.45,.6,.12],[22,0,0],{metallic:.25,roughness:.15}),
      box('head-left','Left headlight','#eee0b1',[-.63,.81,2.18],[.5,.23,.08],[],{roughness:.15}),
      box('head-right','Right headlight','#eee0b1',[.63,.81,2.18],[.5,.23,.08],[],{roughness:.15}),
      box('bumper','Front bumper','#25282b',[0,.56,2.22],[1.75,.2,.12]),
      ...wheels('sedan',1.35,-1.35)
    ]
  },
  {
    id:'cargo-van-01',name:'Cargo Van 01',category:'Vehicles',
    description:'Tall city cargo van with separate cab, cargo body, windows and wheel set.',
    cameraRadius:10,
    parts:[
      box('body','Cargo body','#c1c3c2',[0,1.38,-.55],[2.05,2.2,3.5]),
      box('cab','Cab','#b8bab9',[0,1.25,1.45],[2.0,1.95,1.55]),
      box('windshield','Windshield','#24424f',[0,1.6,2.22],[1.65,.75,.12],[-9,0,0],{metallic:.18,roughness:.18}),
      box('rear-door','Rear doors','#a8aaa9',[0,1.42,-2.34],[1.8,1.95,.12]),
      box('bumper','Front bumper','#303338',[0,.58,2.28],[1.9,.22,.18]),
      box('roof','Roof cap','#d0d1cf',[0,2.55,-.15],[2.08,.16,4.8]),
      ...wheels('van',1.45,-1.45,1.02,.42)
    ]
  },
  {
    id:'pickup-01',name:'Pickup 01',category:'Vehicles',
    description:'Utility pickup with cab, open bed, tailgate and chunky low-poly wheels.',
    cameraRadius:10,
    parts:[
      box('chassis','Lower chassis','#5a6268',[0,.68,0],[2.0,.55,4.6]),
      box('cab','Cab','#64717a',[0,1.38,1.0],[1.9,1.45,1.8]),
      box('windshield','Windshield','#24424f',[0,1.65,1.93],[1.55,.65,.12],[-12,0,0],{metallic:.2,roughness:.18}),
      box('bed-floor','Bed floor','#3a4045',[0,.9,-1.35],[1.8,.2,1.8]),
      box('bed-left','Bed side left','#5a6268',[-.92,1.32,-1.35],[.16,.85,1.9]),
      box('bed-right','Bed side right','#5a6268',[.92,1.32,-1.35],[.16,.85,1.9]),
      box('tailgate','Tailgate','#566068',[0,1.3,-2.28],[1.8,.8,.14]),
      ...wheels('pickup',1.45,-1.45,1.02,.4)
    ]
  },
  {
    id:'bench-01',name:'Bench',category:'Street Props',description:'Simple slatted city bench with metal legs.',cameraRadius:6,
    parts:[
      box('seat','Wood seat','#71533d',[0,.78,0],[2.4,.18,.62]),
      box('back','Wood back','#71533d',[0,1.28,-.28],[2.4,.82,.16],[-8,0,0]),
      box('leg-left','Left leg','#2f3438',[-.78,.4,0],[.16,.8,.5],[],{metallic:.45,roughness:.4}),
      box('leg-right','Right leg','#2f3438',[.78,.4,0],[.16,.8,.5],[],{metallic:.45,roughness:.4})
    ]
  },
  {
    id:'dumpster-01',name:'Dumpster',category:'Street Props',description:'Commercial dumpster with body, split lids and wheel casters.',cameraRadius:6,
    parts:[
      box('body','Dumpster body','#3f594c',[0,.85,0],[1.8,1.45,1.25]),
      box('lid-left','Left lid','#2f4239',[-.46,1.62,0],[.84,.12,1.28],[0,0,-5]),
      box('lid-right','Right lid','#2f4239',[.46,1.62,0],[.84,.12,1.28],[0,0,5]),
      ...[-.65,.65].flatMap((x,i)=>[-.42,.42].map((z,j)=>cyl(`caster-${i}-${j}`,'Caster','#1c1e20',[x,.18,z],[.26,.18,.26],[90,0,0])))
    ]
  },
  {
    id:'hydrant-01',name:'Fire Hydrant',category:'Street Props',description:'Low-poly hydrant with central barrel, cap and side outlets.',cameraRadius:4,
    parts:[
      cyl('barrel','Main barrel','#b83f35',[0,.62,0],[.58,1.2,.58]),
      sphere('cap','Top cap','#ca4b3f',[0,1.33,0],[.7,.4,.7]),
      cyl('left','Left outlet','#9b322b',[-.43,.72,0],[.36,.34,.36],[0,0,90]),
      cyl('right','Right outlet','#9b322b',[.43,.72,0],[.36,.34,.36],[0,0,90]),
      cyl('base','Base flange','#8d302a',[0,.15,0],[.82,.22,.82])
    ]
  },
  {
    id:'mailbox-01',name:'Street Mailbox',category:'Street Props',description:'Freestanding street mailbox with rounded top impression and pedestal.',cameraRadius:5,
    parts:[
      box('body','Mailbox body','#315a75',[0,1.15,0],[1.0,1.55,.78]),
      cyl('top','Rounded top','#315a75',[0,1.92,0],[1.0,.78,1.0],[0,0,90]),
      box('slot','Mail slot','#162c39',[0,1.38,.41],[.65,.12,.06]),
      box('post','Pedestal','#2b3338',[0,.35,0],[.42,.7,.42])
    ]
  },
  {
    id:'bus-stop-01',name:'Bus Stop',category:'Street Props',description:'Glass-and-metal shelter with roof, bench and route sign.',cameraRadius:8,
    parts:[
      box('roof','Shelter roof','#30363b',[0,2.55,0],[3.8,.18,1.7],[],{metallic:.45,roughness:.35}),
      box('back-glass','Back glass','#315263',[0,1.45,-.78],[3.5,2.0,.1],[],{metallic:.2,roughness:.2}),
      box('side-glass','Side glass','#315263',[-1.72,1.45,0],[.1,2.0,1.5],[],{metallic:.2,roughness:.2}),
      box('bench','Bench','#6d533d',[.35,.72,-.18],[2.4,.18,.55]),
      box('sign-pole','Route pole','#30363b',[2.3,1.55,0],[.12,3.1,.12],[],{metallic:.5,roughness:.4}),
      box('sign','Route sign','#d68d35',[2.3,2.65,0],[.58,.85,.12])
    ]
  },
  {
    id:'traffic-light-01',name:'Traffic Light',category:'Street Props',description:'Intersection traffic signal with mast arm, housing and three signal lenses.',cameraRadius:7,
    parts:[
      cyl('pole','Pole','#33383d',[0,2.3,0],[.15,4.6,.15],[],{metallic:.55,roughness:.38}),
      box('arm','Mast arm','#33383d',[1.65,4.25,0],[3.4,.14,.14],[],{metallic:.55,roughness:.38}),
      box('housing','Signal housing','#202428',[3.12,3.72,0],[.5,1.45,.42]),
      sphere('red','Red lens','#c9453f',[3.12,4.15,.23],[.25,.25,.12],[],{roughness:.18}),
      sphere('amber','Amber lens','#d8a43b',[3.12,3.72,.23],[.25,.25,.12],[],{roughness:.18}),
      sphere('green','Green lens','#4e9b5c',[3.12,3.29,.23],[.25,.25,.12],[],{roughness:.18})
    ]
  },
  {
    id:'streetlight-modern-01',name:'Modern Streetlight',category:'Street Props',description:'Tall modern streetlight with angled arm and emissive lamp head.',cameraRadius:7,
    parts:[
      cyl('pole','Pole','#353b40',[0,2.5,0],[.14,5,.14],[],{metallic:.55,roughness:.38}),
      box('arm','Lamp arm','#353b40',[.58,4.7,0],[1.25,.12,.12],[0,0,-12],{metallic:.55,roughness:.38}),
      box('head','Lamp head','#25292c',[1.17,4.82,0],[.7,.18,.38],[],{metallic:.5,roughness:.3}),
      box('lamp','Light panel','#f0d89b',[1.17,4.7,0],[.52,.04,.28],[],{roughness:.12})
    ]
  },
  {
    id:'urban-tree-01',name:'Urban Tree',category:'Nature',description:'Low-poly city tree with tapered trunk and clustered foliage.',cameraRadius:8,
    parts:[
      cyl('trunk','Trunk','#604532',[0,1.55,0],[.48,3.1,.48],[],{roughness:1}),
      sphere('crown-main','Main foliage','#36533c',[0,4.15,0],[2.8,2.4,2.6],[],{roughness:1}),
      sphere('crown-left','Left foliage','#304b36',[-1.05,3.9,.15],[1.8,1.65,1.75],[],{roughness:1}),
      sphere('crown-right','Right foliage','#3d5d42',[1.05,4.0,-.15],[1.9,1.75,1.8],[],{roughness:1})
    ]
  }
];

const REBUILT_APARTMENT = {
  "id": "apartment-03f-01",
  "name": "3-Storey Apartment — Rebuilt",
  "category": "Buildings",
  "description": "Rebuilt low-poly urban apartment with framed inset windows, real balcony rails and supports, recessed entry, roof equipment, side windows, facade trim and a detailed fire escape.",
  "cameraRadius": 24,
  "parts": [
    {
      "id": "shell",
      "name": "Apartment masonry shell",
      "shape": "box",
      "color": "#625a52",
      "position": [
        0,
        5.15,
        0
      ],
      "size": [
        12.2,
        10.3,
        8.8
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.92,
      "hidden": false
    },
    {
      "id": "ground-base",
      "name": "Dark ground-floor base",
      "shape": "box",
      "color": "#383d42",
      "position": [
        0,
        1.15,
        4.44
      ],
      "size": [
        12.35,
        2.3,
        0.32
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.88,
      "hidden": false
    },
    {
      "id": "roof-cap",
      "name": "Roof cap",
      "shape": "box",
      "color": "#454a4e",
      "position": [
        0,
        10.48,
        0
      ],
      "size": [
        12.65,
        0.38,
        9.25
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.9,
      "hidden": false
    },
    {
      "id": "parapet-front",
      "name": "Front parapet",
      "shape": "box",
      "color": "#4d4742",
      "position": [
        0,
        10.95,
        4.32
      ],
      "size": [
        12.5,
        0.72,
        0.35
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.95,
      "hidden": false
    },
    {
      "id": "parapet-back",
      "name": "Rear parapet",
      "shape": "box",
      "color": "#4d4742",
      "position": [
        0,
        10.95,
        -4.32
      ],
      "size": [
        12.5,
        0.72,
        0.35
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.95,
      "hidden": false
    },
    {
      "id": "parapet-left",
      "name": "Left parapet",
      "shape": "box",
      "color": "#4d4742",
      "position": [
        -6.08,
        10.95,
        0
      ],
      "size": [
        0.35,
        0.72,
        8.4
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.95,
      "hidden": false
    },
    {
      "id": "parapet-right",
      "name": "Right parapet",
      "shape": "box",
      "color": "#4d4742",
      "position": [
        6.08,
        10.95,
        0
      ],
      "size": [
        0.35,
        0.72,
        8.4
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.95,
      "hidden": false
    },
    {
      "id": "facade-column-m4_15",
      "name": "Facade column",
      "shape": "box",
      "color": "#77736d",
      "position": [
        -4.15,
        6.45,
        4.56
      ],
      "size": [
        0.28,
        7.55,
        0.3
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.86,
      "hidden": false
    },
    {
      "id": "facade-column-0",
      "name": "Facade column",
      "shape": "box",
      "color": "#77736d",
      "position": [
        0,
        6.45,
        4.56
      ],
      "size": [
        0.28,
        7.55,
        0.3
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.86,
      "hidden": false
    },
    {
      "id": "facade-column-4_15",
      "name": "Facade column",
      "shape": "box",
      "color": "#77736d",
      "position": [
        4.15,
        6.45,
        4.56
      ],
      "size": [
        0.28,
        7.55,
        0.3
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.86,
      "hidden": false
    },
    {
      "id": "facade-band-0",
      "name": "Facade trim band",
      "shape": "box",
      "color": "#77736d",
      "position": [
        0,
        2.75,
        4.57
      ],
      "size": [
        12.2,
        0.18,
        0.28
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.86,
      "hidden": false
    },
    {
      "id": "facade-band-1",
      "name": "Facade trim band",
      "shape": "box",
      "color": "#77736d",
      "position": [
        0,
        5.15,
        4.57
      ],
      "size": [
        12.2,
        0.18,
        0.28
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.86,
      "hidden": false
    },
    {
      "id": "facade-band-2",
      "name": "Facade trim band",
      "shape": "box",
      "color": "#77736d",
      "position": [
        0,
        7.55,
        4.57
      ],
      "size": [
        12.2,
        0.18,
        0.28
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.86,
      "hidden": false
    },
    {
      "id": "facade-band-3",
      "name": "Facade trim band",
      "shape": "box",
      "color": "#77736d",
      "position": [
        0,
        9.82,
        4.57
      ],
      "size": [
        12.2,
        0.18,
        0.28
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.86,
      "hidden": false
    },
    {
      "id": "entry-recess",
      "name": "Recessed entry",
      "shape": "box",
      "color": "#1f3540",
      "position": [
        0,
        1.68,
        4.5
      ],
      "size": [
        2.65,
        3.25,
        0.22
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.18,
      "roughness": 0.28,
      "hidden": false
    },
    {
      "id": "entry-frame-top",
      "name": "Entry frame top",
      "shape": "box",
      "color": "#77736d",
      "position": [
        0,
        3.42,
        4.72
      ],
      "size": [
        3.25,
        0.28,
        0.32
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.82,
      "hidden": false
    },
    {
      "id": "entry-frame-left",
      "name": "Entry frame left",
      "shape": "box",
      "color": "#77736d",
      "position": [
        -1.48,
        1.82,
        4.72
      ],
      "size": [
        0.28,
        3.5,
        0.32
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.82,
      "hidden": false
    },
    {
      "id": "entry-frame-right",
      "name": "Entry frame right",
      "shape": "box",
      "color": "#77736d",
      "position": [
        1.48,
        1.82,
        4.72
      ],
      "size": [
        0.28,
        3.5,
        0.32
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.82,
      "hidden": false
    },
    {
      "id": "entry-door-left",
      "name": "Glass entry door",
      "shape": "box",
      "color": "#28495a",
      "position": [
        -0.62,
        1.55,
        4.69
      ],
      "size": [
        1.08,
        2.85,
        0.12
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.22,
      "roughness": 0.18,
      "hidden": false
    },
    {
      "id": "entry-door-right",
      "name": "Glass entry door",
      "shape": "box",
      "color": "#28495a",
      "position": [
        0.62,
        1.55,
        4.69
      ],
      "size": [
        1.08,
        2.85,
        0.12
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.22,
      "roughness": 0.18,
      "hidden": false
    },
    {
      "id": "entry-canopy",
      "name": "Entry canopy",
      "shape": "box",
      "color": "#b6783a",
      "position": [
        0,
        3.7,
        5.05
      ],
      "size": [
        4.0,
        0.25,
        1.2
      ],
      "rotation": [
        -5,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.62,
      "hidden": false
    },
    {
      "id": "window-0-0-recess",
      "name": "Window recess",
      "shape": "box",
      "color": "#1f3540",
      "position": [
        -4.15,
        3.55,
        4.49
      ],
      "size": [
        1.55,
        1.22,
        0.18
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.12,
      "roughness": 0.34,
      "hidden": false
    },
    {
      "id": "window-0-0-frame-top",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        -4.15,
        4.24,
        4.66
      ],
      "size": [
        1.82,
        0.16,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-0-0-frame-bottom",
      "name": "Window sill",
      "shape": "box",
      "color": "#77736d",
      "position": [
        -4.15,
        2.86,
        4.7
      ],
      "size": [
        1.9,
        0.17,
        0.34
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.8,
      "hidden": false
    },
    {
      "id": "window-0-0-frame-left",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        -4.97,
        3.55,
        4.66
      ],
      "size": [
        0.16,
        1.25,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-0-0-frame-right",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        -3.33,
        3.55,
        4.66
      ],
      "size": [
        0.16,
        1.25,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-0-0-glass",
      "name": "Window glass",
      "shape": "box",
      "color": "#28495a",
      "position": [
        -4.15,
        3.55,
        4.69
      ],
      "size": [
        1.38,
        1.06,
        0.08
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.22,
      "roughness": 0.18,
      "hidden": false
    },
    {
      "id": "window-0-1-recess",
      "name": "Window recess",
      "shape": "box",
      "color": "#1f3540",
      "position": [
        -2.05,
        3.55,
        4.49
      ],
      "size": [
        1.55,
        1.22,
        0.18
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.12,
      "roughness": 0.34,
      "hidden": false
    },
    {
      "id": "window-0-1-frame-top",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        -2.05,
        4.24,
        4.66
      ],
      "size": [
        1.82,
        0.16,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-0-1-frame-bottom",
      "name": "Window sill",
      "shape": "box",
      "color": "#77736d",
      "position": [
        -2.05,
        2.86,
        4.7
      ],
      "size": [
        1.9,
        0.17,
        0.34
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.8,
      "hidden": false
    },
    {
      "id": "window-0-1-frame-left",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        -2.87,
        3.55,
        4.66
      ],
      "size": [
        0.16,
        1.25,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-0-1-frame-right",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        -1.23,
        3.55,
        4.66
      ],
      "size": [
        0.16,
        1.25,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-0-1-glass",
      "name": "Window glass",
      "shape": "box",
      "color": "#28495a",
      "position": [
        -2.05,
        3.55,
        4.69
      ],
      "size": [
        1.38,
        1.06,
        0.08
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.22,
      "roughness": 0.18,
      "hidden": false
    },
    {
      "id": "window-0-2-recess",
      "name": "Window recess",
      "shape": "box",
      "color": "#1f3540",
      "position": [
        2.05,
        3.55,
        4.49
      ],
      "size": [
        1.55,
        1.22,
        0.18
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.12,
      "roughness": 0.34,
      "hidden": false
    },
    {
      "id": "window-0-2-frame-top",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        2.05,
        4.24,
        4.66
      ],
      "size": [
        1.82,
        0.16,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-0-2-frame-bottom",
      "name": "Window sill",
      "shape": "box",
      "color": "#77736d",
      "position": [
        2.05,
        2.86,
        4.7
      ],
      "size": [
        1.9,
        0.17,
        0.34
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.8,
      "hidden": false
    },
    {
      "id": "window-0-2-frame-left",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        1.23,
        3.55,
        4.66
      ],
      "size": [
        0.16,
        1.25,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-0-2-frame-right",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        2.87,
        3.55,
        4.66
      ],
      "size": [
        0.16,
        1.25,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-0-2-glass",
      "name": "Window glass",
      "shape": "box",
      "color": "#28495a",
      "position": [
        2.05,
        3.55,
        4.69
      ],
      "size": [
        1.38,
        1.06,
        0.08
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.22,
      "roughness": 0.18,
      "hidden": false
    },
    {
      "id": "window-0-3-recess",
      "name": "Window recess",
      "shape": "box",
      "color": "#1f3540",
      "position": [
        4.15,
        3.55,
        4.49
      ],
      "size": [
        1.55,
        1.22,
        0.18
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.12,
      "roughness": 0.34,
      "hidden": false
    },
    {
      "id": "window-0-3-frame-top",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        4.15,
        4.24,
        4.66
      ],
      "size": [
        1.82,
        0.16,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-0-3-frame-bottom",
      "name": "Window sill",
      "shape": "box",
      "color": "#77736d",
      "position": [
        4.15,
        2.86,
        4.7
      ],
      "size": [
        1.9,
        0.17,
        0.34
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.8,
      "hidden": false
    },
    {
      "id": "window-0-3-frame-left",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        3.33,
        3.55,
        4.66
      ],
      "size": [
        0.16,
        1.25,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-0-3-frame-right",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        4.97,
        3.55,
        4.66
      ],
      "size": [
        0.16,
        1.25,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-0-3-glass",
      "name": "Window glass",
      "shape": "box",
      "color": "#28495a",
      "position": [
        4.15,
        3.55,
        4.69
      ],
      "size": [
        1.38,
        1.06,
        0.08
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.22,
      "roughness": 0.18,
      "hidden": false
    },
    {
      "id": "window-1-0-recess",
      "name": "Window recess",
      "shape": "box",
      "color": "#1f3540",
      "position": [
        -4.15,
        5.95,
        4.49
      ],
      "size": [
        1.55,
        1.22,
        0.18
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.12,
      "roughness": 0.34,
      "hidden": false
    },
    {
      "id": "window-1-0-frame-top",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        -4.15,
        6.64,
        4.66
      ],
      "size": [
        1.82,
        0.16,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-1-0-frame-bottom",
      "name": "Window sill",
      "shape": "box",
      "color": "#77736d",
      "position": [
        -4.15,
        5.26,
        4.7
      ],
      "size": [
        1.9,
        0.17,
        0.34
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.8,
      "hidden": false
    },
    {
      "id": "window-1-0-frame-left",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        -4.97,
        5.95,
        4.66
      ],
      "size": [
        0.16,
        1.25,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-1-0-frame-right",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        -3.33,
        5.95,
        4.66
      ],
      "size": [
        0.16,
        1.25,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-1-0-glass",
      "name": "Window glass",
      "shape": "box",
      "color": "#28495a",
      "position": [
        -4.15,
        5.95,
        4.69
      ],
      "size": [
        1.38,
        1.06,
        0.08
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.22,
      "roughness": 0.18,
      "hidden": false
    },
    {
      "id": "window-1-1-recess",
      "name": "Window recess",
      "shape": "box",
      "color": "#1f3540",
      "position": [
        -2.05,
        5.95,
        4.49
      ],
      "size": [
        1.55,
        1.22,
        0.18
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.12,
      "roughness": 0.34,
      "hidden": false
    },
    {
      "id": "window-1-1-frame-top",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        -2.05,
        6.64,
        4.66
      ],
      "size": [
        1.82,
        0.16,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-1-1-frame-bottom",
      "name": "Window sill",
      "shape": "box",
      "color": "#77736d",
      "position": [
        -2.05,
        5.26,
        4.7
      ],
      "size": [
        1.9,
        0.17,
        0.34
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.8,
      "hidden": false
    },
    {
      "id": "window-1-1-frame-left",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        -2.87,
        5.95,
        4.66
      ],
      "size": [
        0.16,
        1.25,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-1-1-frame-right",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        -1.23,
        5.95,
        4.66
      ],
      "size": [
        0.16,
        1.25,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-1-1-glass",
      "name": "Window glass",
      "shape": "box",
      "color": "#28495a",
      "position": [
        -2.05,
        5.95,
        4.69
      ],
      "size": [
        1.38,
        1.06,
        0.08
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.22,
      "roughness": 0.18,
      "hidden": false
    },
    {
      "id": "window-1-2-recess",
      "name": "Window recess",
      "shape": "box",
      "color": "#1f3540",
      "position": [
        2.05,
        5.95,
        4.49
      ],
      "size": [
        1.55,
        1.22,
        0.18
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.12,
      "roughness": 0.34,
      "hidden": false
    },
    {
      "id": "window-1-2-frame-top",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        2.05,
        6.64,
        4.66
      ],
      "size": [
        1.82,
        0.16,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-1-2-frame-bottom",
      "name": "Window sill",
      "shape": "box",
      "color": "#77736d",
      "position": [
        2.05,
        5.26,
        4.7
      ],
      "size": [
        1.9,
        0.17,
        0.34
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.8,
      "hidden": false
    },
    {
      "id": "window-1-2-frame-left",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        1.23,
        5.95,
        4.66
      ],
      "size": [
        0.16,
        1.25,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-1-2-frame-right",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        2.87,
        5.95,
        4.66
      ],
      "size": [
        0.16,
        1.25,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-1-2-glass",
      "name": "Window glass",
      "shape": "box",
      "color": "#28495a",
      "position": [
        2.05,
        5.95,
        4.69
      ],
      "size": [
        1.38,
        1.06,
        0.08
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.22,
      "roughness": 0.18,
      "hidden": false
    },
    {
      "id": "window-1-3-recess",
      "name": "Window recess",
      "shape": "box",
      "color": "#1f3540",
      "position": [
        4.15,
        5.95,
        4.49
      ],
      "size": [
        1.55,
        1.22,
        0.18
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.12,
      "roughness": 0.34,
      "hidden": false
    },
    {
      "id": "window-1-3-frame-top",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        4.15,
        6.64,
        4.66
      ],
      "size": [
        1.82,
        0.16,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-1-3-frame-bottom",
      "name": "Window sill",
      "shape": "box",
      "color": "#77736d",
      "position": [
        4.15,
        5.26,
        4.7
      ],
      "size": [
        1.9,
        0.17,
        0.34
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.8,
      "hidden": false
    },
    {
      "id": "window-1-3-frame-left",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        3.33,
        5.95,
        4.66
      ],
      "size": [
        0.16,
        1.25,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-1-3-frame-right",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        4.97,
        5.95,
        4.66
      ],
      "size": [
        0.16,
        1.25,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-1-3-glass",
      "name": "Window glass",
      "shape": "box",
      "color": "#28495a",
      "position": [
        4.15,
        5.95,
        4.69
      ],
      "size": [
        1.38,
        1.06,
        0.08
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.22,
      "roughness": 0.18,
      "hidden": false
    },
    {
      "id": "window-2-0-recess",
      "name": "Window recess",
      "shape": "box",
      "color": "#1f3540",
      "position": [
        -4.15,
        8.35,
        4.49
      ],
      "size": [
        1.55,
        1.22,
        0.18
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.12,
      "roughness": 0.34,
      "hidden": false
    },
    {
      "id": "window-2-0-frame-top",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        -4.15,
        9.04,
        4.66
      ],
      "size": [
        1.82,
        0.16,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-2-0-frame-bottom",
      "name": "Window sill",
      "shape": "box",
      "color": "#77736d",
      "position": [
        -4.15,
        7.66,
        4.7
      ],
      "size": [
        1.9,
        0.17,
        0.34
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.8,
      "hidden": false
    },
    {
      "id": "window-2-0-frame-left",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        -4.97,
        8.35,
        4.66
      ],
      "size": [
        0.16,
        1.25,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-2-0-frame-right",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        -3.33,
        8.35,
        4.66
      ],
      "size": [
        0.16,
        1.25,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-2-0-glass",
      "name": "Window glass",
      "shape": "box",
      "color": "#28495a",
      "position": [
        -4.15,
        8.35,
        4.69
      ],
      "size": [
        1.38,
        1.06,
        0.08
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.22,
      "roughness": 0.18,
      "hidden": false
    },
    {
      "id": "window-2-1-recess",
      "name": "Window recess",
      "shape": "box",
      "color": "#1f3540",
      "position": [
        -2.05,
        8.35,
        4.49
      ],
      "size": [
        1.55,
        1.22,
        0.18
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.12,
      "roughness": 0.34,
      "hidden": false
    },
    {
      "id": "window-2-1-frame-top",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        -2.05,
        9.04,
        4.66
      ],
      "size": [
        1.82,
        0.16,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-2-1-frame-bottom",
      "name": "Window sill",
      "shape": "box",
      "color": "#77736d",
      "position": [
        -2.05,
        7.66,
        4.7
      ],
      "size": [
        1.9,
        0.17,
        0.34
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.8,
      "hidden": false
    },
    {
      "id": "window-2-1-frame-left",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        -2.87,
        8.35,
        4.66
      ],
      "size": [
        0.16,
        1.25,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-2-1-frame-right",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        -1.23,
        8.35,
        4.66
      ],
      "size": [
        0.16,
        1.25,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-2-1-glass",
      "name": "Window glass",
      "shape": "box",
      "color": "#28495a",
      "position": [
        -2.05,
        8.35,
        4.69
      ],
      "size": [
        1.38,
        1.06,
        0.08
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.22,
      "roughness": 0.18,
      "hidden": false
    },
    {
      "id": "window-2-2-recess",
      "name": "Window recess",
      "shape": "box",
      "color": "#1f3540",
      "position": [
        2.05,
        8.35,
        4.49
      ],
      "size": [
        1.55,
        1.22,
        0.18
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.12,
      "roughness": 0.34,
      "hidden": false
    },
    {
      "id": "window-2-2-frame-top",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        2.05,
        9.04,
        4.66
      ],
      "size": [
        1.82,
        0.16,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-2-2-frame-bottom",
      "name": "Window sill",
      "shape": "box",
      "color": "#77736d",
      "position": [
        2.05,
        7.66,
        4.7
      ],
      "size": [
        1.9,
        0.17,
        0.34
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.8,
      "hidden": false
    },
    {
      "id": "window-2-2-frame-left",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        1.23,
        8.35,
        4.66
      ],
      "size": [
        0.16,
        1.25,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-2-2-frame-right",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        2.87,
        8.35,
        4.66
      ],
      "size": [
        0.16,
        1.25,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-2-2-glass",
      "name": "Window glass",
      "shape": "box",
      "color": "#28495a",
      "position": [
        2.05,
        8.35,
        4.69
      ],
      "size": [
        1.38,
        1.06,
        0.08
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.22,
      "roughness": 0.18,
      "hidden": false
    },
    {
      "id": "window-2-3-recess",
      "name": "Window recess",
      "shape": "box",
      "color": "#1f3540",
      "position": [
        4.15,
        8.35,
        4.49
      ],
      "size": [
        1.55,
        1.22,
        0.18
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.12,
      "roughness": 0.34,
      "hidden": false
    },
    {
      "id": "window-2-3-frame-top",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        4.15,
        9.04,
        4.66
      ],
      "size": [
        1.82,
        0.16,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-2-3-frame-bottom",
      "name": "Window sill",
      "shape": "box",
      "color": "#77736d",
      "position": [
        4.15,
        7.66,
        4.7
      ],
      "size": [
        1.9,
        0.17,
        0.34
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.8,
      "hidden": false
    },
    {
      "id": "window-2-3-frame-left",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        3.33,
        8.35,
        4.66
      ],
      "size": [
        0.16,
        1.25,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-2-3-frame-right",
      "name": "Window frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        4.97,
        8.35,
        4.66
      ],
      "size": [
        0.16,
        1.25,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.78,
      "hidden": false
    },
    {
      "id": "window-2-3-glass",
      "name": "Window glass",
      "shape": "box",
      "color": "#28495a",
      "position": [
        4.15,
        8.35,
        4.69
      ],
      "size": [
        1.38,
        1.06,
        0.08
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.22,
      "roughness": 0.18,
      "hidden": false
    },
    {
      "id": "balcony-1-slab",
      "name": "Balcony slab",
      "shape": "box",
      "color": "#858078",
      "position": [
        3.15,
        4.65,
        5.1
      ],
      "size": [
        3.4,
        0.22,
        1.45
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.82,
      "hidden": false
    },
    {
      "id": "balcony-1-support-left",
      "name": "Balcony support",
      "shape": "box",
      "color": "#77736d",
      "position": [
        1.67,
        3.9,
        4.92
      ],
      "size": [
        0.18,
        1.6,
        0.25
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.85,
      "hidden": false
    },
    {
      "id": "balcony-1-support-right",
      "name": "Balcony support",
      "shape": "box",
      "color": "#77736d",
      "position": [
        4.63,
        3.9,
        4.92
      ],
      "size": [
        0.18,
        1.6,
        0.25
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.85,
      "hidden": false
    },
    {
      "id": "balcony-1-rail-top",
      "name": "Balcony top rail",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        3.15,
        5.38,
        5.72
      ],
      "size": [
        3.25,
        0.12,
        0.12
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.5,
      "roughness": 0.36,
      "hidden": false
    },
    {
      "id": "balcony-1-rail-0",
      "name": "Balcony railing",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        1.7,
        5.0,
        5.72
      ],
      "size": [
        0.09,
        0.82,
        0.09
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.52,
      "roughness": 0.34,
      "hidden": false
    },
    {
      "id": "balcony-1-rail-1",
      "name": "Balcony railing",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        2.43,
        5.0,
        5.72
      ],
      "size": [
        0.09,
        0.82,
        0.09
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.52,
      "roughness": 0.34,
      "hidden": false
    },
    {
      "id": "balcony-1-rail-2",
      "name": "Balcony railing",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        3.15,
        5.0,
        5.72
      ],
      "size": [
        0.09,
        0.82,
        0.09
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.52,
      "roughness": 0.34,
      "hidden": false
    },
    {
      "id": "balcony-1-rail-3",
      "name": "Balcony railing",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        3.87,
        5.0,
        5.72
      ],
      "size": [
        0.09,
        0.82,
        0.09
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.52,
      "roughness": 0.34,
      "hidden": false
    },
    {
      "id": "balcony-1-rail-4",
      "name": "Balcony railing",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        4.6,
        5.0,
        5.72
      ],
      "size": [
        0.09,
        0.82,
        0.09
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.52,
      "roughness": 0.34,
      "hidden": false
    },
    {
      "id": "balcony-1-side-left",
      "name": "Balcony side rail",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        1.59,
        5.0,
        5.18
      ],
      "size": [
        0.09,
        0.82,
        1.02
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.52,
      "roughness": 0.34,
      "hidden": false
    },
    {
      "id": "balcony-1-side-right",
      "name": "Balcony side rail",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        4.71,
        5.0,
        5.18
      ],
      "size": [
        0.09,
        0.82,
        1.02
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.52,
      "roughness": 0.34,
      "hidden": false
    },
    {
      "id": "balcony-2-slab",
      "name": "Balcony slab",
      "shape": "box",
      "color": "#858078",
      "position": [
        3.15,
        7.05,
        5.1
      ],
      "size": [
        3.4,
        0.22,
        1.45
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.82,
      "hidden": false
    },
    {
      "id": "balcony-2-support-left",
      "name": "Balcony support",
      "shape": "box",
      "color": "#77736d",
      "position": [
        1.67,
        6.3,
        4.92
      ],
      "size": [
        0.18,
        1.6,
        0.25
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.85,
      "hidden": false
    },
    {
      "id": "balcony-2-support-right",
      "name": "Balcony support",
      "shape": "box",
      "color": "#77736d",
      "position": [
        4.63,
        6.3,
        4.92
      ],
      "size": [
        0.18,
        1.6,
        0.25
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.85,
      "hidden": false
    },
    {
      "id": "balcony-2-rail-top",
      "name": "Balcony top rail",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        3.15,
        7.78,
        5.72
      ],
      "size": [
        3.25,
        0.12,
        0.12
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.5,
      "roughness": 0.36,
      "hidden": false
    },
    {
      "id": "balcony-2-rail-0",
      "name": "Balcony railing",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        1.7,
        7.4,
        5.72
      ],
      "size": [
        0.09,
        0.82,
        0.09
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.52,
      "roughness": 0.34,
      "hidden": false
    },
    {
      "id": "balcony-2-rail-1",
      "name": "Balcony railing",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        2.43,
        7.4,
        5.72
      ],
      "size": [
        0.09,
        0.82,
        0.09
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.52,
      "roughness": 0.34,
      "hidden": false
    },
    {
      "id": "balcony-2-rail-2",
      "name": "Balcony railing",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        3.15,
        7.4,
        5.72
      ],
      "size": [
        0.09,
        0.82,
        0.09
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.52,
      "roughness": 0.34,
      "hidden": false
    },
    {
      "id": "balcony-2-rail-3",
      "name": "Balcony railing",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        3.87,
        7.4,
        5.72
      ],
      "size": [
        0.09,
        0.82,
        0.09
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.52,
      "roughness": 0.34,
      "hidden": false
    },
    {
      "id": "balcony-2-rail-4",
      "name": "Balcony railing",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        4.6,
        7.4,
        5.72
      ],
      "size": [
        0.09,
        0.82,
        0.09
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.52,
      "roughness": 0.34,
      "hidden": false
    },
    {
      "id": "balcony-2-side-left",
      "name": "Balcony side rail",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        1.59,
        7.4,
        5.18
      ],
      "size": [
        0.09,
        0.82,
        1.02
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.52,
      "roughness": 0.34,
      "hidden": false
    },
    {
      "id": "balcony-2-side-right",
      "name": "Balcony side rail",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        4.71,
        7.4,
        5.18
      ],
      "size": [
        0.09,
        0.82,
        1.02
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.52,
      "roughness": 0.34,
      "hidden": false
    },
    {
      "id": "left-window-0-m2_0-recess",
      "name": "Side window recess",
      "shape": "box",
      "color": "#1f3540",
      "position": [
        -6.12,
        3.55,
        -2.0
      ],
      "size": [
        0.16,
        1.18,
        1.45
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.1,
      "roughness": 0.32,
      "hidden": false
    },
    {
      "id": "left-window-0-m2_0-glass",
      "name": "Side window glass",
      "shape": "box",
      "color": "#28495a",
      "position": [
        -6.18,
        3.55,
        -2.0
      ],
      "size": [
        0.08,
        1.02,
        1.28
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.22,
      "roughness": 0.18,
      "hidden": false
    },
    {
      "id": "left-window-0-1_35-recess",
      "name": "Side window recess",
      "shape": "box",
      "color": "#1f3540",
      "position": [
        -6.12,
        3.55,
        1.35
      ],
      "size": [
        0.16,
        1.18,
        1.45
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.1,
      "roughness": 0.32,
      "hidden": false
    },
    {
      "id": "left-window-0-1_35-glass",
      "name": "Side window glass",
      "shape": "box",
      "color": "#28495a",
      "position": [
        -6.18,
        3.55,
        1.35
      ],
      "size": [
        0.08,
        1.02,
        1.28
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.22,
      "roughness": 0.18,
      "hidden": false
    },
    {
      "id": "left-window-1-m2_0-recess",
      "name": "Side window recess",
      "shape": "box",
      "color": "#1f3540",
      "position": [
        -6.12,
        5.95,
        -2.0
      ],
      "size": [
        0.16,
        1.18,
        1.45
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.1,
      "roughness": 0.32,
      "hidden": false
    },
    {
      "id": "left-window-1-m2_0-glass",
      "name": "Side window glass",
      "shape": "box",
      "color": "#28495a",
      "position": [
        -6.18,
        5.95,
        -2.0
      ],
      "size": [
        0.08,
        1.02,
        1.28
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.22,
      "roughness": 0.18,
      "hidden": false
    },
    {
      "id": "left-window-1-1_35-recess",
      "name": "Side window recess",
      "shape": "box",
      "color": "#1f3540",
      "position": [
        -6.12,
        5.95,
        1.35
      ],
      "size": [
        0.16,
        1.18,
        1.45
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.1,
      "roughness": 0.32,
      "hidden": false
    },
    {
      "id": "left-window-1-1_35-glass",
      "name": "Side window glass",
      "shape": "box",
      "color": "#28495a",
      "position": [
        -6.18,
        5.95,
        1.35
      ],
      "size": [
        0.08,
        1.02,
        1.28
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.22,
      "roughness": 0.18,
      "hidden": false
    },
    {
      "id": "left-window-2-m2_0-recess",
      "name": "Side window recess",
      "shape": "box",
      "color": "#1f3540",
      "position": [
        -6.12,
        8.35,
        -2.0
      ],
      "size": [
        0.16,
        1.18,
        1.45
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.1,
      "roughness": 0.32,
      "hidden": false
    },
    {
      "id": "left-window-2-m2_0-glass",
      "name": "Side window glass",
      "shape": "box",
      "color": "#28495a",
      "position": [
        -6.18,
        8.35,
        -2.0
      ],
      "size": [
        0.08,
        1.02,
        1.28
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.22,
      "roughness": 0.18,
      "hidden": false
    },
    {
      "id": "left-window-2-1_35-recess",
      "name": "Side window recess",
      "shape": "box",
      "color": "#1f3540",
      "position": [
        -6.12,
        8.35,
        1.35
      ],
      "size": [
        0.16,
        1.18,
        1.45
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.1,
      "roughness": 0.32,
      "hidden": false
    },
    {
      "id": "left-window-2-1_35-glass",
      "name": "Side window glass",
      "shape": "box",
      "color": "#28495a",
      "position": [
        -6.18,
        8.35,
        1.35
      ],
      "size": [
        0.08,
        1.02,
        1.28
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.22,
      "roughness": 0.18,
      "hidden": false
    },
    {
      "id": "right-window-0-m2_0-recess",
      "name": "Side window recess",
      "shape": "box",
      "color": "#1f3540",
      "position": [
        6.12,
        3.55,
        -2.0
      ],
      "size": [
        0.16,
        1.18,
        1.45
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.1,
      "roughness": 0.32,
      "hidden": false
    },
    {
      "id": "right-window-0-m2_0-glass",
      "name": "Side window glass",
      "shape": "box",
      "color": "#28495a",
      "position": [
        6.18,
        3.55,
        -2.0
      ],
      "size": [
        0.08,
        1.02,
        1.28
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.22,
      "roughness": 0.18,
      "hidden": false
    },
    {
      "id": "right-window-0-1_35-recess",
      "name": "Side window recess",
      "shape": "box",
      "color": "#1f3540",
      "position": [
        6.12,
        3.55,
        1.35
      ],
      "size": [
        0.16,
        1.18,
        1.45
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.1,
      "roughness": 0.32,
      "hidden": false
    },
    {
      "id": "right-window-0-1_35-glass",
      "name": "Side window glass",
      "shape": "box",
      "color": "#28495a",
      "position": [
        6.18,
        3.55,
        1.35
      ],
      "size": [
        0.08,
        1.02,
        1.28
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.22,
      "roughness": 0.18,
      "hidden": false
    },
    {
      "id": "right-window-1-m2_0-recess",
      "name": "Side window recess",
      "shape": "box",
      "color": "#1f3540",
      "position": [
        6.12,
        5.95,
        -2.0
      ],
      "size": [
        0.16,
        1.18,
        1.45
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.1,
      "roughness": 0.32,
      "hidden": false
    },
    {
      "id": "right-window-1-m2_0-glass",
      "name": "Side window glass",
      "shape": "box",
      "color": "#28495a",
      "position": [
        6.18,
        5.95,
        -2.0
      ],
      "size": [
        0.08,
        1.02,
        1.28
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.22,
      "roughness": 0.18,
      "hidden": false
    },
    {
      "id": "right-window-1-1_35-recess",
      "name": "Side window recess",
      "shape": "box",
      "color": "#1f3540",
      "position": [
        6.12,
        5.95,
        1.35
      ],
      "size": [
        0.16,
        1.18,
        1.45
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.1,
      "roughness": 0.32,
      "hidden": false
    },
    {
      "id": "right-window-1-1_35-glass",
      "name": "Side window glass",
      "shape": "box",
      "color": "#28495a",
      "position": [
        6.18,
        5.95,
        1.35
      ],
      "size": [
        0.08,
        1.02,
        1.28
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.22,
      "roughness": 0.18,
      "hidden": false
    },
    {
      "id": "right-window-2-m2_0-recess",
      "name": "Side window recess",
      "shape": "box",
      "color": "#1f3540",
      "position": [
        6.12,
        8.35,
        -2.0
      ],
      "size": [
        0.16,
        1.18,
        1.45
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.1,
      "roughness": 0.32,
      "hidden": false
    },
    {
      "id": "right-window-2-m2_0-glass",
      "name": "Side window glass",
      "shape": "box",
      "color": "#28495a",
      "position": [
        6.18,
        8.35,
        -2.0
      ],
      "size": [
        0.08,
        1.02,
        1.28
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.22,
      "roughness": 0.18,
      "hidden": false
    },
    {
      "id": "right-window-2-1_35-recess",
      "name": "Side window recess",
      "shape": "box",
      "color": "#1f3540",
      "position": [
        6.12,
        8.35,
        1.35
      ],
      "size": [
        0.16,
        1.18,
        1.45
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.1,
      "roughness": 0.32,
      "hidden": false
    },
    {
      "id": "right-window-2-1_35-glass",
      "name": "Side window glass",
      "shape": "box",
      "color": "#28495a",
      "position": [
        6.18,
        8.35,
        1.35
      ],
      "size": [
        0.08,
        1.02,
        1.28
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.22,
      "roughness": 0.18,
      "hidden": false
    },
    {
      "id": "roof-unit-main",
      "name": "Rooftop HVAC",
      "shape": "box",
      "color": "#6c7377",
      "position": [
        -2.1,
        11.6,
        -1.1
      ],
      "size": [
        3.0,
        1.0,
        2.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.25,
      "roughness": 0.55,
      "hidden": false
    },
    {
      "id": "roof-unit-grill",
      "name": "HVAC grille",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        -2.1,
        11.6,
        0.05
      ],
      "size": [
        2.2,
        0.55,
        0.12
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.45,
      "roughness": 0.4,
      "hidden": false
    },
    {
      "id": "roof-vent-1",
      "name": "Roof vent",
      "shape": "cylinder",
      "color": "#6c7377",
      "position": [
        2.2,
        11.65,
        -1.4
      ],
      "size": [
        0.55,
        1.05,
        0.55
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.2,
      "roughness": 0.62,
      "hidden": false
    },
    {
      "id": "roof-vent-2",
      "name": "Roof vent",
      "shape": "cylinder",
      "color": "#6c7377",
      "position": [
        3.2,
        11.55,
        -0.55
      ],
      "size": [
        0.45,
        0.85,
        0.45
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.2,
      "roughness": 0.62,
      "hidden": false
    },
    {
      "id": "fire-platform-0",
      "name": "Fire escape platform",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        -6.42,
        4.65,
        0.55
      ],
      "size": [
        0.9,
        0.14,
        2.7
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.55,
      "roughness": 0.4,
      "hidden": false
    },
    {
      "id": "fire-rail-out-0",
      "name": "Fire escape rail",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        -6.84,
        5.3,
        0.55
      ],
      "size": [
        0.08,
        1.15,
        2.7
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.55,
      "roughness": 0.38,
      "hidden": false
    },
    {
      "id": "fire-rail-front-0",
      "name": "Fire escape rail",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        -6.42,
        5.3,
        1.88
      ],
      "size": [
        0.86,
        1.15,
        0.08
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.55,
      "roughness": 0.38,
      "hidden": false
    },
    {
      "id": "fire-rail-back-0",
      "name": "Fire escape rail",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        -6.42,
        5.3,
        -0.78
      ],
      "size": [
        0.86,
        1.15,
        0.08
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.55,
      "roughness": 0.38,
      "hidden": false
    },
    {
      "id": "fire-platform-1",
      "name": "Fire escape platform",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        -6.42,
        7.05,
        0.55
      ],
      "size": [
        0.9,
        0.14,
        2.7
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.55,
      "roughness": 0.4,
      "hidden": false
    },
    {
      "id": "fire-rail-out-1",
      "name": "Fire escape rail",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        -6.84,
        7.7,
        0.55
      ],
      "size": [
        0.08,
        1.15,
        2.7
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.55,
      "roughness": 0.38,
      "hidden": false
    },
    {
      "id": "fire-rail-front-1",
      "name": "Fire escape rail",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        -6.42,
        7.7,
        1.88
      ],
      "size": [
        0.86,
        1.15,
        0.08
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.55,
      "roughness": 0.38,
      "hidden": false
    },
    {
      "id": "fire-rail-back-1",
      "name": "Fire escape rail",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        -6.42,
        7.7,
        -0.78
      ],
      "size": [
        0.86,
        1.15,
        0.08
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.55,
      "roughness": 0.38,
      "hidden": false
    },
    {
      "id": "ladder-rail-m6_67",
      "name": "Fire escape ladder rail",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        -6.67,
        5.82,
        -0.65
      ],
      "size": [
        0.07,
        3.4,
        0.07
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.55,
      "roughness": 0.38,
      "hidden": false
    },
    {
      "id": "ladder-rail-m6_17",
      "name": "Fire escape ladder rail",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        -6.17,
        5.82,
        -0.65
      ],
      "size": [
        0.07,
        3.4,
        0.07
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.55,
      "roughness": 0.38,
      "hidden": false
    },
    {
      "id": "ladder-rung-0",
      "name": "Fire escape ladder rung",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        -6.42,
        4.35,
        -0.65
      ],
      "size": [
        0.58,
        0.06,
        0.07
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.55,
      "roughness": 0.38,
      "hidden": false
    },
    {
      "id": "ladder-rung-1",
      "name": "Fire escape ladder rung",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        -6.42,
        4.78,
        -0.65
      ],
      "size": [
        0.58,
        0.06,
        0.07
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.55,
      "roughness": 0.38,
      "hidden": false
    },
    {
      "id": "ladder-rung-2",
      "name": "Fire escape ladder rung",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        -6.42,
        5.21,
        -0.65
      ],
      "size": [
        0.58,
        0.06,
        0.07
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.55,
      "roughness": 0.38,
      "hidden": false
    },
    {
      "id": "ladder-rung-3",
      "name": "Fire escape ladder rung",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        -6.42,
        5.64,
        -0.65
      ],
      "size": [
        0.58,
        0.06,
        0.07
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.55,
      "roughness": 0.38,
      "hidden": false
    },
    {
      "id": "ladder-rung-4",
      "name": "Fire escape ladder rung",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        -6.42,
        6.07,
        -0.65
      ],
      "size": [
        0.58,
        0.06,
        0.07
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.55,
      "roughness": 0.38,
      "hidden": false
    },
    {
      "id": "ladder-rung-5",
      "name": "Fire escape ladder rung",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        -6.42,
        6.5,
        -0.65
      ],
      "size": [
        0.58,
        0.06,
        0.07
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.55,
      "roughness": 0.38,
      "hidden": false
    },
    {
      "id": "ladder-rung-6",
      "name": "Fire escape ladder rung",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        -6.42,
        6.93,
        -0.65
      ],
      "size": [
        0.58,
        0.06,
        0.07
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.55,
      "roughness": 0.38,
      "hidden": false
    },
    {
      "id": "ladder-rung-7",
      "name": "Fire escape ladder rung",
      "shape": "box",
      "color": "#2f3438",
      "position": [
        -6.42,
        7.36,
        -0.65
      ],
      "size": [
        0.58,
        0.06,
        0.07
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.55,
      "roughness": 0.38,
      "hidden": false
    },
    {
      "id": "rear-service-door",
      "name": "Rear service door",
      "shape": "box",
      "color": "#383d42",
      "position": [
        2.8,
        1.45,
        -4.48
      ],
      "size": [
        1.6,
        2.8,
        0.15
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.74,
      "hidden": false
    },
    {
      "id": "rear-door-frame",
      "name": "Rear door frame",
      "shape": "box",
      "color": "#77736d",
      "position": [
        2.8,
        2.95,
        -4.55
      ],
      "size": [
        2.0,
        0.2,
        0.2
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0,
      "roughness": 0.82,
      "hidden": false
    },
    {
      "id": "entry-light-0",
      "name": "Entry wall light",
      "shape": "box",
      "color": "#e7c88b",
      "position": [
        -1.9,
        2.65,
        4.82
      ],
      "size": [
        0.22,
        0.42,
        0.16
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.1,
      "roughness": 0.18,
      "hidden": false
    },
    {
      "id": "entry-light-1",
      "name": "Entry wall light",
      "shape": "box",
      "color": "#e7c88b",
      "position": [
        1.9,
        2.65,
        4.82
      ],
      "size": [
        0.22,
        0.42,
        0.16
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "metallic": 0.1,
      "roughness": 0.18,
      "hidden": false
    }
  ]
};

const finalAssets=assets.map(asset=>asset.id===REBUILT_APARTMENT.id?REBUILT_APARTMENT:asset);

export const ASSET_LIBRARY=Object.freeze(finalAssets);
export const ASSET_BY_ID=Object.freeze(Object.fromEntries(finalAssets.map(asset=>[asset.id,asset])));
