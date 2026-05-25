<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{ coupleId: string | null }>()

const COLORS = ['#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF','#FF9F40',
  '#48BB78','#F6AD55','#63B3ED','#B794F4','#FC8181','#68D391','#FBD38D',
  '#FF6B6B','#C9CBCF','#E7E9ED']

const items = ref<{ _id: string; label: string }[]>([])
const newLabel = ref('')
const spinning = ref(false)
const result = ref('')
const highlightIdx = ref(-1)
const wheelRotation = ref(0)

const radius = 180

const itemStyles = computed(() => {
  const n = items.value.length
  if (n === 0) return []
  return items.value.map((_, i) => {
    const angle = (i * 360) / n
    return {
      background: COLORS[i % COLORS.length],
      transform: `rotate(${angle}deg) translateY(-${radius}rpx)`
    }
  })
})

function loadItems() {
  if (!props.coupleId) return
  wx.cloud.callFunction({ name: 'getWheelItems', data: { coupleId: props.coupleId } }).then(
    (res: any) => { if (res.result.success) items.value = res.result.items }
  ).catch(() => {})
}
loadItems()

function spin() {
  if (spinning.value || items.value.length === 0) return
  spinning.value = true
  result.value = ''
  highlightIdx.value = -1

  const n = items.value.length
  const winnerIdx = Math.floor(Math.random() * n)
  const winnerLabel = items.value[winnerIdx].label

  // 转盘旋转动画
  const extraSpins = 5 + Math.floor(Math.random() * 3)
  const targetAngle = extraSpins * 360 + (360 - winnerIdx * (360 / n) - 360 / n / 2)
  wheelRotation.value += targetAngle

  const duration = 2500
  const startTime = Date.now()
  const startRot = wheelRotation.value - targetAngle

  let flashIdx = 0
  const tick = 50

  const timer = setInterval(() => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    const currentRot = startRot + targetAngle * eased

    wheelRotation.value = currentRot
    flashIdx = (flashIdx + 1) % n
    highlightIdx.value = flashIdx

    if (progress >= 1) {
      clearInterval(timer)
      highlightIdx.value = winnerIdx
      result.value = winnerLabel
      spinning.value = false
    }
  }, tick)
}

async function addItem() {
  const label = newLabel.value.trim()
  if (!label) { uni.showToast({ title: '请输入选项', icon: 'none' }); return }
  if (!props.coupleId) return
  newLabel.value = ''
  try {
    const res: any = await wx.cloud.callFunction({ name: 'wheelItemCreate', data: { coupleId: props.coupleId, label } })
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
    const res: any = await wx.cloud.callFunction({ name: 'wheelItemDelete', data: { itemId: item._id } })
    if (!res.result.success) { loadItems(); uni.showToast({ title: '删除失败', icon: 'none' }) }
  } catch { loadItems(); uni.showToast({ title: '删除失败', icon: 'none' }) }
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
      <text class="ws-count">{{ items.length }} 个选项</text>
      <text v-if="items.length > 0" class="ws-clear" @tap="clearAll">🗑️ 清空</text>
    </view>

    <!-- 转盘 -->
    <view class="wheel-stage" v-if="items.length > 0">
      <view class="wheel-body" :style="{ transform: 'rotate(' + wheelRotation + 'deg)' }">
        <view
          v-for="(item, i) in items" :key="item._id"
          class="wheel-slice"
          :class="{ hl: highlightIdx === i }"
          :style="itemStyles[i]"
        >
          <text class="slice-label">{{ item.label }}</text>
        </view>
      </view>
      <view class="pointer"></view>
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

    <!-- 选项管理 -->
    <view class="ws-mgmt">
      <view class="ws-add">
        <input class="wsa-input" v-model="newLabel" placeholder="输入选项名称" maxlength="20" @confirm="addItem" />
        <view class="wsa-btn" @tap="addItem"><text class="wsa-btn-text">+ 添加</text></view>
      </view>
      <view class="ws-list" v-if="items.length > 0">
        <view class="ws-chip" v-for="item in items" :key="item._id">
          <view class="wsc-dot" :style="{ background: COLORS[items.indexOf(item) % COLORS.length] }"></view>
          <text class="wsc-label">{{ item.label }}</text>
          <text class="wsc-del" @tap="deleteItem(item)">✕</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.ws-wrap { padding-top: 8rpx; }
.ws-top { display: flex; align-items: center; justify-content: space-between; padding-bottom: 12rpx; }
.ws-count { font-size: 22rpx; color: #bbb; }
.ws-clear { font-size: 22rpx; color: #F44336; padding: 4rpx 12rpx; border-radius: 12rpx; background: rgba(244,67,54,0.08); }

.wheel-stage {
  position: relative; display: flex; align-items: center; justify-content: center;
  width: 480rpx; height: 480rpx; margin: 0 auto 16rpx;
}
.wheel-body {
  position: relative; width: 400rpx; height: 400rpx; border-radius: 50%;
  border: 6rpx solid #eee; background: #fafafa;
}
.wheel-slice {
  position: absolute; top: 50%; left: 50%;
  width: 150rpx; height: 44rpx; margin-left: -75rpx; margin-top: -22rpx;
  transform-origin: center center; border-radius: 10rpx;
  display: flex; align-items: center; justify-content: center;
  border: 3rpx solid transparent; transition: border-color 0.1s;
}
.wheel-slice.hl { border-color: #FFD700; box-shadow: 0 0 12rpx rgba(255,215,0,0.5); }
.slice-label { font-size: 20rpx; color: #fff; font-weight: 600; white-space: nowrap; overflow: hidden; max-width: 130rpx; }
.pointer {
  position: absolute; top: -8rpx; left: 50%; transform: translateX(-50%);
  width: 0; height: 0;
  border-left: 18rpx solid transparent;
  border-right: 18rpx solid transparent;
  border-top: 32rpx solid #F44336;
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
.ws-add { display: flex; gap: 12rpx; margin-bottom: 16rpx; }
.wsa-input { flex: 1; height: 72rpx; border: 2rpx solid #F0F0F0; border-radius: 16rpx; padding: 0 16rpx; font-size: 26rpx; background: #FAFAFA; }
.wsa-btn { height: 72rpx; line-height: 72rpx; padding: 0 28rpx; background: linear-gradient(135deg,#FF9800,#FFB74D); border-radius: 16rpx; flex-shrink: 0; }
.wsa-btn-text { font-size: 26rpx; color: #fff; font-weight: 600; }
.ws-list { display: flex; flex-wrap: wrap; gap: 12rpx; }
.ws-chip { display: flex; align-items: center; gap: 8rpx; background: #F5F5F5; border-radius: 20rpx; padding: 10rpx 14rpx; }
.wsc-dot { width: 14rpx; height: 14rpx; border-radius: 50%; flex-shrink: 0; }
.wsc-label { font-size: 24rpx; color: #333; }
.wsc-del { font-size: 24rpx; color: #bbb; padding: 4rpx; }
</style>
