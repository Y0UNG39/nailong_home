<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

const props = defineProps<{ coupleId: string | null }>()
const emit = defineEmits<{ spinDone: [] }>()

const COLORS = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#E7E9ED',
  '#FF6B6B', '#48BB78', '#F6AD55', '#63B3ED', '#B794F4', '#FC8181', '#68D391', '#FBD38D']

const items = ref<{ _id: string; label: string }[]>([])
const newLabel = ref('')
const spinning = ref(false)
const result = ref('')
const currentRotation = ref(0)
const canvasWidth = 600
const canvasHeight = 600

let canvasCtx: WechatMiniprogram.CanvasRenderingContext2D | null = null

function loadItems() {
  if (!props.coupleId) return
  wx.cloud.callFunction({ name: 'getWheelItems', data: { coupleId: props.coupleId } }).then(
    (res: any) => { if (res.result.success) items.value = res.result.items }
  ).catch(() => {})
}

onMounted(() => {
  loadItems()
  nextTick(() => initCanvas())
})

async function initCanvas() {
  try {
    const query = uni.createSelectorQuery()
    const res = await new Promise<any>((resolve) => {
      query.select('#wheelCanvas').fields({ node: true, size: true }).exec((r) => resolve(r[0]))
    })
    if (!res) return
    const canvas = res.node
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    canvasCtx = canvas.getContext('2d')
    drawWheel(0)
  } catch (e) {}
}

function drawWheel(rotation: number) {
  if (!canvasCtx || items.value.length === 0) return
  const ctx = canvasCtx
  const n = items.value.length
  const cx = canvasWidth / 2
  const cy = canvasHeight / 2
  const r = cx - 20
  const arcSize = (2 * Math.PI) / n

  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  // Draw segments
  for (let i = 0; i < n; i++) {
    const startAngle = -Math.PI / 2 + i * arcSize + rotation
    const endAngle = startAngle + arcSize

    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, r, startAngle, endAngle)
    ctx.closePath()
    ctx.fillStyle = COLORS[i % COLORS.length]
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()

    // Label
    const midAngle = startAngle + arcSize / 2
    const labelR = r * 0.65
    ctx.save()
    ctx.translate(cx + Math.cos(midAngle) * labelR, cy + Math.sin(midAngle) * labelR)
    ctx.rotate(midAngle + Math.PI / 2)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 22px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const label = items.value[i].label
    if (label.length > 6) {
      ctx.fillText(label.slice(0, 5) + '..', 0, 0)
    } else {
      ctx.fillText(label, 0, 0)
    }
    ctx.restore()
  }

  // Center circle
  ctx.beginPath()
  ctx.arc(cx, cy, 28, 0, 2 * Math.PI)
  ctx.fillStyle = '#333'
  ctx.fill()

  // Pointer triangle at top
  ctx.beginPath()
  ctx.moveTo(cx, cy - r - 18)
  ctx.lineTo(cx - 20, cy - r - 2)
  ctx.lineTo(cx + 20, cy - r - 2)
  ctx.closePath()
  ctx.fillStyle = '#F44336'
  ctx.fill()
}

function spin() {
  if (spinning.value || items.value.length === 0) return
  spinning.value = true
  result.value = ''

  const extraRotations = 5 + Math.floor(Math.random() * 3)
  const randomAngle = Math.random() * 360
  const totalDeg = extraRotations * 360 + randomAngle
  const totalRad = (totalDeg * Math.PI) / 180

  currentRotation.value += totalRad

  drawWheel(currentRotation.value)

  // Calculate result
  const n = items.value.length
  const finalAngle = ((currentRotation.value * 180) / Math.PI) % 360
  const normalizedAngle = ((finalAngle % 360) + 360) % 360
  // pointer at top = -90deg in rad = 270deg in degrees, adjust for canvas y-down
  const pointerDeg = 270
  const segDeg = 360 / n
  // The segment facing the pointer after rotation
  let winnerIdx = Math.floor(((360 - normalizedAngle) % 360) / segDeg)
  if (winnerIdx >= n) winnerIdx = 0
  const winnerLabel = items.value[winnerIdx].label

  // Schedule spin animation using requestAnimationFrame
  const duration = 3000
  const startTime = Date.now()
  const startRot = currentRotation.value - totalRad

  function animate() {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    // ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3)
    const rot = startRot + totalRad * eased
    drawWheel(rot)

    if (progress < 1) {
      requestAnimationFrame(animate)
    } else {
      spinning.value = false
      result.value = winnerLabel
      emit('spinDone')
    }
  }
  animate()
}

async function addItem() {
  const label = newLabel.value.trim()
  if (!label) { uni.showToast({ title: '请输入选项', icon: 'none' }); return }
  if (!props.coupleId) return
  newLabel.value = ''
  try {
    const res = await wx.cloud.callFunction({ name: 'wheelItemCreate', data: { coupleId: props.coupleId, label } }) as any
    if (res.result.success) {
      loadItems()
    } else {
      uni.showToast({ title: res.result.error || '添加失败', icon: 'none' })
    }
  } catch { uni.showToast({ title: '添加失败', icon: 'none' }) }
}

