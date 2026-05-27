const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const COLS = ['users','couples','diary_entries','coin_logs','shop_items','coupons','dreams','expenses']
exports.main = async () => {
  const results = {}; let existing = 0, missing = 0
  for (const name of COLS) {
    try { const r = await db.collection(name).count(); results[name] = { exists: true, count: r.total || 0 }; existing++ }
    catch { results[name] = { exists: false, count: 0, error: 'not found' }; missing++ }
  }
  return { success: true, total: COLS.length, existing, missing, collections: results }
}
