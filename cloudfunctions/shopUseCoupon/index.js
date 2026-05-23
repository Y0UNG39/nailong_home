const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { couponId } = event
  try {
    const c = await db.collection('coupons').doc(couponId).get()
    if (!c.data) return { success: false, error: 'coupon not found' }
    if (c.data.ownerId !== OPENID) return { success: false, error: 'not owner' }
    if (c.data.status !== 'unused') return { success: false, error: 'status: ' + c.data.status }
    await db.collection('coupons').doc(couponId).update({ data: { status: 'used', usedAt: db.serverDate() } })
    return { success: true }
  } catch (e) { return { success: false, error: e.message } }
}
