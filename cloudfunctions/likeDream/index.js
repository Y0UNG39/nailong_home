const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { dreamId } = event
  if (!dreamId) return { success: false, error: 'missing dreamId' }

  try {
    const res = await db.collection('dreams').doc(dreamId).get()
    if (!res.data) return { success: false, error: 'dream not found' }

    const likes = res.data.likes || []
    const idx = likes.indexOf(OPENID)
    if (idx >= 0) {
      likes.splice(idx, 1)
    } else {
      likes.push(OPENID)
    }
    await db.collection('dreams').doc(dreamId).update({ data: { likes } })
    return { success: true, likes }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
