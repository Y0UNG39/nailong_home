const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { coupleId } = event
  if (!coupleId) return { success: false, error: 'missing coupleId' }

  try {
    const [tasks, achievements, gacha, coupons, dreams, couple] = await Promise.all([
      db.collection('tasks').where({ coupleId }).count(),
      db.collection('achievements').where({ coupleId }).count(),
      db.collection('gacha_records').where({ coupleId }).count(),
      db.collection('coupons').where({ coupleId }).count(),
      db.collection('dreams').where({ coupleId, status: 'completed' }).count(),
      db.collection('couples').doc(coupleId).get()
    ])

    const plant = couple.data?.plant || {}
    const STAGE_MAP = { seedling: 0, growing: 1, flowering: 2, thriving: 3 }
    const STAGES = [
      { icon: '🌱', label: '幼苗' },
      { icon: '🌿', label: '成长' },
      { icon: '🌺', label: '开花' },
      { icon: '🌳', label: '茂盛' }
    ]
    const idx = STAGE_MAP[plant.stage] || 0
    const s = STAGES[Math.min(idx, STAGES.length - 1)]

    return {
      success: true,
      stats: {
        tasks: tasks.total,
        achievements: achievements.total,
        plantIcon: s.icon,
        plantLabel: s.label,
        gacha: gacha.total,
        shop: coupons.total,
        dreams: dreams.total
      }
    }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
