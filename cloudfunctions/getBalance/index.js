const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
exports.main = async (event) => {
  const { coupleId, limit } = event
  try {
    const c = await db.collection('couples').doc(coupleId).get()
    if (!c.data) return { success: false, error: 'couple not found' }
    const logs = await db.collection('coin_logs').where({ coupleId }).orderBy('createdAt', 'desc').limit(limit || 20).get()
    return { success: true, balance: c.data.coins || 0, logs: logs.data || [] }
  } catch (e) { return { success: false, error: e.message } }
}
