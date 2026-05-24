const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { coupleId, variety } = event
  if (!coupleId || !variety) return { success: false, error: 'missing coupleId or variety' }

  try {
    const cRes = await db.collection('couples').doc(coupleId).get()
    if (!cRes.data) return { success: false, error: 'couple not found' }
    if (!cRes.data.members.includes(OPENID)) return { success: false, error: 'not a member' }

    const plant = cRes.data.plant || {}
    plant.variety = variety
    await db.collection('couples').doc(coupleId).update({ data: { plant } })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
