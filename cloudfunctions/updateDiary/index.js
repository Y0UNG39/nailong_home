const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { entryId, content, imageUrl } = event

  if (!entryId || !content) return { success: false, error: 'missing params' }
  if (content.length > 500) return { success: false, error: 'content too long' }

  try {
    const entry = await db.collection('diary_entries').doc(entryId).get()
    if (!entry.data || entry.data.authorId !== OPENID) return { success: false, error: 'unauthorized' }

    await db.collection('diary_entries').doc(entryId).update({
      data: {
        content: content.trim(),
        imageUrl: imageUrl || '',
        updatedAt: db.serverDate()
      }
    })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
