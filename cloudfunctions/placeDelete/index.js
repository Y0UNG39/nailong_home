const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
exports.main = async (event) => {
  const { placeId } = event
  if (!placeId) return { success: false, error: 'missing placeId' }
  try {
    await db.collection('places').doc(placeId).remove()
    return { success: true }
  } catch (e) { return { success: false, error: e.message } }
}
