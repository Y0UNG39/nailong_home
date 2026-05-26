const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { name } = event

  try {
    const uRes = await db.collection('users').where({ _openid: OPENID }).get()
    if (!uRes.data.length) return { success: false, error: 'user not found' }
    if (uRes.data[0].coupleId) return { success: false, error: 'already in a couple' }

    // 生成6位邀请码
    const code = String(Math.floor(100000 + Math.random() * 900000))

    const addRes = await db.collection('couples').add({
      data: {
        name: String(name || '').slice(0, 20) || '我们的家',
        inviteCode: code,
        members: [OPENID],
        coins: 0,
        createdAt: db.serverDate()
      }
    })

    await db.collection('users').doc(uRes.data[0]._id).update({ data: { coupleId: addRes._id } })

    return { success: true, coupleId: addRes._id, inviteCode: code }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
