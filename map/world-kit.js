export const BUILDING_STYLES = Object.freeze({
  'brick-warm': {
    label:'Warm Brick', roof:'#5b5149', top:'#76665a', faceX:'#73503f', faceY:'#624538',
    trim:'#b69a7b', window:'#233945', windowNight:'#e4bd72', accent:'#c98643'
  },
  'brick-dark': {
    label:'Dark Brick', roof:'#3e4143', top:'#55595b', faceX:'#51443f', faceY:'#443a36',
    trim:'#8d8980', window:'#20343f', windowNight:'#d9ad60', accent:'#a75843'
  },
  'concrete': {
    label:'Concrete', roof:'#54595e', top:'#777c80', faceX:'#6f7478', faceY:'#60666b',
    trim:'#9ca1a4', window:'#203a48', windowNight:'#cad8b1', accent:'#cf8c46'
  },
  'glass-office': {
    label:'Glass Office', roof:'#434a50', top:'#66717a', faceX:'#405b69', faceY:'#354e5b',
    trim:'#89949a', window:'#1f4456', windowNight:'#9fc4c8', accent:'#b9793d'
  },
  'industrial': {
    label:'Industrial', roof:'#42484a', top:'#62696b', faceX:'#59605f', faceY:'#4d5554',
    trim:'#888e89', window:'#2d454d', windowNight:'#c0c79a', accent:'#9d6544'
  },
  'civic': {
    label:'Civic Stone', roof:'#50545a', top:'#81848a', faceX:'#777a80', faceY:'#686c72',
    trim:'#aaa69b', window:'#2a414c', windowNight:'#d9d09e', accent:'#8e765f'
  },
  'casino-neon': {
    label:'Casino Neon', roof:'#39363f', top:'#594d62', faceX:'#654c65', faceY:'#554256',
    trim:'#b38aae', window:'#302e49', windowNight:'#f0a7cf', accent:'#d98bc8'
  },
  'night-neon': {
    label:'Night Neon', roof:'#302e36', top:'#4a4250', faceX:'#514251', faceY:'#443745',
    trim:'#8b748f', window:'#22263b', windowNight:'#9ac4ff', accent:'#b47ed0'
  },
  'medical': {
    label:'Medical', roof:'#596166', top:'#858d90', faceX:'#7a8585', faceY:'#6c7777',
    trim:'#d4d4c7', window:'#294650', windowNight:'#c6e1d7', accent:'#74a798'
  }
});

export const PROP_STYLES = Object.freeze({
  tree:{label:'Tree',color:'#4f7258',radius:18,collision:false},
  streetlight:{label:'Streetlight',color:'#879199',radius:8,collision:false},
  bench:{label:'Bench',color:'#7e634d',radius:12,collision:false},
  dumpster:{label:'Dumpster',color:'#466052',radius:13,collision:true},
  hydrant:{label:'Hydrant',color:'#a64e45',radius:7,collision:false},
  'bus-stop':{label:'Bus Stop',color:'#536e7c',radius:16,collision:false},
  'parked-car':{label:'Parked Car',color:'#687785',radius:17,collision:true},
  planter:{label:'Planter',color:'#586958',radius:13,collision:true}
});

export const INTERACTION_STYLES = Object.freeze({
  door:{label:'Door / Enter',color:'#d78e36',radius:12},
  bank:{label:'Bank',color:'#8fa9c2',radius:12},
  casino:{label:'Casino',color:'#b481b2',radius:12},
  shop:{label:'Shop',color:'#cf9d68',radius:12},
  crime:{label:'Crime',color:'#c76363',radius:12},
  gym:{label:'Gym',color:'#79a284',radius:12},
  airport:{label:'Airport',color:'#83a4b7',radius:12},
  nightclub:{label:'Nightclub',color:'#a67da6',radius:12},
  hospital:{label:'Hospital',color:'#8cb9aa',radius:12}
});

export function styleForBuilding(id){
  return BUILDING_STYLES[id] || BUILDING_STYLES['brick-warm'];
}

export function shadeHex(hex,amount){
  const safe=/^#[0-9a-f]{6}$/i.test(String(hex))?String(hex):'#777777';
  const c=safe.slice(1);
  let r=parseInt(c.slice(0,2),16),g=parseInt(c.slice(2,4),16),b=parseInt(c.slice(4,6),16);
  const factor=amount<0?1+amount:1-amount;
  if(amount>=0){
    r=r+(255-r)*amount; g=g+(255-g)*amount; b=b+(255-b)*amount;
  }else{
    r*=factor;g*=factor;b*=factor;
  }
  return `rgb(${Math.max(0,Math.min(255,Math.round(r)))},${Math.max(0,Math.min(255,Math.round(g)))},${Math.max(0,Math.min(255,Math.round(b)))})`;
}
