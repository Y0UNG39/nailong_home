const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { coupleId } = event
  if (!coupleId) return { success: false, error: 'missing coupleId' }

  try {
    // 并行取 couple info + tasks + feed
    const [coupleRes, taskRes] = await Promise.all([
      db.collection('couples').doc(coupleId).get(),
      db.collection('tasks').where({ coupleId }).orderBy('createdAt', 'desc').limit(100).get()
    ])

    const couple = coupleRes.data
    if (!couple) return { success: false, error: 'couple not found' }

    // 邀请码
    let { inviteCode } = couple
    if (!inviteCode) {
      inviteCode = String(Math.floor(100000 + Math.random() * 900000))
      await db.collection('couples').doc(coupleId).update({ data: { inviteCode } })
    }

    // 当前用户硬币
    const uRes = await db.collection('users').where({ _openid: OPENID }).get()
    const myCoins = uRes.data[0]?.coins || 0

    // 今日打卡：统计每日任务完成情况
    const tasks = taskRes.data
    const dailyTasks = tasks.filter(t => t.type === 'DAILY')
    const dailyDone = dailyTasks.filter(t => t.status === 'submitted' || t.status === 'approved').length

    // feed：任务创建 + 任务完成
    const uidSet = new Set()
    tasks.forEach(t => { uidSet.add(t.creatorId); uidSet.add(t.assigneeId) })
    const users = await db.collection('users').where({ _openid: _.in([...uidSet]) }).get()
    const nickMap = {}
    users.data.forEach(u => { nickMap[u._openid] = u.nickname || 'TA' })

    function nameOf(openid) {
      if (!openid) return ''
      if (openid === OPENID) return '我'
      return nickMap[openid] || 'TA'
    }

    const feed = []
    tasks.forEach(t => {
      feed.push({
        type: 'task_create',
        user: nameOf(t.creatorId),
        content: `发布了「${t.title}」`,
        time: t.createdAt,
        icon: '📋'
      })
      if (t.status === 'approved') {
        feed.push({
          type: 'task_complete',
          user: nameOf(t.assigneeId),
          content: `完成了「${t.title}」`,
          time: t.updatedAt,
          icon: '✅'
        })
      }
    })
    feed.sort((a, b) => new Date(b.time) - new Date(a.time))

    // 拉券和成就的简要 feed
    const [coupons, achievements] = await Promise.all([
      db.collection('coupons').where({ coupleId }).orderBy('createdAt', 'desc').limit(10).get(),
      db.collection('achievements').where({ coupleId }).orderBy('unlockedAt', 'desc').limit(10).get()
    ])

    coupons.data.forEach(c => {
      feed.push({
        type: 'coupon',
        user: nameOf(c.userId),
        content: c.status === 'used' ? `使用了「${c.name}」` : `获得了「${c.name}」`,
        time: c.createdAt,
        icon: '🎫'
      })
    })

    achievements.data.forEach(a => {
      feed.push({
        type: 'achievement',
        user: nameOf(a.triggeredBy),
        content: `解锁了「${a.name || a.key}」`,
        time: a.unlockedAt,
        icon: '🏆'
      })
    })

    feed.sort((a, b) => new Date(b.time) - new Date(a.time))

    return {
      success: true,
      name: couple.name || '',
      coins: myCoins,
      todayCheckIn: { completed: dailyDone, total: dailyTasks.length },
      activities: feed.slice(0, 5)
    }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
