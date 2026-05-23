const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { coupleId, title, imageId, category } = event
  const cats = ['travel','home','food','experience','material']
  try {
    const add = await db.collection('dreams').add({ data: { coupleId, creatorId: OPENID, title: String(title || '').slice(0, 100), image: imageId || '', category: cats.includes(category) ? category : 'travel', status: 'dreaming', likes: [], createdAt: db.serverDate() } })
    return { success: true, dreamId: add._id }
  } catch (e) { return { success: false, error: e.message } }
}
