const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { couponId } = event
  if (!couponId) return { success: false, error: 'missing couponId' }

  try {
    const res = await db.collection('coupons').doc(couponId).get()
    if (!res.data) return { success: false, error: 'not found' }
    if (res.data.status === 'unused') return { success: false, error: '不能删除未使用的券' }

    await db.collection('coupons').doc(couponId).remove()
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
