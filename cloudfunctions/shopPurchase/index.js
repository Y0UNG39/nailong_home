const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { coupleId, itemId } = event
  try {
    const i = await db.collection('shop_items').doc(itemId).get()
    if (!i.data) return { success: false, error: 'item not found' }
    if (i.data.sold_out || i.data.stock <= 0) return { success: false, error: 'sold out' }
    const c = await db.collection('couples').doc(coupleId).get()
    if (!c.data) return { success: false, error: 'couple not found' }
    if ((c.data.coins || 0) < i.data.price) return { success: false, error: 'insufficient coins' }
    await db.collection('couples').doc(coupleId).update({ data: { coins: c.data.coins - i.data.price } })
    const ns = i.data.stock - 1
    await db.collection('shop_items').doc(itemId).update({ data: { stock: ns, sold_out: ns <= 0 } })
    await db.collection('coin_logs').add({ data: { coupleId, amount: -i.data.price, type: 'shop', description: '购买: ' + i.data.name, operatorId: OPENID, balanceAfter: c.data.coins - i.data.price, createdAt: db.serverDate() } })
    await db.collection('coupons').add({ data: { coupleId, ownerId: OPENID, itemId, type: i.data.type, name: i.data.name, description: i.data.description, status: 'unused', createdAt: db.serverDate() } })
    return { success: true }
  } catch (e) { return { success: false, error: e.message } }
}
