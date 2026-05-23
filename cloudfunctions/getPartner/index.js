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

    const partnerOpenid = (cRes.data.members || []).find(id => id !== OPENID)
    if (!partnerOpenid) return { success: false, error: 'partner not joined yet' }

    const uRes = await db.collection('users').where({ _openid: partnerOpenid }).get()
    if (!uRes.data.length) return { success: false, error: 'partner user not found' }

    const p = uRes.data[0]
    return { success: true, partner: { nickname: p.nickname || 'TA', avatar: p.avatar || '' } }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
