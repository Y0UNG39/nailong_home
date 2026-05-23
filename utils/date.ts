export function formatDate(date: Date | string | number): string {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatDateTime(date: Date | string | number): string {
  const d = new Date(date)
  return `${formatDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function timeAgo(date: Date | string | number): string {
  const now = Date.now()
  const ms = now - new Date(date).getTime()
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return '刚刚'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}分钟前`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}小时前`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}天前`
  return formatDate(date)
}

export function daysBetween(a: Date | string, b: Date | string): number {
  const ms = new Date(a).getTime() - new Date(b).getTime()
  return Math.floor(ms / 86400000)
}
