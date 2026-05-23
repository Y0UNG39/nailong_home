const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { taskId, proofNote, proofImage } = event
  try {
    const res = await db.collection('tasks').doc(taskId).get()
    if (!res.data) return { success: false, error: 'task not found' }
    if (res.data.assigneeId !== OPENID) return { success: false, error: 'not assignee' }
    if (res.data.status !== 'pending') return { success: false, error: 'status: ' + res.data.status }
    await db.collection('tasks').doc(taskId).update({ data: { status: 'submitted', proofNote: String(proofNote || '').slice(0, 500), proofImage: proofImage || '', updatedAt: db.serverDate() } })
    return { success: true }
  } catch (e) { return { success: false, error: e.message } }
}
