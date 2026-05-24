const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
exports.main = async (event) => {
  const { itemId, type, label, icon, weight, description, coinValue, fertilizerTier, fragmentSeries } = event
  if (!itemId) return { success: false, error: 'missing itemId' }
  try {
    const data = {}
    if (type && ['reward','coins','fertilizer','fragment','rare'].includes(type)) data.type = type
    if (label !== undefined) data.label = String(label).slice(0, 50)
    if (icon !== undefined) data.icon = String(icon).slice(0, 10)
    if (weight !== undefined) data.weight = Number(weight) || 10
    if (description !== undefined) data.description = String(description).slice(0, 200)
    if (coinValue !== undefined) data.coinValue = Number(coinValue)
    if (fertilizerTier !== undefined) data.fertilizerTier = String(fertilizerTier)
    if (fragmentSeries !== undefined) data.fragmentSeries = String(fragmentSeries)
    if (Object.keys(data).length === 0) return { success: false, error: 'nothing to update' }
    await db.collection('gacha_pool').doc(itemId).update({ data })
    return { success: true }
  } catch (e) { return { success: false, error: e.message } }
}
