const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
exports.main = async (event) => {
  const { coupleId, type, label, icon, weight, description, coinValue, fertilizerTier, fragmentSeries } = event
  if (!coupleId) return { success: false, error: 'missing coupleId' }
  if (!['reward', 'coins', 'fertilizer', 'fragment', 'rare'].includes(type)) return { success: false, error: '无效类型' }
  if (!label || !description) return { success: false, error: '标签和描述不能为空' }
  try {
    const dup = await db.collection('gacha_pool').where({ coupleId, label: String(label).trim() }).get()
    if (dup.data.length > 0) return { success: false, error: '已存在同名奖励' }

    const add = await db.collection('gacha_pool').add({
      data: {
        coupleId, type,
        label: String(label).slice(0, 50),
        icon: String(icon || '🎁').slice(0, 10),
        weight: Number(weight) || 10,
        description: String(description).slice(0, 200),
        coinValue: Number(coinValue) || 0,
        fertilizerTier: String(fertilizerTier || ''),
        fragmentSeries: String(fragmentSeries || ''),
        createdAt: db.serverDate()
      }
    })
    return { success: true, itemId: add._id }
  } catch (e) { return { success: false, error: e.message } }
}
