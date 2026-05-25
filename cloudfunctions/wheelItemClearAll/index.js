const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const { coupleId } = event
  if (!coupleId) return { success: false, error: 'missing coupleId' }
  try {
    await db.collection('wheel_items').where({ coupleId }).remove()
    return { success: true }
  } catch (e) { return { success: false, error: e.message } }
}
