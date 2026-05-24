const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function todayStr() {
  const now = new Date()
  const bj = new Date(now.getTime() + 8 * 3600000)
  return bj.toISOString().split('T')[0]
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { coupleId } = event
  if (!coupleId) return { success: false, error: 'missing coupleId' }

  try {
    const res = await db.collection('couples').doc(coupleId).get()
    if (!res.data) return { success: false, error: 'couple not found' }

    let { inviteCode } = res.data
    if (!inviteCode) {
      inviteCode = String(Math.floor(100000 + Math.random() * 900000))
      await db.collection('couples').doc(coupleId).update({ data: { inviteCode } })
    }

    // 当前用户硬币
    const uRes = await db.collection('users').where({ _openid: OPENID }).get()
    const myCoins = uRes.data[0]?.coins || 0

    // 检查当前用户今天是否已手动浇水
    const td = todayStr()
    const waterCnt = await db.collection('plant_logs')
      .where({ coupleId, eventType: 'water', source: 'manual', operatorId: OPENID, waterDate: td })
      .count()

    return {
      success: true,
      name: res.data.name || '',
      inviteCode,
      memberCount: (res.data.members || []).length,
      coins: myCoins,
      plant: res.data.plant,
      wateredToday: waterCnt.total > 0,
      createdAt: res.data.createdAt || ''
    }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
