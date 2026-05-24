const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { coupleId, name, category, note, source } = event
  const cats = ['restaurant','spot','exhibition','cinema','other']
  try {
    const dup = await db.collection('places').where({ coupleId, name: String(name || '').trim() }).get()
    if (dup.data.length > 0) return { success: false, error: '已存在同名地点' }
    await db.collection('places').add({ data: { coupleId, creatorId: OPENID, name: String(name || '').slice(0, 100), category: cats.includes(category) ? category : 'other', note: String(note || '').slice(0, 300), source: source === 'next_time' ? 'next_time' : 'want_to_go', status: 'active', createdAt: db.serverDate(), updatedAt: db.serverDate() } })
    return { success: true }
  } catch (e) { return { success: false, error: e.message } }
}
