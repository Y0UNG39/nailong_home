const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const TEMPLATE_ID = 'mP6k6rjwe28q4WZ8njLetvXqeA1eH268EVoqrbvKmWc'

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { couponId } = event
  try {
    const c = await db.collection('coupons').doc(couponId).get()
    if (!c.data) return { success: false, error: 'coupon not found' }
    if (c.data.ownerId !== OPENID) return { success: false, error: 'not owner' }
    if (c.data.status !== 'unused') return { success: false, error: '不能重复使用' }
    await db.collection('coupons').doc(couponId).update({ data: { status: 'used', usedAt: db.serverDate() } })

    // 微信订阅消息通知对方
    if (c.data.coupleId) {
      const coupleRes = await db.collection('couples').doc(c.data.coupleId).get()
      if (coupleRes.data) {
        const members = coupleRes.data.members || []
        const partnerId = members.find(id => id !== OPENID)
        if (partnerId && TEMPLATE_ID) {
          try {
            await cloud.openapi.subscribeMessage.send({
              touser: partnerId,
              page: 'pages/profile/index',
              templateId: TEMPLATE_ID,
              data: {
                thing1: { value: (c.data.name || '券').slice(0, 20) },
                phrase2: { value: '已使用' },
                thing3: { value: '对方已使用' }
              },
              miniprogramState: 'trial'
            })
          } catch (e) {
            // 对方未订阅或模板ID无效，不阻塞主流程
          }
        }
      }
    }

    return { success: true }
  } catch (e) { return { success: false, error: e.message } }
}
