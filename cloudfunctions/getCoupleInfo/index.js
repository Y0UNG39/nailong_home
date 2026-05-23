const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { coupleId } = event
  if (!coupleId) return { success: false, error: 'missing coupleId' }

  try {
    const res = await db.collection('couples').doc(coupleId).get()
    if (!res.data) return { success: false, error: 'couple not found' }

    let { inviteCode } = res.data
    // 兼容旧记录：如果没有 inviteCode 就现场生成一个
    if (!inviteCode) {
      inviteCode = String(Math.floor(100000 + Math.random() * 900000))
      await db.collection('couples').doc(coupleId).update({ data: { inviteCode } })
    }

    return {
      success: true,
      name: res.data.name,
      inviteCode,
      memberCount: (res.data.members || []).length,
      coins: res.data.coins || 0,
      plant: res.data.plant
    }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
