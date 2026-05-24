const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { coupleId, type, name, description, price, stock } = event
  if (!['service','physical','privilege'].includes(type)) return { success: false, error: '无效的商品类型' }
  if (Number(price) < 1) return { success: false, error: '价格至少为1' }
  try {
    const dup = await db.collection('shop_items').where({ coupleId, name: String(name || '').trim() }).get()
    if (dup.data.length > 0) return { success: false, error: '已存在同名商品' }
    const add = await db.collection('shop_items').add({ data: { coupleId, creatorId: OPENID, type, name: String(name || '').slice(0, 100), description: String(description || '').slice(0, 300), price: Number(price), stock: Number(stock || 1), sold_out: false, createdAt: db.serverDate() } })
    return { success: true, itemId: add._id }
  } catch (e) { return { success: false, error: e.message } }
}
