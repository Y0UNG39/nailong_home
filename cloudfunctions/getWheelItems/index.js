const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { coupleId } = event
  if (!coupleId) return { success: false, error: 'missing coupleId' }
  try {
    const res = await db.collection('wheel_items').where({ coupleId }).orderBy('createdAt', 'asc').get()
    const items = (res.data || []).map(item => ({ _id: item._id, label: item.label, weight: item.weight || 1 }))
    return { success: true, items }
  } catch (e) { return { success: false, error: e.message } }
}
