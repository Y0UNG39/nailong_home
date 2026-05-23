<script setup lang="ts">
import { PLACE_CATEGORIES } from '@/utils/constants'

interface Place {
  _id: string; name: string; category: string; note?: string
  source: 'want_to_go' | 'next_time'
}

interface Props {
  place?: Place
  shaker?: boolean
  matched?: boolean
  myStatus?: 'want' | 'skip' | 'visited'
}

const props = withDefaults(defineProps<Props>(), { shaker: false, matched: false, myStatus: 'want' })
const emit = defineEmits<{ shakeNext: []; statusChange: [status: string]; addToDream: [] }>()

const catInfo = computed(() => {
  return PLACE_CATEGORIES.find(c => c.key === props.place?.category) || PLACE_CATEGORIES[4]
})

const statusCfg = { want: { label: '想去', color: '#FFB800' }, skip: { label: '不想去', color: '#ccc' }, visited: { label: '已去过', color: '#4CAF50' } }
const curStatus = computed(() => statusCfg[props.myStatus] || statusCfg.want)
</script>

<template>
  <!-- 摇一摇卡片 -->
  <view v-if="shaker" class="shaker-card" @tap="emit('shakeNext')">
    <text class="shake-icon">🎲</text>
    <text class="shake-title">摇一摇 · 下次一定</text>
    <text class="shake-sub">随机抽一个，看看去哪</text>
  </view>

  <!-- 地点卡片 -->
  <view v-else class="place-card">
    <view class="top">
      <text class="p-icon">{{ catInfo.icon }}</text>
      <view class="p-info">
        <text class="p-name">{{ place?.name }}</text>
        <view class="p-tags">
          <view class="p-cat" :style="{ background: catInfo.color + '18', color: catInfo.color }">{{ catInfo.label }}</view>
          <view class="p-source" v-if="place?.source === 'next_time'">下次一定</view>
        </view>
      </view>
      <view class="p-status" :style="{ color: curStatus.color, background: curStatus.color + '12' }">
        <text>{{ curStatus.label }}</text>
      </view>
    </view>
    <text class="p-note" v-if="place?.note">{{ place.note }}</text>
    <view class="matched-bar" v-if="matched">💕 双方都想去的默契之选</view>
    <view class="actions">
      <text class="act" @tap="emit('statusChange', 'want')">⭐ 想去</text>
      <text class="act" @tap="emit('statusChange', 'skip')">✋ 不去</text>
      <text class="act" @tap="emit('statusChange', 'visited')">✅ 去过</text>
      <text class="act dream" v-if="matched" @tap="emit('addToDream')">🚀 加到梦想板</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.shaker-card {
  background: linear-gradient(135deg, #FFB800, #FFCC00);
  border-radius: 24rpx; padding: 48rpx 28rpx;
  display: flex; flex-direction: column; align-items: center;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 28rpx rgba(255,184,0,0.3);
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.02); } }
.shake-icon { font-size: 64rpx; }
.shake-title { font-size: 34rpx; font-weight: 800; color: #fff; margin-top: 10rpx; }
.shake-sub { font-size: 24rpx; color: rgba(255,255,255,0.75); margin-top: 6rpx; }
.place-card {
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(16rpx);
  border-radius: 20rpx; padding: 22rpx 24rpx; margin-bottom: 16rpx;
  box-shadow: 0 4rpx 20rpx rgba(255,184,0,0.05);
  border: 1rpx solid rgba(255,255,255,0.5);
}
.top { display: flex; align-items: center; }
.p-icon { font-size: 36rpx; margin-right: 14rpx; }
.p-info { flex: 1; display: flex; flex-direction: column; }
.p-name { font-size: 28rpx; font-weight: 700; color: #333; }
.p-tags { display: flex; gap: 8rpx; margin-top: 6rpx; }
.p-cat { padding: 3rpx 12rpx; border-radius: 10rpx; font-size: 20rpx; font-weight: 600; }
.p-source { padding: 3rpx 12rpx; border-radius: 10rpx; font-size: 20rpx; color: #FFB800; background: rgba(255,184,0,0.1); font-weight: 600; }
.p-status { padding: 6rpx 18rpx; border-radius: 16rpx; font-size: 22rpx; font-weight: 700; flex-shrink: 0; margin-left: 10rpx; }
.p-note { font-size: 24rpx; color: #999; margin-top: 10rpx; }
.matched-bar {
  margin-top: 10rpx; padding: 12rpx 16rpx; border-radius: 14rpx;
  background: rgba(255,184,0,0.06); font-size: 24rpx; color: #FFB800; font-weight: 600;
}
.actions { display: flex; gap: 16rpx; margin-top: 14rpx; }
.act { font-size: 22rpx; color: #999; padding: 8rpx 0; }
.act.dream { color: #FFD700; font-weight: 700; }
</style>
