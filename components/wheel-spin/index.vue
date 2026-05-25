<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ coupleId: string | null }>()
const emit = defineEmits<{ spinDone: [] }>()

const COLORS = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
  '#48BB78', '#F6AD55', '#63B3ED', '#B794F4', '#FC8181', '#68D391', '#FBD38D',
  '#FF6B6B', '#C9CBCF', '#E7E9ED']

const items = ref<{ _id: string; label: string }[]>([])
const newLabel = ref('')
const spinning = ref(false)
const result = ref('')
const highlightIdx = ref(-1)

function loadItems() {
  if (!props.coupleId) return
  wx.cloud.callFunction({ name: 'getWheelItems', data: { coupleId: props.coupleId } }).then(
    (res: any) => {
      if (res.result.success) items.value = res.result.items
    }
  ).catch(() => {})
}
loadItems()

function spin() {
  if (spinning.value || items.value.length === 0) return
  spinning.value = true
  result.value = ''
  highlightIdx.value = -1

  const duration = 2000
  const steps = 20
  const interval = duration / steps
  let step = 0

  function tick() {
    highlightIdx.value = Math.floor(Math.random() * items.value.length)
    step++
    if (step < steps) {
      setTimeout(tick, interval * (1 + step * 0.05))
    } else {
      const winnerIdx = Math.floor(Math.random() * items.value.length)
      highlightIdx.value = winnerIdx
      result.value = items.value[winnerIdx].label
      spinning.value = false
      emit('spinDone')
    }
  }
  tick()
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
    if (!res.result.success) {
      loadItems()
      uni.showToast({ title: '删除失败', icon: 'none' })
    }
  } catch { loadItems(); uni.showToast({ title: '删除失败', icon: 'none' }) }
}

async function clearAll() {
  if (!props.coupleId) return
  const ok = await uni.showModal({ title: '清空全部', content: '确定清空所有选项吗？' })
  if (!ok.confirm) return
  items.value = []
  try {
    const res: any = await wx.cloud.callFunction({ name: 'wheelItemClearAll', data: { coupleId: props.coupleId } })
    if (!res.result.success) { uni.showToast({ title: '清空失败', icon: 'none' }) }
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

    <!-- 转盘可视化：选项排成一圈 -->
    <view class="wheel-area" v-if="items.length > 0">
      <view class="wheel-ring">
        <view
          v-for="(item, i) in items" :key="item._id"
          class="wheel-seg"
          :style="{
            background: COLORS[i % COLORS.length],
            transform: 'rotate(' + (i * 360 / items.length) + 'deg) translateY(-200rpx)',
            borderColor: highlightIdx === i ? '#FFD700' : 'transparent'
          }"
        >
          <text class="seg-label">{{ item.label }}</text>
        </view>
        <view class="spin-btn" :class="{ disabled: spinning }" @tap="spin">
          <text>{{ spinning ? '...' : '抽奖' }}</text>
        </view>
      </view>
    </view>

    <view class="result-area" v-if="result">
      <text class="result-text">🎉 中了：<text class="result-label">{{ result }}</text></text>
    </view>

    <view class="wheel-empty" v-if="items.length === 0">
      <text class="we-icon">🎡</text>
      <text class="we-text">添加选项后即可转动转盘</text>
    </view>

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

.wheel-area { display: flex; align-items: center; justify-content: center; padding: 40rpx 0; }
.wheel-ring { position: relative; width: 480rpx; height: 480rpx; }
.wheel-seg {
  position: absolute; top: 50%; left: 50%;
  width: 200rpx; height: 60rpx; margin-left: -100rpx; margin-top: -30rpx;
  transform-origin: center center;
  border-radius: 12rpx; display: flex; align-items: center; justify-content: center;
  border: 3rpx solid transparent; transition: border-color 0.15s;
}
.seg-label { font-size: 22rpx; color: #fff; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180rpx; }
.spin-btn {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 100rpx; height: 100rpx; border-radius: 50%;
  background: linear-gradient(135deg, #FF9800, #FFB74D);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(255,152,0,0.4);
  z-index: 2;
}
.spin-btn text { font-size: 26rpx; color: #fff; font-weight: 700; }
.spin-btn.disabled { opacity: 0.5; pointer-events: none; }

.result-area { text-align: center; padding: 12rpx; }
.result-text { font-size: 28rpx; color: #FF9800; }
.result-label { font-size: 34rpx; font-weight: 800; color: #F44336; }

.wheel-empty { text-align: center; padding: 32rpx 0; }
.we-icon { font-size: 48rpx; display: block; margin-bottom: 12rpx; }
.we-text { font-size: 24rpx; color: #bbb; }

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
