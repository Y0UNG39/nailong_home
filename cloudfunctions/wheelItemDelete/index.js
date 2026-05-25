const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { itemId } = event
  if (!itemId) return { success: false, error: 'missing itemId' }
  try {
    await db.collection('wheel_items').doc(itemId).remove()
    return { success: true }
  } catch (e) { return { success: false, error: e.message } }
}
