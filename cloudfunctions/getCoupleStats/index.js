const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { coupleId } = event
  if (!coupleId) return { success: false, error: 'missing coupleId' }

  try {
    const [coupons, dreams, shopItems] = await Promise.all([
      db.collection('coupons').where({ coupleId }).count(),
      db.collection('dreams').where({ coupleId, status: 'completed' }).count(),
      db.collection('shop_items').where({ coupleId }).count()
    ])

    return {
      success: true,
      stats: {
        shop: shopItems.total,
        dreams: dreams.total
      }
    }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
