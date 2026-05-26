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

export const DREAM_CATEGORIES = [
  { key: 'travel', label: '旅行', color: '#2196F3', icon: '✈️' },
  { key: 'home', label: '居家', color: '#FFC107', icon: '🏠' },
  { key: 'food', label: '吃喝', color: '#FF9800', icon: '🍜' },
  { key: 'experience', label: '体验', color: '#9C27B0', icon: '🎯' },
  { key: 'material', label: '物质', color: '#9E9E9E', icon: '🎁' }
] as const

