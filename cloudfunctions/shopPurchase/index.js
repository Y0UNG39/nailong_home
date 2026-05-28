const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { coupleId, itemId } = event
  try {
    const i = await db.collection('shop_items').doc(itemId).get()
    if (!i.data) return { success: false, error: '商品不存在' }
    if (i.data.sold_out || i.data.stock <= 0) return { success: false, error: '已售罄' }

    const uRes = await db.collection('users').where({ _openid: OPENID }).get()
    if (uRes.data.length === 0) return { success: false, error: 'user not found' }
    let myCoins = uRes.data[0].coins || 0
    let bailout = 0
    if (myCoins < i.data.price) {
      bailout = i.data.price - myCoins
      myCoins = i.data.price
      await db.collection('users').where({ _openid: OPENID }).update({ data: { coins: myCoins } })
      await db.collection('coin_logs').add({ data: { coupleId, userId: OPENID, amount: bailout, type: 'bailout', description: '余额不足自动补贴', operatorId: OPENID, balanceAfter: myCoins, createdAt: db.serverDate() } })
    }

    const nc = myCoins - i.data.price
    await db.collection('users').where({ _openid: OPENID }).update({ data: { coins: nc } })

    const ns = i.data.stock - 1
    await db.collection('shop_items').doc(itemId).update({ data: { stock: ns, sold_out: ns <= 0 } })
    await db.collection('coin_logs').add({ data: { coupleId, userId: OPENID, amount: -i.data.price, type: 'shop', description: '购买: ' + i.data.name, operatorId: OPENID, balanceAfter: nc, createdAt: db.serverDate() } })
    await db.collection('coupons').add({ data: { coupleId, ownerId: OPENID, itemId, type: i.data.type, name: i.data.name, description: i.data.description, status: 'unused', createdAt: db.serverDate() } })
    return { success: true, bailout }
  } catch (e) { return { success: false, error: e.message } }
}
