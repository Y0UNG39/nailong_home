const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const POOL=[{type:'reward',label:'小奖励',weight:35,icon:'🎁',drops:[{d:'对方为你按肩膀5分钟'},{d:'对方为你唱一首歌'},{d:'对方做饭一次'},{d:'对方去买水果'},{d:'陪你散步30分钟'}]},{type:'coins',label:'互动币',weight:25,icon:'💰',drops:[{d:'获得1互动币',v:1},{d:'获得2互动币',v:2},{d:'获得3互动币',v:3}]},{type:'fertilizer',label:'肥料',weight:20,icon:'🌿',drops:[{d:'基础肥料',t:'basic'},{d:'优质肥料',t:'premium'},{d:'超级肥料',t:'super'}]},{type:'fragment',label:'成就碎片',weight:15,icon:'🧩',drops:[{d:'碎片·星',s:'star'},{d:'碎片·月',s:'moon'},{d:'碎片·花',s:'flower'}]},{type:'rare',label:'限定卡',weight:5,icon:'💎',drops:[{d:'万能愿望券'},{d:'VIP一日体验券'},{d:'免生气金牌'},{d:'双倍奖励日'},{d:'终极扭转命运卡'}]}]
function wp(a){const t=a.reduce((s,x)=>s+x.weight,0);let r=Math.random()*t;for(const it of a){r-=it.weight;if(r<=0)return it}return a[a.length-1]}
exports.main=async(e)=>{
  const{OPENID}=cloud.getWXContext();const{coupleId}=e
  try{
    const c=await db.collection('couples').doc(coupleId).get()
    if(!c.data)return{success:false,error:'couple not found'}
    if((c.data.coins||0)<2)return{success:false,error:'insufficient coins'}
    const cat=wp(POOL);const drop=cat.drops[Math.floor(Math.random()*cat.drops.length)]
    await db.collection('couples').doc(coupleId).update({data:{coins:c.data.coins-2}})
    if(cat.type==='coins'&&drop.v)await db.collection('couples').doc(coupleId).update({data:{coins:c.data.coins-2+drop.v}})
    else if(cat.type==='reward')await db.collection('coupons').add({data:{coupleId,ownerId:OPENID,type:'service',name:drop.d,description:drop.d,status:'unused',createdAt:db.serverDate()}})
    else if(cat.type==='fertilizer')await db.collection('plant_fertilizers').add({data:{coupleId,tier:drop.t,source:'gacha',createdAt:db.serverDate()}})
    else if(cat.type==='fragment'){const ex=await db.collection('achievement_fragments').where({userId:OPENID,series:drop.s}).get();if(ex.data.length>0)await db.collection('achievement_fragments').doc(ex.data[0]._id).update({data:{count:ex.data[0].count+1}});else await db.collection('achievement_fragments').add({data:{userId:OPENID,series:drop.s,count:1,createdAt:db.serverDate()}})}
    else if(cat.type==='rare')await db.collection('coupons').add({data:{coupleId,ownerId:OPENID,type:'privilege',name:drop.d,description:'限定稀有券',status:'unused',createdAt:db.serverDate()}})
    await db.collection('gacha_records').add({data:{coupleId,userId:OPENID,resultType:cat.type,resultLabel:cat.label,resultDescription:drop.d,resultIcon:cat.icon,createdAt:db.serverDate()}})
    return{success:true,result:{type:cat.type,label:cat.label,description:drop.d,icon:cat.icon}}
  }catch(e){return{success:false,error:e.message}}
}
