const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { coupleId } = event
  if (!coupleId) return { success: false, error: 'missing coupleId' }

  try {
    const res = await db.collection('dreams')
      .where({ coupleId })
      .orderBy('createdAt', 'desc')
      .get()

    return { success: true, dreams: res.data }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
