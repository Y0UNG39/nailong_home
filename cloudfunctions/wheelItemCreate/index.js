const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { coupleId, label, weight } = event
  if (!coupleId) return { success: false, error: 'missing coupleId' }
  const safeLabel = String(label || '').trim()
  if (!safeLabel) return { success: false, error: '请输入选项名称' }
  const w = Math.max(1, Math.floor(Number(weight)) || 1)

  try {
    const dup = await db.collection('wheel_items').where({ coupleId, label: safeLabel }).get()
    if (dup.data.length > 0) return { success: false, error: '选项已存在' }

    const count = await db.collection('wheel_items').where({ coupleId }).count()
    if (count.total >= 20) return { success: false, error: '最多20个选项' }

    await db.collection('wheel_items').add({ data: { coupleId, label: safeLabel, weight: w, createdAt: db.serverDate() } })
    return { success: true }
  } catch (e) { return { success: false, error: e.message } }
}
