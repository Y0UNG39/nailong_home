<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'

const props = defineProps<{ coupleId: string | null }>()

const COLORS = ['#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF','#FF9F40',
  '#48BB78','#F6AD55','#63B3ED','#B794F4','#FC8181','#68D391','#FBD38D',
  '#FF6B6B','#C9CBCF','#E7E9ED']

interface WheelItem { _id: string; label: string; weight: number }
const items = ref<WheelItem[]>([])
const newLabel = ref('')
const newWeight = ref(10)
const spinning = ref(false)
const result = ref('')
const highlightIdx = ref(-1)
const offsetAngle = ref(0)
const editingId = ref('')
const editingWeight = ref(0)

const totalWeight = computed(() => items.value.reduce((s, i) => s + i.weight, 0))
const isReady = computed(() => totalWeight.value === 100)
const canvasSize = 300

function loadItems() {
  if (!props.coupleId) return
  wx.cloud.callFunction({ name: 'getWheelItems', data: { coupleId: props.coupleId } }).then(
    (res: any) => {
      if (res.result.success) {
        items.value = res.result.items
        nextTick(() => drawWheel())
      }
    }
  ).catch(() => {})
}

function drawWheel() {
  if (items.value.length === 0) return
  const ctx = uni.createCanvasContext('wheelCanvas')
  const cx = canvasSize / 2
  const cy = canvasSize / 2
  const r = cx - 6

  ctx.clearRect(0, 0, canvasSize, canvasSize)

  let angle = -Math.PI / 2 + offsetAngle.value
  for (let i = 0; i < items.value.length; i++) {
    const swipe = (items.value[i].weight / 100) * Math.PI * 2
    const endAngle = angle + swipe

    // 扇形
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, r, angle, endAngle)
    ctx.closePath()
    ctx.setFillStyle(highlightIdx.value === i ? lighten(COLORS[i % COLORS.length]) : COLORS[i % COLORS.length])
    ctx.fill()
    ctx.setStrokeStyle('#fff')
    ctx.setLineWidth(1)
    ctx.stroke()

    // 文字
    const midAngle = angle + swipe / 2
    const labelR = r * 0.7
    const tx = cx + Math.cos(midAngle) * labelR
    const ty = cy + Math.sin(midAngle) * labelR
    ctx.save()
    ctx.translate(tx, ty)
    ctx.rotate(midAngle + Math.PI / 2)
    ctx.setFillStyle('#fff')
    ctx.setFontSize(10)
    ctx.setTextAlign('center')
    ctx.setTextBaseline('middle')
    const txt = items.value[i].label
    ctx.fillText(txt.length > 6 ? txt.slice(0, 5) + '..' : txt, 0, 0)
    ctx.restore()

    angle = endAngle
  }

  // 中心圆 + 指针
  ctx.beginPath()
  ctx.arc(cx, cy, 16, 0, Math.PI * 2)
  ctx.setFillStyle('#333')
  ctx.fill()
  ctx.draw()
}

