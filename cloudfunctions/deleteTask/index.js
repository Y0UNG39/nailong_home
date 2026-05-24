const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { taskId } = event
  if (!taskId) return { success: false, error: 'missing taskId' }

  try {
    const res = await db.collection('tasks').doc(taskId).get()
    if (!res.data) return { success: false, error: 'task not found' }
    if (res.data.creatorId !== OPENID) return { success: false, error: 'not creator' }
    if (res.data.status === 'approved') return { success: false, error: 'cannot delete completed task' }

    await db.collection('tasks').doc(taskId).remove()
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
