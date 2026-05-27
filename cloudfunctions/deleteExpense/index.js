const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { entryId } = event

  if (!entryId) return { success: false, error: 'missing entryId' }

  try {
    const entry = await db.collection('expenses').doc(entryId).get()
    if (!entry.data || entry.data._openid !== OPENID) {
      return { success: false, error: 'unauthorized' }
    }
    await db.collection('expenses').doc(entryId).remove()
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
