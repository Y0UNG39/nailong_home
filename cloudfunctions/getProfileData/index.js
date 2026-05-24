const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { coupleId } = event
  if (!coupleId) return { success: false, error: 'missing coupleId' }

  try {
    const coupleRes = await db.collection('couples').doc(coupleId).get()
    if (!coupleRes.data) return { success: false, error: 'couple not found' }
    const couple = coupleRes.data

    let { inviteCode } = couple
    if (!inviteCode) {
      inviteCode = String(Math.floor(100000 + Math.random() * 900000))
      await db.collection('couples').doc(coupleId).update({ data: { inviteCode } })
    }

    // 并行取用户、统计、券、对方
    const partnerOpenid = (couple.members || []).find(id => id !== OPENID)

    const [uRes, tasksCnt, dreamsCnt, shopCnt, couponsRes, partnerRes] = await Promise.all([
      db.collection('users').where({ _openid: OPENID }).get(),
      db.collection('tasks').where({ coupleId }).count(),
      db.collection('dreams').where({ coupleId, status: 'completed' }).count(),
      db.collection('shop_items').where({ coupleId }).count(),
      db.collection('coupons').where({ coupleId }).orderBy('createdAt', 'desc').get(),
      partnerOpenid ? db.collection('users').where({ _openid: partnerOpenid }).get() : Promise.resolve({ data: [] })
    ])

    const myCoins = uRes.data[0]?.coins || 0
    const partner = partnerRes.data[0]

    return {
      success: true,
      name: couple.name || '',
      inviteCode,
      coins: myCoins,
      stats: {
        tasks: tasksCnt.total,
        shop: shopCnt.total,
        dreams: dreamsCnt.total
      },
      coupons: couponsRes.data,
      partner: partner ? {
        nickname: partner.nickname || 'TA',
        avatar: partner.avatar || '',
        gender: partner.gender || ''
      } : null
    }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
