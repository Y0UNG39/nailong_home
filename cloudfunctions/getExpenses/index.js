const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { coupleId, year, month } = event

  if (!coupleId || !year || !month) {
    return { success: false, error: 'missing params' }
  }

  try {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endMonth = month === 12 ? 1 : month + 1
    const endYear = month === 12 ? year + 1 : year
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`

    const res = await db.collection('expenses')
      .where({
        coupleId,
        date: _.gte(startDate).and(_.lt(endDate))
      })
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get()

    const entries = res.data || []

    // 统计
    let total = 0, myTotal = 0, partnerTotal = 0
    for (const e of entries) {
      total += e.amount || 0
      if (e.paidBy === OPENID) {
        myTotal += e.amount || 0
      } else {
        partnerTotal += e.amount || 0
      }
    }

    return {
      success: true,
      entries,
      stats: { total, myTotal, partnerTotal }
    }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
