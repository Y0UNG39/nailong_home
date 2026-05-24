const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  try {
    const res = await db.collection('notifications')
      .where({ toUserId: OPENID })
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()
    return { success: true, notifications: res.data || [] }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
