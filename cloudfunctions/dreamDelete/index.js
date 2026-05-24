const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
exports.main = async (event) => {
  const { dreamId } = event
  if (!dreamId) return { success: false, error: 'missing dreamId' }
  try {
    await db.collection('dreams').doc(dreamId).remove()
    return { success: true }
  } catch (e) { return { success: false, error: e.message } }
}
