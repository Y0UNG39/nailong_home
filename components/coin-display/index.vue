<script setup lang="ts">
import { ref } from 'vue'
import { fetchBalance } from '@/utils/coin'
import { timeAgo } from '@/utils/date'

interface Props { coupleId?: string | null }
const props = defineProps<Props>()

const balance = ref(0)
const logs = ref<any[]>([])
const expanded = ref(false)

async function load() {
  if (!props.coupleId) return
  const res = await fetchBalance(props.coupleId)
  if (res?.balance !== undefined) {
    balance.value = res.balance
    logs.value = res.logs || []
  }
}

function toggle() {
  expanded.value = !expanded.value
  if (expanded.value && logs.value.length === 0) load()
}

// 初始加载
import { watch } from 'vue'
watch(() => props.coupleId, (val) => { if (val) load() }, { immediate: true })
</script>

<template>
  <view class="coin-bar" @tap="toggle">
    <view class="coin-left">
      <text class="coin-icon">🪙</text>
      <text class="coin-label">我们共有</text>
      <text class="coin-value">{{ balance }}</text>
      <text class="coin-label">币</text>
    </view>
    <text class="expand-arrow">{{ expanded ? '▲' : '▼' }}</text>
  </view>
  <view class="log-list" v-if="expanded">
    <view class="log-item" v-for="log in logs" :key="log._id || log.createdAt">
      <text class="log-amount" :class="{ spend: (log.amount || 0) < 0 }">
        {{ (log.amount || 0) > 0 ? '+' + log.amount : log.amount }}
      </text>
      <text class="log-desc">{{ log.description }}</text>
      <text class="log-time">{{ timeAgo(log.createdAt) }}</text>
    </view>
    <text class="log-empty" v-if="logs.length === 0">暂无流水记录</text>
  </view>
</template>

<style lang="scss" scoped>
.coin-bar {
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(16rpx);
  border-radius: 20rpx;
  padding: 24rpx 28rpx;
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12rpx;
  box-shadow: 0 4rpx 20rpx rgba(255,184,0,0.06);
  border: 1rpx solid rgba(255,255,255,0.5);
}
.coin-left { display: flex; align-items: center; }
.coin-icon { font-size: 32rpx; margin-right: 8rpx; }
.coin-label { font-size: 26rpx; color: #999; }
.coin-value { font-size: 36rpx; font-weight: 800; color: #FFB800; margin: 0 6rpx; }
.expand-arrow { font-size: 20rpx; color: #ccc; }
.log-list {
  background: rgba(255,255,255,0.8);
  backdrop-filter: blur(12rpx);
  border-radius: 16rpx;
  padding: 8rpx 20rpx;
  margin-bottom: 20rpx;
  max-height: 360rpx;
  overflow-y: auto;
}
.log-item { display: flex; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid rgba(255,184,0,0.06); }
.log-item:last-child { border-bottom: none; }
.log-amount { font-size: 28rpx; font-weight: 700; color: #4CAF50; width: 90rpx; flex-shrink: 0; }
.log-amount.spend { color: #F44336; }
.log-desc { flex: 1; font-size: 24rpx; color: #666; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin: 0 12rpx; }
.log-time { font-size: 22rpx; color: #ccc; flex-shrink: 0; }
.log-empty { text-align: center; padding: 32rpx; font-size: 24rpx; color: #ccc; }
</style>
