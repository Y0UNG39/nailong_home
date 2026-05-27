const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { entryId } = event

  if (!entryId) return { success: false, error: 'missing entryId' }

  try {
    await db.collection('expenses').doc(entryId).remove()
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
