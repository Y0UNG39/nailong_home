const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
exports.main = async (event) => {
  const { itemId, name, description, price, stock } = event
  if (!itemId) return { success: false, error: 'missing itemId' }
  try {
    const data = {}
    if (name !== undefined) data.name = String(name).slice(0, 100)
    if (description !== undefined) data.description = String(description).slice(0, 300)
    if (price !== undefined) data.price = Number(price)
    if (stock !== undefined) data.stock = Number(stock)
    if (Object.keys(data).length === 0) return { success: false, error: 'nothing to update' }
    await db.collection('shop_items').doc(itemId).update({ data })
    return { success: true }
  } catch (e) { return { success: false, error: e.message } }
}
