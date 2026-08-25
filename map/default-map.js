export const MAP_LAYERS=[
  {id:'lots',label:'Lots / Ground',color:'#6f745d'},
  {id:'roads',label:'Roads',color:'#4b5054'},
  {id:'buildings',label:'Buildings',color:'#a87345'},
  {id:'props',label:'Props',color:'#55745b'},
  {id:'zones',label:'Zones',color:'#695a88'},
  {id:'interactions',label:'Interactions',color:'#d78e36'}
];

export const PALETTES={
  building:[
    {id:'apartment',label:'Apartment',style:'brick-warm',floors:4,assetId:'building.apartment.a',color:'#8f654f',collision:true},
    {id:'office',label:'Office',style:'glass-blue',floors:7,assetId:'building.office.a',color:'#55717d',collision:true},
    {id:'corner-store',label:'Corner Store',style:'storefront',floors:2,assetId:'building.corner-store.a',color:'#8c765f',collision:true},
    {id:'warehouse',label:'Warehouse',style:'industrial',floors:2,assetId:'building.warehouse.a',color:'#707477',collision:true}
  ],
  prop:[
    {id:'tree',label:'Tree',color:'#55745b',radius:14,collision:true},
    {id:'streetlight',label:'Street Light',color:'#879199',radius:7,collision:false},
    {id:'parked-car',label:'Parked Car',color:'#687785',radius:14,collision:true},
    {id:'bench',label:'Bench',color:'#7e634d',radius:10,collision:true},
    {id:'dumpster',label:'Dumpster',color:'#466052',radius:11,collision:true},
    {id:'bus-stop',label:'Bus Stop',color:'#536e7c',radius:10,collision:false}
  ],
  zone:[
    {id:'lot',label:'Development Lot',layer:'lots',color:'#7d735f'},
    {id:'plaza',label:'Public Plaza',layer:'lots',color:'#8a806e'},
    {id:'park',label:'Pocket Park',layer:'lots',color:'#4f6f59'},
    {id:'service-yard',label:'Service Yard',layer:'lots',color:'#66645e'}
  ],
  interaction:[
    {id:'door',label:'Entrance',color:'#d78e36',radius:10},
    {id:'crime',label:'Crime Opportunity',color:'#c45d5d',radius:10},
    {id:'travel',label:'Travel Point',color:'#72a0bb',radius:10}
  ]
};

const road=(id,label,x1,y1,x2,y2,width=96,style='local')=>({
  id,type:'road',kind:'road',style,layer:'roads',x1,y1,x2,y2,width,label,
  color:style==='alley'?'#303438':style==='avenue'?'#383e43':'#353b41',collision:false
});

const lot=(id,label,x,y,width,height,kind='lot',color='#7d735f')=>({
  id,type:'zone',kind,layer:'lots',x,y,width,height,rotation:0,label,color,collision:false
});

export function createStarterMap(){
  return {
    format:'riftcity-2d-map',
    version:2,
    name:'RiftCity — Downtown Ground Art V1',
    revision:'downtown-ground-art-v1',
    width:3584,
    height:3328,
    gridSize:32,
    playerSpawn:{x:1792,y:1664},

    // Street hierarchy first: two major avenues, secondary streets,
    // then service alleys. The plan intentionally avoids a uniform city grid.
    roads:[
      road('road-west-ave','West Avenue',736,160,736,3168,144,'avenue'),
      road('road-central-ave','Central Avenue',1792,96,1792,3232,160,'avenue'),
      road('road-east-ave','East Avenue',2880,224,2880,3104,128,'avenue'),

      road('road-north','North Street',160,608,3424,608,120,'local'),
      road('road-market','Market Street',96,1472,3488,1472,144,'avenue'),
      road('road-civic','Civic Street',224,2272,3360,2272,112,'local'),
      road('road-south','South Street',352,2944,3232,2944,104,'local'),

      road('road-old-quarter','Old Quarter Road',736,608,1184,1040,88,'local'),
      road('road-river-link','Foundry Link',2368,2272,2880,2688,88,'local'),

      road('alley-nw','Northwest Service Alley',1056,608,1056,1472,48,'alley'),
      road('alley-nc','Arcade Alley',1408,1056,1792,1056,48,'alley'),
      road('alley-ne','Mercer Alley',2336,608,2336,1472,48,'alley'),
      road('alley-west','West Market Alley',736,1856,1792,1856,48,'alley'),
      road('alley-east','East Market Alley',1792,1856,2880,1856,48,'alley'),
      road('alley-sw','Foundry Alley',1184,2272,1184,2944,48,'alley'),
      road('alley-se','Warehouse Alley',2464,2272,2464,2944,48,'alley')
    ],

    // Ground parcels only. These create believable block shapes and reserve
    // future landmark/filler-building footprints without placing buildings yet.
    zones:[
      lot('lot-nw-1','Northwest Block A',224,224,416,272),
      lot('lot-nw-2','Northwest Block B',896,224,768,272),
      lot('lot-n-1','North Core Block',1920,224,816,272),
      lot('lot-ne-1','Northeast Block',3040,288,320,208),

      lot('lot-old-1','Old Quarter West',224,768,400,544),
      lot('lot-old-2','Old Quarter Inner',864,800,256,448),
      lot('lot-old-3','Old Quarter East',1248,736,400,608),
      lot('lot-core-n','Central North Block',1936,768,656,544),
      lot('lot-east-n','East North Block',2672,768,256,544),
      lot('lot-edge-ne','East Edge North',3104,768,256,544),

      lot('plaza-market','Market Square',1248,1600,384,192,'plaza','#8b8170'),
      lot('lot-market-west','Market West Block',224,1632,400,480),
      lot('lot-market-mid','Market Mid Block',864,1984,800,160),
      lot('lot-market-east','Market East Block',1936,1984,800,160),
      lot('park-civic','Civic Green',3040,1664,320,416,'park','#4f6f59'),

      lot('lot-civic-west','Civic West Block',224,2432,400,352),
      lot('lot-civic-mid','Civic Mid Block',864,2432,256,352),
      lot('lot-foundry','Foundry Block',1312,2432,352,352,'service-yard','#66645e'),
      lot('lot-south-core','South Core Block',1936,2432,384,352),
      lot('lot-warehouse','Warehouse Block',2608,2496,128,288,'service-yard','#66645e'),
      lot('lot-east-south','East South Block',3040,2432,320,352),

      lot('lot-bottom-west','Southwest Edge',480,3072,1024,128),
      lot('lot-bottom-core','South Core Edge',1984,3072,704,128),
      lot('lot-bottom-east','Southeast Edge',3008,3072,224,128)
    ],

    buildings:[],
    props:[],
    interactions:[]
  };
}
