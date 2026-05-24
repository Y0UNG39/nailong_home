const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  await db.collection('users').where({ _openid: OPENID }).update({ data: { coins: 999 } })
  return { success: true, coins: 999 }
}
