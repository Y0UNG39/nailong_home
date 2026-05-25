const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { itemId, weight } = event
  if (!itemId) return { success: false, error: 'missing itemId' }
  const w = Number(weight)
  if (isNaN(w) || w < 0) return { success: false, error: '权重需 ≥ 0' }

  try {
    const res = await db.collection('wheel_items').doc(itemId).get()
    if (!res.data) return { success: false, error: '选项不存在' }
    const coupleId = res.data.coupleId

    const all = await db.collection('wheel_items').where({ coupleId }).get()
    // 计算除当前项外的权重总和
    const othersTotal = (all.data || []).reduce((s, i) => s + (i._id === itemId ? 0 : (i.weight || 1)), 0)
    if (othersTotal + w > 100) return { success: false, error: `其他项权重总和 ${othersTotal}%，加上此项超出 100%` }

    await db.collection('wheel_items').doc(itemId).update({ data: { weight: w } })
    return { success: true }
  } catch (e) { return { success: false, error: e.message } }
}
