const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { coupleId, date, content, imageUrl } = event

  if (!coupleId || !date || !content) return { success: false, error: 'missing params' }
  if (content.length > 500) return { success: false, error: 'content too long' }

  try {
    const res = await db.collection('diary_entries').add({
      data: {
        coupleId,
        authorId: OPENID,
        date,
        content: content.trim(),
        imageUrl: imageUrl || '',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    })
    return { success: true, entryId: res._id }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
