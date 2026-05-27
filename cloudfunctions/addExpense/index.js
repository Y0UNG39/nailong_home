const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { coupleId, amount, category, paidBy, note, date } = event

  if (!coupleId || !amount || !category || !paidBy) {
    return { success: false, error: 'missing params' }
  }
  if (amount <= 0 || amount > 999999) {
    return { success: false, error: 'invalid amount' }
  }

  try {
    const res = await db.collection('expenses').add({
      data: {
        coupleId,
        amount: Number(amount),
        category,
        paidBy,
        note: (note || '').slice(0, 100),
        date: date || new Date().toISOString().slice(0, 10),
        createdAt: db.serverDate()
      }
    })
    return { success: true, entryId: res._id }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
