const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { nickname, avatar, gender } = event
  try {
    const res = await db.collection('users').where({ _openid: OPENID }).get()
    if (res.data.length === 0) {
      const safeNick = String(nickname || '').slice(0, 100)
      const safeAvatar = String(avatar || '').slice(0, 500)
      const addRes = await db.collection('users').add({ data: { _openid: OPENID, nickname: safeNick, avatar: safeAvatar, gender: gender || '', coins: 0, coupleId: null, createdAt: db.serverDate() } })
      return { success: true, openid: OPENID, isNew: true, user: { _id: addRes._id, nickname: safeNick, avatar: safeAvatar, gender: gender || '', coins: 0, coupleId: null } }
    }
    // 老用户：如果传了头像或昵称就更新
    const userData = res.data[0]
    const updateData = {}
    if (avatar) { updateData.avatar = String(avatar).slice(0, 500) }
    if (nickname) { updateData.nickname = String(nickname).slice(0, 100) }
    if (gender) { updateData.gender = gender }
    if (Object.keys(updateData).length) {
      await db.collection('users').doc(userData._id).update({ data: updateData })
      Object.assign(userData, updateData)
    }
    return { success: true, openid: OPENID, isNew: false, user: userData }
  } catch (e) { return { success: false, error: e.message } }
}
