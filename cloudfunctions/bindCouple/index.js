const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { coupleId } = event
  if (!coupleId) return { success: false, error: 'missing coupleId' }
  try {
    const cRes = await db.collection('couples').doc(coupleId).get()
    if (!cRes.data) return { success: false, error: 'couple not found' }
    const members = cRes.data.members || []
    if (members.length >= 2) return { success: false, error: 'couple already full' }
    const uRes = await db.collection('users').where({ _openid: OPENID }).get()
    if (!uRes.data.length) return { success: false, error: 'user not found' }
    if (uRes.data[0].coupleId) return { success: false, error: 'already in a couple' }
    await db.collection('users').doc(uRes.data[0]._id).update({ data: { coupleId } })
    await db.collection('couples').doc(coupleId).update({ data: { members: [...members, OPENID] } })
    return { success: true, coupleId }
  } catch (e) { return { success: false, error: e.message } }
}
