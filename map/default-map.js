export const MAP_LAYERS = Object.freeze([
  {id:'roads',label:'Roads',color:'#3b4148'},
  {id:'lots',label:'Lots',color:'#4f5148'},
  {id:'buildings',label:'Buildings',color:'#9b7656'},
  {id:'props',label:'Props',color:'#55745d'},
  {id:'zones',label:'Zones',color:'#6b5a8b'},
  {id:'interactions',label:'Interactions',color:'#d78e36'}
]);

export const PALETTES = Object.freeze({
  building:[
    {id:'apartment',label:'Apartment',color:'#856f63',width:160,height:110,collision:true},
    {id:'corner-store',label:'Corner Store',color:'#8b6a4e',width:150,height:95,collision:true},
    {id:'office',label:'Office',color:'#646f79',width:180,height:120,collision:true},
    {id:'warehouse',label:'Warehouse',color:'#687069',width:210,height:130,collision:true},
    {id:'house',label:'House',color:'#8c765d',width:105,height:82,collision:true},
    {id:'bank',label:'Bank',color:'#6a7078',width:170,height:110,collision:true},
    {id:'casino',label:'Casino',color:'#7d5f7c',width:220,height:145,collision:true},
    {id:'nightclub',label:'Nightclub',color:'#6f586f',width:165,height:105,collision:true}
  ],
  prop:[
    {id:'tree',label:'Tree',color:'#4f7258',radius:18,collision:false},
    {id:'streetlight',label:'Streetlight',color:'#88929a',radius:8,collision:false},
    {id:'bench',label:'Bench',color:'#7e634d',radius:12,collision:false},
    {id:'dumpster',label:'Dumpster',color:'#466052',radius:13,collision:true},
    {id:'hydrant',label:'Hydrant',color:'#a64e45',radius:7,collision:false},
    {id:'bus-stop',label:'Bus Stop',color:'#536e7c',radius:16,collision:false},
    {id:'parked-car',label:'Parked Car',color:'#687785',radius:17,collision:true}
  ],
  zone:[
    {id:'lot',label:'Buildable Lot',color:'#65624f',layer:'lots'},
    {id:'district',label:'District',color:'#695a88',layer:'zones'},
    {id:'crime-zone',label:'Crime Zone',color:'#80504f',layer:'zones'},
    {id:'safe-zone',label:'Safe Zone',color:'#4d6f62',layer:'zones'},
    {id:'spawn-zone',label:'Spawn Zone',color:'#5b6e87',layer:'zones'}
  ],
  interaction:[
    {id:'door',label:'Door / Enter',color:'#d78e36',radius:12},
    {id:'bank',label:'Bank',color:'#8fa9c2',radius:12},
    {id:'casino',label:'Casino',color:'#b481b2',radius:12},
    {id:'shop',label:'Shop',color:'#cf9d68',radius:12},
    {id:'crime',label:'Crime',color:'#c76363',radius:12},
    {id:'gym',label:'Gym',color:'#79a284',radius:12},
    {id:'airport',label:'Airport',color:'#83a4b7',radius:12},
    {id:'nightclub',label:'Nightclub',color:'#a67da6',radius:12}
  ]
});

export function createStarterMap(){
  return {
    format:'riftcity-2d-map',
    version:1,
    name:'RiftCity Draft',
    width:2048,
    height:2048,
    gridSize:32,
    playerSpawn:{x:1024,y:1120},
    roads:[
      {id:'road-main-ew',type:'road',layer:'roads',x1:180,y1:1024,x2:1868,y2:1024,width:96,label:'Central Avenue',color:'#343a40',collision:false},
      {id:'road-main-ns',type:'road',layer:'roads',x1:1024,y1:180,x2:1024,y2:1868,width:96,label:'Rift Street',color:'#343a40',collision:false}
    ],
    buildings:[
      {id:'building-apartment',type:'building',kind:'apartment',layer:'buildings',x:720,y:750,width:210,height:150,rotation:0,label:'Apartment Block',color:'#856f63',collision:true},
      {id:'building-store',type:'building',kind:'corner-store',layer:'buildings',x:1280,y:760,width:180,height:125,rotation:0,label:'Corner Store',color:'#8b6a4e',collision:true},
      {id:'building-bank',type:'building',kind:'bank',layer:'buildings',x:735,y:1300,width:210,height:145,rotation:0,label:'RiftCity Bank',color:'#6a7078',collision:true},
      {id:'building-club',type:'building',kind:'nightclub',layer:'buildings',x:1295,y:1305,width:200,height:135,rotation:0,label:'Nightclub',color:'#6f586f',collision:true}
    ],
    props:[
      {id:'tree-1',type:'prop',kind:'tree',layer:'props',x:520,y:740,radius:18,label:'Tree',color:'#4f7258',collision:false},
      {id:'tree-2',type:'prop',kind:'tree',layer:'props',x:1515,y:1330,radius:18,label:'Tree',color:'#4f7258',collision:false},
      {id:'bench-1',type:'prop',kind:'bench',layer:'props',x:520,y:1120,radius:12,label:'Bench',color:'#7e634d',collision:false}
    ],
    zones:[
      {id:'lot-northwest',type:'zone',kind:'lot',layer:'lots',x:720,y:750,width:330,height:260,rotation:0,label:'Lot A',color:'#65624f',collision:false},
      {id:'zone-downtown',type:'zone',kind:'district',layer:'zones',x:1024,y:1024,width:1500,height:1500,rotation:0,label:'Downtown',color:'#695a88',collision:false}
    ],
    interactions:[
      {id:'interaction-store',type:'interaction',kind:'shop',layer:'interactions',x:1195,y:835,radius:12,label:'Enter Corner Store',color:'#cf9d68',collision:false},
      {id:'interaction-bank',type:'interaction',kind:'bank',layer:'interactions',x:840,y:1220,radius:12,label:'Open Bank',color:'#8fa9c2',collision:false},
      {id:'interaction-club',type:'interaction',kind:'nightclub',layer:'interactions',x:1200,y:1235,radius:12,label:'Enter Nightclub',color:'#a67da6',collision:false}
    ]
  };
}
