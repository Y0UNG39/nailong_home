const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const CM = { EASY: 1, MEDIUM: 3, HARD: 5 }
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { coupleId, title, description, difficulty, type } = event
  if (!coupleId || !title) return { success: false, error: 'missing coupleId or title' }
  const d = ['EASY','MEDIUM','HARD'].includes(difficulty) ? difficulty : 'EASY'
  const t = ['ONCE','DAILY','WEEKLY'].includes(type) ? type : 'ONCE'
  try {
    const cRes = await db.collection('couples').doc(coupleId).get()
    if (!cRes.data) return { success: false, error: 'couple not found' }
    const members = cRes.data.members || []
    if (!members.includes(OPENID)) return { success: false, error: 'not a couple member' }
    const assigneeId = members.find(m => m !== OPENID)
    if (!assigneeId) return { success: false, error: 'couple has only one member' }
    const addRes = await db.collection('tasks').add({ data: { coupleId, creatorId: OPENID, assigneeId, title: String(title).slice(0, 100), description: String(description || '').slice(0, 500), difficulty: d, type: t, coins: CM[d], status: 'pending', createdAt: db.serverDate(), updatedAt: db.serverDate() } })
    return { success: true, taskId: addRes._id, coins: CM[d] }
  } catch (e) { return { success: false, error: e.message } }
}
