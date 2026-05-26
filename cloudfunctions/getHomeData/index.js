const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { coupleId } = event
  if (!coupleId) return { success: false, error: 'missing coupleId' }

  try {
    const coupleRes = await db.collection('couples').doc(coupleId).get()
    const couple = coupleRes.data
    if (!couple) return { success: false, error: 'couple not found' }

    // 邀请码
    let { inviteCode } = couple
    if (!inviteCode) {
      inviteCode = String(Math.floor(100000 + Math.random() * 900000))
      await db.collection('couples').doc(coupleId).update({ data: { inviteCode } })
    }

    // 当前用户硬币
    const uRes = await db.collection('users').where({ _openid: OPENID }).get()
    const myCoins = uRes.data[0]?.coins || 0

    return {
      success: true,
      name: couple.name || '',
      coins: myCoins
    }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
