const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { inviteCode } = event

  if (!inviteCode) return { success: false, error: '请输入邀请码' }

  try {
    const uRes = await db.collection('users').where({ _openid: OPENID }).get()
    if (!uRes.data.length) return { success: false, error: 'user not found' }
    if (uRes.data[0].coupleId) return { success: false, error: '你已经在一个家里了' }

    const cRes = await db.collection('couples').where({ inviteCode }).get()
    if (!cRes.data.length) return { success: false, error: '邀请码不存在' }

    const couple = cRes.data[0]
    if ((couple.members || []).length >= 2) return { success: false, error: '这个家已经满员了' }

    await db.collection('couples').doc(couple._id).update({
      data: { members: [...(couple.members || []), OPENID] }
    })
    await db.collection('users').doc(uRes.data[0]._id).update({ data: { coupleId: couple._id } })

    return { success: true, coupleId: couple._id, coupleName: couple.name }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
