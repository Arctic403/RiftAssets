import { BUILDING_STYLES, PROP_STYLES, INTERACTION_STYLES } from './world-kit.js';

export const MAP_LAYERS = Object.freeze([
  {id:'roads',label:'Roads',color:'#3b4148'},
  {id:'lots',label:'Lots',color:'#5c5a50'},
  {id:'buildings',label:'Buildings',color:'#9b7656'},
  {id:'props',label:'Props',color:'#55745d'},
  {id:'zones',label:'Zones',color:'#6b5a8b'},
  {id:'interactions',label:'Interactions',color:'#d78e36'}
]);

export const PALETTES = Object.freeze({
  building:[
    {id:'apartment',label:'Apartment',color:'#856f63',width:180,height:126,floors:4,style:'brick-warm',assetId:'building.apartment.a',collision:true},
    {id:'corner-store',label:'Corner Store',color:'#8b6a4e',width:160,height:110,floors:2,style:'brick-warm',assetId:'building.store.corner.a',collision:true},
    {id:'office',label:'Office',color:'#646f79',width:200,height:140,floors:6,style:'glass-office',assetId:'building.office.a',collision:true},
    {id:'warehouse',label:'Warehouse',color:'#687069',width:230,height:150,floors:2,style:'industrial',assetId:'building.warehouse.a',collision:true},
    {id:'house',label:'House',color:'#8c765d',width:118,height:88,floors:2,style:'brick-warm',assetId:'building.house.a',collision:true},
    {id:'bank',label:'Bank',color:'#6a7078',width:190,height:126,floors:4,style:'civic',assetId:'building.bank.a',collision:true},
    {id:'casino',label:'Casino',color:'#7d5f7c',width:240,height:160,floors:5,style:'casino-neon',assetId:'building.casino.a',collision:true},
    {id:'nightclub',label:'Nightclub',color:'#6f586f',width:180,height:118,floors:2,style:'night-neon',assetId:'building.nightclub.a',collision:true},
    {id:'gym',label:'Gym',color:'#657369',width:190,height:125,floors:3,style:'concrete',assetId:'building.gym.a',collision:true},
    {id:'hospital',label:'Hospital',color:'#788584',width:250,height:170,floors:6,style:'medical',assetId:'building.hospital.a',collision:true}
  ],
  prop:Object.entries(PROP_STYLES).map(([id,value])=>({id,...value})),
  zone:[
    {id:'lot',label:'Buildable Lot',color:'#65624f',layer:'lots'},
    {id:'district',label:'District',color:'#695a88',layer:'zones'},
    {id:'crime-zone',label:'Crime Zone',color:'#80504f',layer:'zones'},
    {id:'safe-zone',label:'Safe Zone',color:'#4d6f62',layer:'zones'},
    {id:'spawn-zone',label:'Spawn Zone',color:'#5b6e87',layer:'zones'}
  ],
  interaction:Object.entries(INTERACTION_STYLES).map(([id,value])=>({id,...value}))
});

const B=(id,kind,x,y,width,height,floors,style,label,rotation=0)=>({
  id,type:'building',kind,layer:'buildings',x,y,width,height,rotation,floors,style,
  assetId:`building.${kind}.${style}`,label,color:BUILDING_STYLES[style]?.faceX||'#777777',collision:true
});
const P=(id,kind,x,y,rotation=0,label)=>({
  id,type:'prop',kind,layer:'props',x,y,rotation,radius:PROP_STYLES[kind]?.radius||12,
  label:label||PROP_STYLES[kind]?.label||kind,color:PROP_STYLES[kind]?.color||'#777777',
  collision:!!PROP_STYLES[kind]?.collision
});
const I=(id,kind,x,y,label)=>({
  id,type:'interaction',kind,layer:'interactions',x,y,radius:INTERACTION_STYLES[kind]?.radius||12,
  label:label||INTERACTION_STYLES[kind]?.label||kind,color:INTERACTION_STYLES[kind]?.color||'#d78e36',collision:false
});
const Z=(id,kind,layer,x,y,width,height,label,color)=>({
  id,type:'zone',kind,layer,x,y,width,height,rotation:0,label,color,collision:false
});
const R=(id,x1,y1,x2,y2,width,label,style='avenue')=>({
  id,type:'road',kind:'road',style,layer:'roads',x1,y1,x2,y2,width,label,color:style==='alley'?'#30353a':'#353b41',collision:false
});

