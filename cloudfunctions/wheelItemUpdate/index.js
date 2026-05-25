const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { itemId, weight } = event
  if (!itemId) return { success: false, error: 'missing itemId' }
  const w = Math.max(1, Math.floor(Number(weight)) || 1)
  if (w > 999) return { success: false, error: '权重不能超过 999' }

  try {
    const res = await db.collection('wheel_items').doc(itemId).get()
    if (!res.data) return { success: false, error: '选项不存在' }

    await db.collection('wheel_items').doc(itemId).update({ data: { weight: w } })
    return { success: true }
  } catch (e) { return { success: false, error: e.message } }
}
