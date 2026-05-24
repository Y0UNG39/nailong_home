const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const G = { task: 5, checkin: 3, fertilizer: 15, manual: 10 }
const T = [
  { s: 'seedling', max: 24 },
  { s: 'growing', max: 49 },
  { s: 'flowering', max: 74 },
  { s: 'thriving', max: 100 }
]

function todayStr() {
  const now = new Date()
  const bj = new Date(now.getTime() + 8 * 3600000)
  return bj.toISOString().split('T')[0]
}

exports.main = async (e) => {
  const { OPENID } = cloud.getWXContext()
  const { coupleId, source } = e

  try {
    if (source === 'manual') {
      const td = todayStr()
      const cnt = await db.collection('plant_logs')
        .where({ coupleId, eventType: 'water', source: 'manual', operatorId: OPENID, waterDate: td })
        .count()
      if (cnt.total > 0) {
        return { success: false, error: '今天已经浇过了' }
      }
    }

    const c = await db.collection('couples').doc(coupleId).get()
    if (!c.data) return { success: false, error: 'couple not found' }

    const p = c.data.plant || { stage: 'seedling', growthValue: 0, health: 'healthy', variety: 'default' }
    const add = G[source] || 3
    let nv = Math.min(100, (p.growthValue || 0) + add)
    let ns = p.stage
    let lu = false

    const ti = T.findIndex(t => t.s === p.stage)
    if (ti >= 0 && ti < T.length - 1 && nv > T[ti].max) {
      ns = T[ti + 1].s
      lu = true
      await db.collection('plant_logs').add({
        data: { coupleId, eventType: 'level_up', fromStage: p.stage, toStage: ns, growthValue: nv, source, operatorId: OPENID, waterDate: todayStr(), createdAt: db.serverDate() }
      })
    }

    const nh = p.health === 'wilted' ? 'healthy' : (p.health || 'healthy')
    await db.collection('couples').doc(coupleId).update({
      data: { plant: { stage: ns, growthValue: nv, health: nh, variety: p.variety, lastWatered: db.serverDate() } }
    })
    await db.collection('plant_logs').add({
      data: { coupleId, eventType: 'water', growthValue: nv, source, operatorId: OPENID, waterDate: todayStr(), createdAt: db.serverDate() }
    })

    return { success: true, stage: ns, growthValue: nv, health: nh, leveledUp: lu, add }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
