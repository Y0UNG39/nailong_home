const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { avatar } = event
  if (!avatar) return { success: false, error: 'missing avatar' }

  try {
    const res = await db.collection('users').where({ _openid: OPENID }).get()
    if (res.data.length === 0) return { success: false, error: 'user not found' }

    await db.collection('users').doc(res.data[0]._id).update({
      data: { avatar: String(avatar).slice(0, 500) }
    })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
