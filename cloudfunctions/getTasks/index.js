const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { coupleId } = event
  if (!coupleId) return { success: false, error: 'missing coupleId' }

  try {
    // 查我创建的 + 分配给我的
    const res = await db.collection('tasks')
      .where({ coupleId })
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get()

    // 读取双方昵称
    const tasks = res.data
    const uidSet = new Set()
    tasks.forEach(t => { uidSet.add(t.creatorId); uidSet.add(t.assigneeId) })
    const users = await db.collection('users').where({ _openid: db.command.in([...uidSet]) }).get()
    const nickMap = {}
    users.data.forEach(u => { nickMap[u._openid] = u.nickname || 'TA' })

    const list = tasks.map(t => ({
      _id: t._id,
      title: t.title,
      description: t.description || '',
      difficulty: t.difficulty,
      type: t.type,
      coins: t.coins,
      status: t.status,
      creatorNickname: nickMap[t.creatorId] || (t.creatorId === OPENID ? '你' : 'TA'),
      assigneeNickname: nickMap[t.assigneeId] || (t.assigneeId === OPENID ? '你' : 'TA'),
      createdAt: t.createdAt,
      isMine: t.creatorId === OPENID
    }))

    return { success: true, tasks: list }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
