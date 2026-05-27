const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { coupleId, year, month } = event
  if (!coupleId || !year || !month) return { success: false, error: 'missing params' }

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endMonth = month === 12 ? 1 : month + 1
  const endYear = month === 12 ? year + 1 : year
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`

  try {
    const _ = db.command
    const res = await db.collection('diary_entries')
      .where({
        coupleId,
        date: _.gte(startDate).and(_.lt(endDate))
      })
      .orderBy('date', 'desc')
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get()

    // 批量获取作者昵称
    const authorIds = [...new Set(res.data.map(e => e.authorId))]
    const usersRes = authorIds.length
      ? await db.collection('users').where({ _openid: _.in(authorIds) }).get()
      : { data: [] }
    const nameMap = {}
    usersRes.data.forEach(u => { nameMap[u._openid] = u.nickname || '' })

    const entries = res.data.map(e => ({
      ...e,
      authorNickname: nameMap[e.authorId] || ''
    }))

    return { success: true, entries }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
