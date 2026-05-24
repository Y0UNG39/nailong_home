const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { coupleId, title, imageId, category } = event
  const cats = ['travel','home','food','experience','material']
  try {
    const dup = await db.collection('dreams').where({ coupleId, title: String(title || '').trim(), category: cats.includes(category) ? category : 'travel', status: 'dreaming' }).get()
    if (dup.data.length > 0) return { success: false, error: '该分类下已存在同名梦想' }
    const add = await db.collection('dreams').add({ data: { coupleId, creatorId: OPENID, title: String(title || '').slice(0, 100), image: imageId || '', category: cats.includes(category) ? category : 'travel', status: 'dreaming', likes: [], createdAt: db.serverDate() } })
    return { success: true, dreamId: add._id }
  } catch (e) { return { success: false, error: e.message } }
}
