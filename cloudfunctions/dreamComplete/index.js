const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
exports.main = async (event) => {
  const { dreamId } = event
  try {
    const d = await db.collection('dreams').doc(dreamId).get()
    if (!d.data) return { success: false, error: 'dream not found' }
    const ns = d.data.status === 'completed' ? 'dreaming' : 'completed'
    await db.collection('dreams').doc(dreamId).update({ data: { status: ns, completedAt: ns === 'completed' ? db.serverDate() : null } })
    return { success: true, status: ns }
  } catch (e) { return { success: false, error: e.message } }
}