export function createStarterMap(){
  const roads=[
    R('road-king',280,1024,2792,1024,132,'King Avenue','avenue'),
    R('road-rift',1536,280,1536,2792,140,'Rift Boulevard','boulevard'),
    R('road-market',280,1792,2792,1792,106,'Market Street','local'),
    R('road-harbour',280,2432,2792,2432,110,'Harbour Road','local'),
    R('road-ash',896,280,896,2792,94,'Ash Street','local'),
    R('road-vale',2176,280,2176,2792,94,'Vale Street','local'),
    R('alley-nw',1060,1280,1390,1280,44,'Service Alley','alley'),
    R('alley-se',1690,2070,2050,2070,42,'Neon Alley','alley')
  ];

  const lots=[
    Z('lot-nw','lot','lots',1160,690,470,480,'Northwest Block','#65624f'),
    Z('lot-ne','lot','lots',1855,690,500,480,'Northeast Block','#66645a'),
    Z('lot-wc','lot','lots',1160,1400,470,560,'Market West','#666257'),
    Z('lot-ec','lot','lots',1855,1400,500,560,'Market East','#62635c'),
    Z('lot-sw','lot','lots',1160,2110,470,470,'Harbour West','#5d6058'),
    Z('lot-se','lot','lots',1855,2110,500,470,'Neon Quarter','#615864'),
    Z('lot-far-east','lot','lots',2540,1420,430,550,'Civic East','#626661')
  ];

  const zones=[
    ...lots,
    Z('zone-downtown','district','zones',1536,1510,2500,2500,'Downtown','#695a88'),
    Z('zone-market-safe','safe-zone','zones',1855,1400,420,420,'Market Plaza Safe Zone','#4d6f62'),
    Z('zone-neon-crime','crime-zone','zones',1860,2180,420,360,'Neon Alley Crime Zone','#80504f')
  ];

  const buildings=[
    B('apt-copper','apartment',1060,640,210,150,5,'brick-warm','Copper Row Apartments'),
    B('apt-ash','apartment',1285,705,178,132,4,'brick-dark','Ash Court'),
    B('store-lucky','corner-store',1130,905,188,112,2,'brick-warm','Lucky Mart'),
    B('office-rift','office',1765,610,220,150,7,'glass-office','Rift Exchange'),
    B('bank-central','bank',2000,760,220,145,5,'civic','RiftCity Central Bank'),
    B('office-vale','office',1850,920,190,128,5,'concrete','Vale Offices'),
    B('apt-market','apartment',1050,1430,205,145,5,'brick-dark','Market Lofts'),
    B('gym-core','gym',1295,1510,190,132,3,'concrete','Core Gym'),
    B('store-market','corner-store',1110,1680,182,105,2,'brick-warm','Market Pharmacy'),
    B('office-market','office',1760,1340,205,145,6,'glass-office','Mercer Tower'),
    B('store-cafe','corner-store',2005,1435,178,105,2,'brick-warm','Rift Café'),
    B('apt-plaza','apartment',1885,1650,220,140,6,'concrete','Plaza Residences'),
    B('warehouse-harbour','warehouse',1065,2095,250,165,2,'industrial','Harbour Freight'),
    B('apt-harbour','apartment',1325,2180,190,135,4,'brick-warm','Dockside Flats'),
    B('casino-ember','casino',1740,2035,260,175,5,'casino-neon','Ember Casino'),
    B('club-void','nightclub',2035,2225,195,122,2,'night-neon','VOID Nightclub'),
    B('hospital-east','hospital',2530,1325,270,180,6,'medical','RiftCity Medical'),
    B('office-civic','office',2520,1635,220,150,5,'civic','Civic Services')
  ];

  const props=[
    P('tree-01','tree',1470,890),P('tree-02','tree',1600,900),P('tree-03','tree',1470,1150),P('tree-04','tree',1605,1140),
    P('tree-05','tree',1685,1515),P('tree-06','tree',2030,1510),P('tree-07','tree',1685,1605),P('tree-08','tree',2035,1600),
    P('bench-01','bench',1735,1515),P('bench-02','bench',1975,1600),
    P('light-01','streetlight',1435,990),P('light-02','streetlight',1635,990),P('light-03','streetlight',1435,1055),P('light-04','streetlight',1635,1055),
    P('light-05','streetlight',850,1680),P('light-06','streetlight',940,1680),P('light-07','streetlight',2135,1680),P('light-08','streetlight',2215,1680),
    P('light-09','streetlight',850,1900),P('light-10','streetlight',940,1900),P('light-11','streetlight',2135,1900),P('light-12','streetlight',2215,1900),
    P('car-01','parked-car',1350,1085,90,'Parked Sedan'),P('car-02','parked-car',1740,960,0,'Parked Sedan'),
    P('car-03','parked-car',2070,1840,90,'Parked Coupe'),P('car-04','parked-car',1005,1850,90,'Parked Van'),
    P('bus-01','bus-stop',1490,930,0,'King Ave Bus Stop'),P('bus-02','bus-stop',1585,1880,0,'Market Bus Stop'),
    P('dump-01','dumpster',1390,1270),P('dump-02','dumpster',2040,2070),
    P('hydrant-01','hydrant',1440,1075),P('hydrant-02','hydrant',2230,1735),
    P('planter-01','planter',1810,1515),P('planter-02','planter',1900,1600)
  ];

  const interactions=[
    I('int-lucky','shop',1128,840,'Enter Lucky Mart'),
    I('int-bank','bank',1920,825,'Open Central Bank'),
    I('int-gym','gym',1260,1435,'Enter Core Gym'),
    I('int-pharmacy','shop',1090,1625,'Enter Market Pharmacy'),
    I('int-cafe','shop',1980,1380,'Enter Rift Café'),
    I('int-casino','casino',1660,2120,'Enter Ember Casino'),
    I('int-club','nightclub',1970,2160,'Enter VOID Nightclub'),
    I('int-hospital','hospital',2440,1415,'Enter RiftCity Medical'),
    I('int-crime','crime',1880,2070,'Neon Alley Opportunity')
  ];

  return {
    format:'riftcity-2d-map',
    version:2,
    name:'RiftCity — Downtown Proof District',
    revision:'phase-4-authored-downtown',
    width:3072,
    height:3072,
    gridSize:32,
    playerSpawn:{x:1490,y:1160},
    roads,
    buildings,
    props,
    zones,
    interactions
  };
}
