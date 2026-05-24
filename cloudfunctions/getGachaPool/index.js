const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
exports.main = async (event) => {
  const { coupleId } = event
  if (!coupleId) return { success: false, error: 'missing coupleId' }
  try {
    const res = await db.collection('gacha_pool').where({ coupleId }).orderBy('createdAt', 'desc').get()
    return { success: true, items: res.data || [] }
  } catch (e) { return { success: false, error: e.message } }
}
