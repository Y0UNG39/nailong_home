const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const A=[{id:'sign7',cat:'persistence',name:'签到达人',desc:'连续签到7天',icon:'🔥',color:'#F44336',v:7},{id:'sign30',cat:'persistence',name:'签到王者',desc:'连续签到30天',icon:'🔥',color:'#F44336',v:30},{id:'sign365',cat:'persistence',name:'签到传说',desc:'连续签到365天',icon:'🔥',color:'#F44336',v:365},{id:'task50',cat:'task',name:'任务大师',desc:'发布50个任务',icon:'💪',color:'#FF9800',v:50},{id:'complete100',cat:'task',name:'打卡狂魔',desc:'完成100次打卡',icon:'✅',color:'#FF9800',v:100},{id:'reconcile3',cat:'reconcile',name:'和好如初',desc:'和好3次',icon:'🤝',color:'#4CAF50',v:3},{id:'reconcile10',cat:'reconcile',name:'默契回春',desc:'和好10次',icon:'🤝',color:'#4CAF50',v:10},{id:'day100',cat:'memorial',name:'百日纪念',desc:'在一起100天',icon:'💯',color:'#9C27B0',v:100},{id:'day365',cat:'memorial',name:'周年纪念',desc:'在一起365天',icon:'🎂',color:'#9C27B0',v:365},{id:'day1000',cat:'memorial',name:'千日纪念',desc:'在一起1000天',icon:'💎',color:'#9C27B0',v:1000},{id:'gacha50',cat:'hidden',name:'欧皇降临',desc:'扭蛋50次',icon:'🎰',color:'#FFD700',v:50},{id:'shop10',cat:'hidden',name:'购物达人',desc:'小卖部10次',icon:'🛒',color:'#FFD700',v:10},{id:'dream5',cat:'hidden',name:'梦想成真',desc:'完成5个梦想',icon:'⭐',color:'#FFD700',v:5},{id:'plantMax',cat:'hidden',name:'园艺大师',desc:'植物达到茂盛',icon:'🌳',color:'#FFD700',v:1}]
exports.main=async(e)=>{
  const{coupleId}=e
  try{
    const c=await db.collection('couples').doc(coupleId).get()
    if(!c.data)return{success:false,error:'couple not found'}
    const ex=await db.collection('achievements').where({coupleId}).get()
    const ids=new Set(ex.data.map(a=>a.achievementId))
    const news=[]
    for(const a of A){
      if(ids.has(a.id))continue
      let met=false;const v=a.v
      switch(a.id.includes('sign')?'sign':a.id.includes('gacha')?'gacha':a.id.includes('shop')?'shop':a.id.includes('dream')?'dream':a.id.includes('plant')?'plant':a.id.includes('day')?'days':a.id.includes('task')?'task':a.id.includes('complete')?'complete':a.id.includes('reconcile')?'reconcile':'other'){
        case'sign':case'days':case'reconcile':met=(c.data[a.id.includes('sign')?'signDays':a.id.includes('reconcile')?'reconcile':a.id.includes('day')?'days':'publishTasks']||0)>=v;break
        case'task':met=(c.data.publishTasks||0)>=v;break
        case'complete':met=(c.data.completeTasks||0)>=v;break
        case'gacha':met=(c.data.gachaCount||0)>=v;break
        case'shop':met=(c.data.shopCount||0)>=v;break
        case'dream':met=(c.data.dreamCount||0)>=v;break
        case'plant':met=(c.data.plant&&c.data.plant.stage==='thriving');break
      }
      if(met){await db.collection('achievements').add({data:{coupleId,achievementId:a.id,unlockedAt:db.serverDate()}});news.push(a)}
    }
    return{success:true,newlyUnlocked:news,total:A.length,unlocked:ids.size+news.length}
  }catch(e){return{success:false,error:e.message}}
}
