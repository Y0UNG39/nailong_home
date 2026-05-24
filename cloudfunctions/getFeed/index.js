const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { coupleId } = event
  if (!coupleId) return { success: false, error: 'missing coupleId' }

  try {
    // 拉取最近任务、植物日志、成就、券
    const [tasks, achievements, coupons] = await Promise.all([
      db.collection('tasks').where({ coupleId }).orderBy('updatedAt', 'desc').limit(20).get(),
      db.collection('achievements').where({ coupleId }).orderBy('unlockedAt', 'desc').limit(10).get(),
      db.collection('coupons').where({ coupleId }).orderBy('createdAt', 'desc').limit(10).get()
    ])

    // 读取用户昵称
    const uidSet = new Set()
    tasks.data.forEach(t => { uidSet.add(t.creatorId); uidSet.add(t.assigneeId) })
    achievements.data.forEach(a => { if (a.triggeredBy) uidSet.add(a.triggeredBy) })
    coupons.data.forEach(c => { if (c.userId) uidSet.add(c.userId) })
    const users = await db.collection('users').where({ _openid: _.in([...uidSet]) }).get()
    const nickMap = {}
    users.data.forEach(u => { nickMap[u._openid] = u.nickname || 'TA' })

    function nameOf(openid) {
      if (!openid) return ''
      if (openid === OPENID) return '你'
      return nickMap[openid] || 'TA'
    }

    const feed = []

    tasks.data.forEach(t => {
      feed.push({
        type: 'task_create',
        user: nameOf(t.creatorId),
        content: `发布了任务「${t.title}」`,
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

    achievements.data.forEach(a => {
      feed.push({
        type: 'achievement',
        user: nameOf(a.triggeredBy),
        content: `解锁了成就「${a.name || a.key}」`,
        time: a.unlockedAt,
        icon: '🏆'
      })
    })

    coupons.data.forEach(c => {
      feed.push({
        type: 'coupon',
        user: nameOf(c.userId),
        content: c.status === 'used' ? `使用了「${c.name}」` : `获得了「${c.name}」`,
        time: c.createdAt,
        icon: '🎫'
      })
    })

    // 按时间降序，取最近 5 条
    feed.sort((a, b) => new Date(b.time) - new Date(a.time))
    return { success: true, activities: feed.slice(0, 5) }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
