const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { taskId, approved, rejectReason } = event
  try {
    const res = await db.collection('tasks').doc(taskId).get()
    if (!res.data) return { success: false, error: 'task not found' }
    if (res.data.creatorId !== OPENID) return { success: false, error: 'not creator' }
    if (res.data.status !== 'submitted') return { success: false, error: 'status: ' + res.data.status }
    if (approved) {
      await db.collection('tasks').doc(taskId).update({ data: { status: 'approved', updatedAt: db.serverDate() } })
      return { success: true, message: 'approved', coins: res.data.coins || 0 }
    }
    await db.collection('tasks').doc(taskId).update({ data: { status: 'rejected', rejectReason: String(rejectReason || '').slice(0, 500), rejectedAt: db.serverDate(), updatedAt: db.serverDate() } })
    return { success: true, message: 'rejected' }
  } catch (e) { return { success: false, error: e.message } }
}
