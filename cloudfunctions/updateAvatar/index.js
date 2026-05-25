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
    const user = res.data[0]

    await db.collection('users').doc(user._id).update({
      data: { avatar: String(avatar).slice(0, 500) }
    })

    // 同步头像到 couples 文档，让对方能直接读到
    if (user.coupleId) {
      const key = `memberData.${OPENID}.avatar`
      await db.collection('couples').doc(user.coupleId).update({
        data: { [key]: String(avatar).slice(0, 500) }
      })
    }
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
