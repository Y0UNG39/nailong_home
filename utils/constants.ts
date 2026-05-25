/** 全局常量定义 */

export const TASK_DIFFICULTY = {
  EASY: { label: '简单', coins: 1, color: '#4CAF50' },
  MEDIUM: { label: '中等', coins: 3, color: '#FF9800' },
  HARD: { label: '挑战', coins: 5, color: '#F44336' }
} as const

export const TASK_TYPE = {
  ONCE: '一次性',
  DAILY: '每日',
  WEEKLY: '每周'
} as const

export const ACHIEVEMENTS = [
  { id: 'sign7', category: 'persistence', name: '签到达人', desc: '连续签到7天', icon: '🔥', color: '#F44336', condition: { type: 'signDays', value: 7 } },
  { id: 'sign30', category: 'persistence', name: '签到王者', desc: '连续签到30天', icon: '🔥', color: '#F44336', condition: { type: 'signDays', value: 30 } },
  { id: 'sign365', category: 'persistence', name: '签到传说', desc: '连续签到365天', icon: '🔥', color: '#F44336', condition: { type: 'signDays', value: 365 } },
  { id: 'task50', category: 'task', name: '任务大师', desc: '累计发布50个任务', icon: '💪', color: '#FF9800', condition: { type: 'publishTasks', value: 50 } },
  { id: 'complete100', category: 'task', name: '打卡狂魔', desc: '累计完成100次打卡', icon: '✅', color: '#FF9800', condition: { type: 'completeTasks', value: 100 } },
  { id: 'reconcile3', category: 'reconcile', name: '和好如初', desc: '和好3次', icon: '🤝', color: '#4CAF50', condition: { type: 'reconcile', value: 3 } },
  { id: 'reconcile10', category: 'reconcile', name: '默契回春', desc: '和好10次', icon: '🤝', color: '#4CAF50', condition: { type: 'reconcile', value: 10 } },
  { id: 'day100', category: 'memorial', name: '百日纪念', desc: '在一起100天', icon: '💯', color: '#9C27B0', condition: { type: 'days', value: 100 } },
  { id: 'day365', category: 'memorial', name: '周年纪念', desc: '在一起365天', icon: '🎂', color: '#9C27B0', condition: { type: 'days', value: 365 } },
  { id: 'day1000', category: 'memorial', name: '千日纪念', desc: '在一起1000天', icon: '💎', color: '#9C27B0', condition: { type: 'days', value: 1000 } },
  { id: 'shop10', category: 'hidden', name: '购物达人', desc: '购买小卖部10次', icon: '🛒', color: '#FFD700', condition: { type: 'shopCount', value: 10 } },
  { id: 'dream5', category: 'hidden', name: '梦想成真', desc: '完成5个梦想', icon: '⭐', color: '#FFD700', condition: { type: 'dreamCount', value: 5 } }
] as const

export const DREAM_CATEGORIES = [
  { key: 'travel', label: '旅行', color: '#2196F3', icon: '✈️' },
  { key: 'home', label: '居家', color: '#FFC107', icon: '🏠' },
  { key: 'food', label: '吃喝', color: '#FF9800', icon: '🍜' },
  { key: 'experience', label: '体验', color: '#9C27B0', icon: '🎯' },
  { key: 'material', label: '物质', color: '#9E9E9E', icon: '🎁' }
] as const

