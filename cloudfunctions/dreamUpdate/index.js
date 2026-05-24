const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
exports.main = async (event) => {
  const { dreamId, title, category } = event
  if (!dreamId) return { success: false, error: 'missing dreamId' }
  const cats = ['travel','home','food','experience','material']
  try {
    const data = {}
    if (title) data.title = String(title).slice(0, 100)
    if (category && cats.includes(category)) data.category = category
    if (Object.keys(data).length === 0) return { success: false, error: 'nothing to update' }
    await db.collection('dreams').doc(dreamId).update({ data })
    return { success: true }
  } catch (e) { return { success: false, error: e.message } }
}
