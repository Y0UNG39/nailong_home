const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { coupleId } = event
  if (!coupleId) return { success: false, error: 'missing coupleId' }

  try {
    const res = await db.collection('couples').doc(coupleId).get()
    if (!res.data) return { success: false, error: 'couple not found' }

    let { inviteCode } = res.data
    if (!inviteCode) {
      inviteCode = String(Math.floor(100000 + Math.random() * 900000))
      await db.collection('couples').doc(coupleId).update({ data: { inviteCode } })
    }

    const uRes = await db.collection('users').where({ _openid: OPENID }).get()
    const myCoins = uRes.data[0]?.coins || 0

    return {
      success: true,
      name: res.data.name || '',
      inviteCode,
      memberCount: (res.data.members || []).length,
      coins: myCoins,
      createdAt: res.data.createdAt || ''
    }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
