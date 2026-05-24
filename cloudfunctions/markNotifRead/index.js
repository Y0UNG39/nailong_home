const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
exports.main = async (event) => {
  const { notifId } = event
  if (!notifId) return { success: false, error: 'missing notifId' }
  try {
    await db.collection('notifications').doc(notifId).update({ data: { read: true } })
    return { success: true }
  } catch (e) { return { success: false, error: e.message } }
}
