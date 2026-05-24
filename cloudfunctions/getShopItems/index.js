const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { coupleId } = event
  if (!coupleId) return { success: false, error: 'missing coupleId' }

  try {
    const res = await db.collection('shop_items')
      .where({ coupleId })
      .orderBy('createdAt', 'desc')
      .get()

    const items = res.data
    const uidSet = new Set()
    items.forEach(i => { if (i.creatorId) uidSet.add(i.creatorId) })
    const nickMap = {}
    if (uidSet.size > 0) {
      const users = await db.collection('users').where({ _openid: db.command.in([...uidSet]) }).get()
      users.data.forEach(u => { nickMap[u._openid] = u.nickname || 'TA' })
    }

    const list = items.map(i => ({
      _id: i._id,
      type: i.type,
      name: i.name,
      description: i.description || '',
      price: i.price || 0,
      stock: i.stock || 0,
      creatorNickname: nickMap[i.creatorId] || (i.creatorId === OPENID ? '你' : 'TA'),
      createdAt: i.createdAt
    }))

    return { success: true, items: list }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