function lighten(hex: string): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + 40)
  const g = Math.min(255, ((num >> 8) & 0x00FF) + 40)
  const b = Math.min(255, (num & 0x0000FF) + 40)
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`
}

function spin() {
  if (spinning.value || items.value.length === 0) return
  if (!isReady.value) { uni.showToast({ title: `权重总和 ${totalWeight.value}%，需要恰好 100%`, icon: 'none' }); return }

  spinning.value = true
  result.value = ''
  highlightIdx.value = -1

  const totalW = totalWeight.value
  const rand = Math.random() * totalW
  let runningSum = 0
  let winnerIdx = 0
  for (let i = 0; i < items.value.length; i++) {
    runningSum += items.value[i].weight
    if (rand <= runningSum) { winnerIdx = i; break }
  }
  const n = items.value.length

  const extraSpins = 5 + Math.floor(Math.random() * 3)
  let targetAngle = extraSpins * 2 * Math.PI + Math.random() * 2 * Math.PI

  // 落在 winner 的扇区
  let winAngle = 0
  for (let i = 0; i < winnerIdx; i++) winAngle += (items.value[i].weight / 100) * 2 * Math.PI
  const winMid = winAngle + (items.value[winnerIdx].weight / 100) * Math.PI
  // 指针在顶部 (270deg = -PI/2)，扇形在 clockwise 方向
  const pointerAngle = -Math.PI / 2
  targetAngle += (2 * Math.PI - (winMid - pointerAngle) % (2 * Math.PI)) % (2 * Math.PI)

  const startAngle = offsetAngle.value
  const delta = targetAngle
  const duration = 3000
  const startTime = Date.now()
  const tick = 50

  let flashIdx = 0
  const timer = setInterval(() => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    offsetAngle.value = startAngle + delta * eased
    flashIdx = (flashIdx + 1) % n
    highlightIdx.value = flashIdx

    if (progress >= 1) {
      clearInterval(timer)
      highlightIdx.value = winnerIdx
      offsetAngle.value = startAngle + delta
      drawWheel()
      nextTick(() => {
        result.value = items.value[winnerIdx].label
        spinning.value = false
      })
    } else {
      drawWheel()
    }
  }, tick)
}

async function addItem() {
  const label = newLabel.value.trim()
  if (!label) { uni.showToast({ title: '请输入选项', icon: 'none' }); return }
  if (!props.coupleId) return
  newLabel.value = ''
  try {
    const res: any = await wx.cloud.callFunction({
      name: 'wheelItemCreate',
      data: { coupleId: props.coupleId, label, weight: newWeight.value }
    })
    if (res.result.success) { loadItems() }
    else { uni.showToast({ title: res.result.error || '添加失败', icon: 'none' }) }
  } catch { uni.showToast({ title: '添加失败', icon: 'none' }) }
}

async function deleteItem(item: WheelItem) {
  const ok = await uni.showModal({ title: '确认删除', content: `删除「${item.label}」？` })
  if (!ok.confirm) return
  items.value = items.value.filter(i => i._id !== item._id)
  nextTick(() => drawWheel())
  try {
    const res: any = await wx.cloud.callFunction({ name: 'wheelItemDelete', data: { itemId: item._id } })
    if (!res.result.success) { loadItems(); uni.showToast({ title: '删除失败', icon: 'none' }) }
  } catch { loadItems(); uni.showToast({ title: '删除失败', icon: 'none' }) }
}

function startEdit(item: WheelItem) { editingId.value = item._id; editingWeight.value = item.weight }
async function saveWeight(item: WheelItem) {
  if (editingWeight.value === item.weight) { editingId.value = ''; return }
  try {
    const res: any = await wx.cloud.callFunction({
      name: 'wheelItemUpdate', data: { itemId: item._id, weight: editingWeight.value }
    })
    if (res.result.success) { item.weight = editingWeight.value; editingId.value = ''; nextTick(() => drawWheel()) }
    else { uni.showToast({ title: res.result.error || '更新失败', icon: 'none' }) }
  } catch { uni.showToast({ title: '更新失败', icon: 'none' }) }
}

async function clearAll() {
  if (!props.coupleId) return
  const ok = await uni.showModal({ title: '清空全部', content: '确定清空所有选项吗？' })
  if (!ok.confirm) return
  items.value = []
  try {
    const res: any = await wx.cloud.callFunction({ name: 'wheelItemClearAll', data: { coupleId: props.coupleId } })
    if (!res.result.success) uni.showToast({ title: '清空失败', icon: 'none' })
  } catch { uni.showToast({ title: '清空失败', icon: 'none' }) }
}
</script>

<template>
  <view class="ws-wrap">
    <view class="ws-top">
      <text class="ws-total" :class="{ ok: isReady, warn: totalWeight > 100 }">
        权重总和 {{ totalWeight }}% {{ isReady ? '✓' : totalWeight > 100 ? '⚠️ 超了' : '(需要 100%)' }}
      </text>
      <text v-if="items.length > 0" class="ws-clear" @tap="clearAll">🗑️ 清空</text>
    </view>

    <!-- 转盘：canvas 饼图 + 固定指针 -->
    <view class="wheel-stage" v-if="items.length > 0">
      <canvas canvas-id="wheelCanvas" class="wheel-canvas" :style="{ width: canvasSize * 2 + 'rpx', height: canvasSize * 2 + 'rpx' }"></canvas>
      <!-- 指针（triangle） -->
      <view class="pointer-tri"></view>
      <view class="spin-btn" :class="{ off: spinning }" @tap="spin">
        <text class="sb-text">抽奖</text>
      </view>
    </view>

    <view class="ws-empty" v-if="items.length === 0">
      <text class="wse-icon">🎡</text>
      <text class="wse-text">添加选项后即可转动转盘</text>
    </view>

    <view class="ws-result" v-if="result">
      <text class="wsr-text">🎉 中了：<text class="wsr-label">{{ result }}</text></text>
    </view>

    <view class="ws-mgmt">
      <view class="ws-add">
        <input class="wsa-input" v-model="newLabel" placeholder="选项名称" maxlength="20" @confirm="addItem" />
        <input class="wsa-wt" v-model.number="newWeight" type="number" placeholder="权重" />
        <view class="wsa-btn" @tap="addItem"><text class="wsa-btn-text">+ 添加</text></view>
      </view>
      <view class="ws-list" v-if="items.length > 0">
        <view class="ws-chip" v-for="item in items" :key="item._id">
          <view class="wsc-dot" :style="{ background: COLORS[items.indexOf(item) % COLORS.length] }"></view>
          <text class="wsc-label">{{ item.label }}</text>
          <template v-if="editingId === item._id">
            <input class="wsc-edt" v-model.number="editingWeight" type="number" />
            <text class="wsc-ok" @tap="saveWeight(item)">✓</text>
          </template>
          <text v-else class="wsc-wt" @tap="startEdit(item)">{{ item.weight }}%</text>
          <text class="wsc-del" @tap="deleteItem(item)">✕</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.ws-wrap { padding-top: 8rpx; }
.ws-top { display: flex; align-items: center; justify-content: space-between; padding-bottom: 12rpx; }
.ws-total { font-size: 22rpx; color: #bbb; }
.ws-total.ok { color: #4CAF50; font-weight: 700; }
.ws-total.warn { color: #F44336; font-weight: 700; }
.ws-clear { font-size: 22rpx; color: #F44336; padding: 4rpx 12rpx; border-radius: 12rpx; background: rgba(244,67,54,0.08); }

.wheel-stage {
  position: relative; display: flex; align-items: center; justify-content: center;
  width: 600rpx; height: 600rpx; margin: 0 auto 16rpx;
}
.wheel-canvas { width: 600rpx; height: 600rpx; border-radius: 50%; box-shadow: 0 4rpx 24rpx rgba(0,0,0,0.1); }

.pointer-tri {
  position: absolute; top: 2rpx; left: 50%; transform: translateX(-50%);
  width: 0; height: 0;
  border-left: 22rpx solid transparent;
  border-right: 22rpx solid transparent;
  border-top: 36rpx solid #F44336;
  z-index: 2;
}

.spin-btn {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 100rpx; height: 100rpx; border-radius: 50%;
  background: linear-gradient(135deg, #FF9800, #FFB74D);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4rpx 20rpx rgba(255,152,0,0.45); z-index: 2;
}
.spin-btn.off { opacity: 0.5; pointer-events: none; }
.sb-text { font-size: 26rpx; color: #fff; font-weight: 700; }

.ws-empty { text-align: center; padding: 40rpx 0; }
.wse-icon { font-size: 48rpx; display: block; margin-bottom: 12rpx; }
.wse-text { font-size: 24rpx; color: #bbb; }

.ws-result { text-align: center; padding: 12rpx; }
.wsr-text { font-size: 28rpx; color: #FF9800; }
.wsr-label { font-size: 34rpx; font-weight: 800; color: #F44336; }

.ws-mgmt { margin-top: 12rpx; }
.ws-add { display: flex; gap: 8rpx; margin-bottom: 16rpx; }
.wsa-input { flex: 2; height: 72rpx; border: 2rpx solid #F0F0F0; border-radius: 16rpx; padding: 0 16rpx; font-size: 26rpx; background: #FAFAFA; }
.wsa-wt { width: 100rpx; height: 72rpx; border: 2rpx solid #F0F0F0; border-radius: 16rpx; padding: 0 8rpx; font-size: 26rpx; text-align: center; background: #FAFAFA; flex-shrink: 0; }
.wsa-btn { height: 72rpx; line-height: 72rpx; padding: 0 24rpx; background: linear-gradient(135deg,#FF9800,#FFB74D); border-radius: 16rpx; flex-shrink: 0; }
.wsa-btn-text { font-size: 26rpx; color: #fff; font-weight: 600; }
.ws-list { display: flex; flex-wrap: wrap; gap: 12rpx; }
.ws-chip { display: flex; align-items: center; gap: 8rpx; background: #F5F5F5; border-radius: 20rpx; padding: 10rpx 14rpx; }
.wsc-dot { width: 14rpx; height: 14rpx; border-radius: 50%; flex-shrink: 0; }
.wsc-label { font-size: 24rpx; color: #333; }
.wsc-wt { font-size: 22rpx; color: #999; padding: 4rpx 8rpx; }
.wsc-edt { width: 60rpx; height: 44rpx; border: 1rpx solid #FFB800; border-radius: 8rpx; font-size: 22rpx; text-align: center; }
.wsc-ok { font-size: 24rpx; color: #4CAF50; padding: 4rpx; }
.wsc-del { font-size: 24rpx; color: #bbb; padding: 4rpx; }
</style>
