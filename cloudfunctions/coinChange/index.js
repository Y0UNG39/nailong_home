const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { coupleId, amount, type, description } = event
  try {
    const uRes = await db.collection('users').where({ _openid: OPENID }).get()
    if (uRes.data.length === 0) return { success: false, error: 'user not found' }
    const nb = (uRes.data[0].coins || 0) + (amount || 0)
    await db.collection('users').where({ _openid: OPENID }).update({ data: { coins: nb } })
    await db.collection('coin_logs').add({ data: { coupleId, userId: OPENID, amount: amount || 0, type: type || 'other', description: String(description || '').slice(0, 200), operatorId: OPENID, balanceAfter: nb, createdAt: db.serverDate() } })
    return { success: true, balance: nb }
  } catch (e) { return { success: false, error: e.message } }
}
