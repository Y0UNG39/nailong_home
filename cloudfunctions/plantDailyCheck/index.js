const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
exports.main = async () => {
  const now = Date.now()
  try {
    const res = await db.collection('couples').field({ plant: true, _id: true }).get()
    let checked = 0, drooped = 0, wilted = 0
    for (const c of res.data) {
      if (!c.plant || !c.plant.lastWatered) continue
      checked++
      const hrs = (now - new Date(c.plant.lastWatered).getTime()) / 3600000
      const cur = c.plant.health || 'healthy'
      let nh = cur
      if (hrs > 72 && cur !== 'wilted') { nh = 'wilted'; wilted++ }
      else if (hrs > 24 && cur === 'healthy') { nh = 'drooping'; drooped++ }
      if (nh !== cur) {
        await db.collection('couples').doc(c._id).update({ data: { plant: { ...c.plant, health: nh } } })
        await db.collection('plant_logs').add({ data: { coupleId: c._id, eventType: nh === 'wilted' ? 'wilt' : 'droop', fromHealth: cur, toHealth: nh, hoursSinceWater: Math.round(hrs), createdAt: db.serverDate() } })
      }
    }
    return { success: true, stats: { checked, drooped, wilted } }
  } catch (e) { return { success: false, error: e.message } }
}
