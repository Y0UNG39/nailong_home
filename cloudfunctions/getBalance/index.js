const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  try {
    const uRes = await db.collection('users').where({ _openid: OPENID }).get()
    const balance = uRes.data[0]?.coins || 0
    const logs = await db.collection('coin_logs').where({ userId: OPENID }).orderBy('createdAt', 'desc').limit(20).get()
    return { success: true, balance, logs: logs.data || [] }
  } catch (e) { return { success: false, error: e.message } }
}
