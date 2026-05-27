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
    const [uRes, dreamsCnt, shopCnt, couponsRes] = await Promise.all([
      db.collection('users').where({ _openid: OPENID }).get(),
      db.collection('dreams').where({ coupleId, status: 'completed' }).count(),
      db.collection('shop_items').where({ coupleId }).count(),
      db.collection('coupons').where({ coupleId }).orderBy('createdAt', 'desc').get()
    ])

    const myCoins = uRes.data[0]?.coins || 0

    // 从 couples.memberData 直接读对方信息；首次访问时自动回填
    const partnerOpenid = (couple.members || []).find(id => id !== OPENID)
    let memberData = couple.memberData || {}

    // 检查是否需要从 users 表回填或更新头像
    const partnerMissing = partnerOpenid && !memberData[partnerOpenid]
    const partnerAvatarMissing = partnerOpenid && memberData[partnerOpenid] && !memberData[partnerOpenid].avatar

    if (partnerMissing || partnerAvatarMissing) {
      const allUsers = await db.collection('users').where({ coupleId }).get()
      const newMemberData = { ...memberData }
      for (const u of allUsers.data) {
        const uid = u._openid || ''
        if (uid && (!newMemberData[uid] || (u.avatar && !newMemberData[uid].avatar))) {
          newMemberData[uid] = {
            nickname: u.nickname || newMemberData[uid]?.nickname || '',
            avatar: u.avatar || newMemberData[uid]?.avatar || '',
            gender: u.gender || newMemberData[uid]?.gender || ''
          }
        }
      }
      const myData = uRes.data[0]
      if (OPENID && myData && (!newMemberData[OPENID] || (myData.avatar && !newMemberData[OPENID].avatar))) {
        newMemberData[OPENID] = {
          nickname: myData.nickname || newMemberData[OPENID]?.nickname || '',
          avatar: myData.avatar || newMemberData[OPENID]?.avatar || '',
          gender: myData.gender || newMemberData[OPENID]?.gender || ''
        }
      }
      await db.collection('couples').doc(coupleId).update({ data: { memberData: newMemberData } })
      memberData = newMemberData
    }

    const partnerData = partnerOpenid ? memberData[partnerOpenid] : null

    // 转换 cloud:// 格式的头像为临时 URL
    async function convertAvatar(avatar) {
      if (!avatar || !avatar.startsWith('cloud://')) return avatar || ''
      try {
        const res = await cloud.getTempFileURL({ fileList: [avatar] })
        return res.fileList[0]?.tempFileURL || ''
      } catch { return '' }
    }

    const myAvatarRaw = memberData[OPENID]?.avatar || uRes.data[0]?.avatar || ''
    const partnerAvatarRaw = partnerData?.avatar || ''

    const [myAvatarUrl, partnerAvatarUrl] = await Promise.all([
      convertAvatar(myAvatarRaw),
      convertAvatar(partnerAvatarRaw)
    ])

    return {
      success: true,
      name: couple.name || '',
      inviteCode,
      coins: myCoins,
      myAvatar: myAvatarUrl,
      stats: {
        shop: shopCnt.total,
        dreams: dreamsCnt.total
      },
      coupons: couponsRes.data,
      partner: partnerData ? {
        nickname: partnerData.nickname || 'TA',
        avatar: partnerAvatarUrl,
        gender: partnerData.gender || ''
      } : null
    }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
