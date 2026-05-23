const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { coupleId, amount, type, description } = event
  try {
    const c = await db.collection('couples').doc(coupleId).get()
    if (!c.data) return { success: false, error: 'couple not found' }
    const nb = (c.data.coins || 0) + (amount || 0)
    await db.collection('couples').doc(coupleId).update({ data: { coins: nb } })
    await db.collection('coin_logs').add({ data: { coupleId, amount: amount || 0, type: type || 'other', description: String(description || '').slice(0, 200), operatorId: OPENID, balanceAfter: nb, createdAt: db.serverDate() } })
    return { success: true, balance: nb }
  } catch (e) { return { success: false, error: e.message } }
}
