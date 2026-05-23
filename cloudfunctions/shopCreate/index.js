const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { coupleId, type, name, description, price, stock } = event
  if (!['service','physical','privilege'].includes(type)) return { success: false, error: 'invalid type' }
  if (Number(price) < 1) return { success: false, error: 'price min 1' }
  try {
    const add = await db.collection('shop_items').add({ data: { coupleId, creatorId: OPENID, type, name: String(name || '').slice(0, 100), description: String(description || '').slice(0, 300), price: Number(price), stock: Number(stock || 1), sold_out: false, createdAt: db.serverDate() } })
    return { success: true, itemId: add._id }
  } catch (e) { return { success: false, error: e.message } }
}