async function deleteItem(item: any) {
  const ok = await uni.showModal({ title: '确认删除', content: `删除「${item.label}」？` })
  if (!ok.confirm) return
  items.value = items.value.filter(i => i._id !== item._id)
  try {
    const res = await wx.cloud.callFunction({ name: 'wheelItemDelete', data: { itemId: item._id } }) as any
    if (!res.result.success) {
      items.value.push(item)
      uni.showToast({ title: '删除失败', icon: 'none' })
    } else {
      nextTick(() => drawWheel(currentRotation.value))
    }
  } catch {
    items.value.push(item)
    uni.showToast({ title: '删除失败', icon: 'none' })
  }
}

async function clearAll() {
  if (!props.coupleId) return
  const ok = await uni.showModal({ title: '清空全部', content: '确定清空所有选项吗？' })
  if (!ok.confirm) return
  items.value = []
  try {
    const res = await wx.cloud.callFunction({ name: 'wheelItemClearAll', data: { coupleId: props.coupleId } }) as any
    if (res.result.success) {
      drawWheel(currentRotation.value)
    } else {
      uni.showToast({ title: '清空失败', icon: 'none' })
    }
  } catch { uni.showToast({ title: '清空失败', icon: 'none' }) }
}
</script>

<template>
  <view class="wheel-section">
    <view class="wheel-header">
      <text class="wh-title">🎡 幸运大转盘</text>
      <text class="wh-hint">{{ items.length }} 个选项</text>
      <text v-if="items.length > 0" class="clear-btn" @tap="clearAll">🗑️ 清空</text>
    </view>

    <view class="wheel-area" v-if="items.length > 0">
      <canvas id="wheelCanvas" type="2d" class="wheel-canvas" :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"></canvas>
      <view class="spin-btn" :class="{ disabled: spinning }" @tap="spin">
        <text>{{ spinning ? '转动中...' : '抽奖' }}</text>
      </view>
    </view>

    <view class="result-area" v-if="result">
      <text class="result-text">🎉 中了：<text class="result-label">{{ result }}</text></text>
    </view>

    <empty-state v-if="items.length === 0" icon="🎡" text="添加选项后即可转动转盘" />

    <!-- 选项管理 -->
    <view class="wheel-mgmt">
      <view class="add-row">
        <input class="add-input" v-model="newLabel" placeholder="输入选项名称" maxlength="20" @confirm="addItem" />
        <view class="add-btn" @tap="addItem"><text>+ 添加</text></view>
      </view>
      <view class="item-list" v-if="items.length > 0">
        <view class="item-chip" v-for="item in items" :key="item._id">
          <view class="ic-dot" :style="{ background: COLORS[items.indexOf(item) % COLORS.length] }"></view>
          <text class="ic-label">{{ item.label }}</text>
          <text class="ic-del" @tap="deleteItem(item)">✕</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.wheel-section {
  background: rgba(255,255,255,0.85); backdrop-filter: blur(16rpx);
  border-radius: 24rpx; padding: 24rpx 24rpx 30rpx; margin-top: 24rpx;
  box-shadow: 0 6rpx 28rpx rgba(255,184,0,0.06);
  border: 1rpx solid rgba(255,255,255,0.5);
}
.wheel-header { display: flex; align-items: center; gap: 12rpx; padding-bottom: 16rpx; border-bottom: 1rpx solid rgba(255,184,0,0.06); }
.wh-title { font-size: 28rpx; font-weight: 700; color: #333; flex: 1; }
.wh-hint { font-size: 22rpx; color: #bbb; }
.clear-btn { font-size: 22rpx; color: #F44336; padding: 6rpx 14rpx; border-radius: 12rpx; background: rgba(244,67,54,0.08); flex-shrink: 0; }

.wheel-area { position: relative; display: flex; align-items: center; justify-content: center; margin: 20rpx 0; }
.wheel-canvas { width: 600rpx; height: 600rpx; border-radius: 50%; box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.1); }
.spin-btn {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 100rpx; height: 100rpx; border-radius: 50%;
  background: linear-gradient(135deg, #FF9800, #FFB74D);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(255,152,0,0.4);
  z-index: 2;
}
.spin-btn text { font-size: 24rpx; color: #fff; font-weight: 700; }
.spin-btn.disabled { opacity: 0.5; pointer-events: none; }

.result-area { text-align: center; padding: 12rpx; margin-bottom: 12rpx; }
.result-text { font-size: 28rpx; color: #FF9800; }
.result-label { font-size: 34rpx; font-weight: 800; color: #F44336; }

.wheel-mgmt { margin-top: 12rpx; }
.add-row { display: flex; gap: 12rpx; margin-bottom: 16rpx; }
.add-input { flex: 1; height: 72rpx; border: 2rpx solid #F0F0F0; border-radius: 16rpx; padding: 0 16rpx; font-size: 26rpx; background: #FAFAFA; }
.add-btn { height: 72rpx; line-height: 72rpx; padding: 0 28rpx; background: linear-gradient(135deg,#FF9800,#FFB74D); border-radius: 16rpx; font-size: 26rpx; color: #fff; font-weight: 600; flex-shrink: 0; }
.item-list { display: flex; flex-wrap: wrap; gap: 12rpx; }
.item-chip { display: flex; align-items: center; gap: 8rpx; background: #F5F5F5; border-radius: 20rpx; padding: 10rpx 14rpx; }
.ic-dot { width: 14rpx; height: 14rpx; border-radius: 50%; flex-shrink: 0; }
.ic-label { font-size: 24rpx; color: #333; }
.ic-del { font-size: 24rpx; color: #bbb; padding: 4rpx; }
</style>
