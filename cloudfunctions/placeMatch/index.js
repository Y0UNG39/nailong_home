const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
exports.main = async (event) => {
  const { coupleId } = event
  try {
    const res = await db.collection('places').where({ coupleId, source: 'want_to_go', status: 'active' }).get()
    const byName = {}
    for (const p of res.data) { if (!byName[p.name]) byName[p.name] = []; byName[p.name].push(p) }
    const matched = Object.values(byName).filter(arr => arr.length >= 2).map(arr => arr[0])
    return { success: true, matches: matched, count: matched.length }
  } catch (e) { return { success: false, error: e.message } }
}
