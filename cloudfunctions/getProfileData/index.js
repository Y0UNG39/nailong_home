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

    // 并行取用户、统计、券
    const [uRes, tasksCnt, dreamsCnt, shopCnt, couponsRes] = await Promise.all([
      db.collection('users').where({ _openid: OPENID }).get(),
      db.collection('tasks').where({ coupleId }).count(),
      db.collection('dreams').where({ coupleId, status: 'completed' }).count(),
      db.collection('shop_items').where({ coupleId }).count(),
      db.collection('coupons').where({ coupleId }).orderBy('createdAt', 'desc').get()
    ])

    const myCoins = uRes.data[0]?.coins || 0

    // 从 couples.memberData 直接读对方信息；首次访问时自动回填
    const partnerOpenid = (couple.members || []).find(id => id !== OPENID)
    let memberData = couple.memberData || {}

    if (partnerOpenid && !memberData[partnerOpenid]) {
      // memberData 中没有对方数据 → 从 users 表回填
      const allUsers = await db.collection('users').where({ coupleId }).get()
      const newMemberData = { ...memberData }
      for (const u of allUsers.data) {
        const uid = u._openid || ''
        if (uid && !newMemberData[uid]) {
          newMemberData[uid] = { nickname: u.nickname || '', avatar: u.avatar || '', gender: u.gender || '' }
        }
      }
      // 也把自己加进去（如果缺失）
      const myData = uRes.data[0]
      if (OPENID && myData && !newMemberData[OPENID]) {
        newMemberData[OPENID] = { nickname: myData.nickname || '', avatar: myData.avatar || '', gender: myData.gender || '' }
      }
      await db.collection('couples').doc(coupleId).update({ data: { memberData: newMemberData } })
      memberData = newMemberData
    }

    const partnerData = partnerOpenid ? memberData[partnerOpenid] : null

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
      partner: partnerData ? {
        nickname: partnerData.nickname || 'TA',
        avatar: partnerData.avatar || '',
        gender: partnerData.gender || ''
      } : null
    }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
