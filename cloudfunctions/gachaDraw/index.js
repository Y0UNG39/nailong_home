const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function weightedPick(items) {
  const total = items.reduce((s, x) => s + x.weight, 0)
  let r = Math.random() * total
  for (const it of items) {
    r -= it.weight
    if (r <= 0) return it
  }
  return items[items.length - 1]
}

exports.main = async (e) => {
  const { OPENID } = cloud.getWXContext()
  const { coupleId } = e

  try {
    // 读取用户自己的硬币
    const uRes = await db.collection('users').where({ _openid: OPENID }).get()
    if (uRes.data.length === 0) return { success: false, error: 'user not found' }
    const myCoins = uRes.data[0].coins || 0
    if (myCoins < 2) return { success: false, error: '硬币不足' }

    // 读取该 couple 的自定义奖池
    const poolRes = await db.collection('gacha_pool').where({ coupleId }).get()
    const pool = poolRes.data || []
    if (pool.length === 0) return { success: false, error: '奖池为空，请先添加奖励' }

    const pick = weightedPick(pool)

    // 扣币
    let nc = myCoins - 2

    // 根据类型处理奖励
    if (pick.type === 'coins') {
      const v = pick.coinValue || 1
      nc = myCoins - 2 + v
    } else if (pick.type === 'reward' || pick.type === 'rare') {
      await db.collection('coupons').add({
        data: { coupleId, ownerId: OPENID, type: pick.type === 'rare' ? 'privilege' : 'service', name: pick.description, description: pick.description, status: 'unused', createdAt: db.serverDate() }
      })
    } else if (pick.type === 'fertilizer') {
      await db.collection('plant_fertilizers').add({
        data: { coupleId, tier: pick.fertilizerTier || 'basic', source: 'gacha', createdAt: db.serverDate() }
      })
    } else if (pick.type === 'fragment') {
      const series = pick.fragmentSeries || 'star'
      const ex = await db.collection('achievement_fragments').where({ userId: OPENID, series }).get()
      if (ex.data.length > 0) {
        await db.collection('achievement_fragments').doc(ex.data[0]._id).update({ data: { count: ex.data[0].count + 1 } })
      } else {
        await db.collection('achievement_fragments').add({ data: { userId: OPENID, series, count: 1, createdAt: db.serverDate() } })
      }
    }

    await db.collection('users').where({ _openid: OPENID }).update({ data: { coins: nc } })

    await db.collection('gacha_records').add({
      data: { coupleId, userId: OPENID, resultType: pick.type, resultLabel: pick.label, resultDescription: pick.description, resultIcon: pick.icon, createdAt: db.serverDate() }
    })

    return { success: true, result: { type: pick.type, label: pick.label, description: pick.description, icon: pick.icon } }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
