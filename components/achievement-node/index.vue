<script setup lang="ts">
import { computed } from 'vue'

interface Achievement {
  achievementId: string; category: string; name: string; description: string
  icon: string; color: string; unlockedAt?: string
}

interface Props { achievement: Achievement; unlocked: boolean }

const props = defineProps<Props>()

const catColors: Record<string, string> = {
  persistence: '#F44336', task: '#FF9800', reconcile: '#4CAF50',
  memorial: '#9C27B0', hidden: '#FFD700'
}

const ringColor = computed(() => catColors[props.achievement.category] || '#FFB800')
</script>

<template>
  <view class="node" :class="{ locked: !unlocked }">
    <view class="a-circle" :style="{ borderColor: unlocked ? ringColor : '#e0e0e0' }">
      <text class="a-icon" v-if="unlocked">{{ achievement.icon }}</text>
      <text class="a-lock" v-else>🔒</text>
    </view>
    <text class="a-name" :class="{ dim: !unlocked }">{{ unlocked ? achievement.name : '???' }}</text>
    <text class="a-desc" v-if="unlocked">{{ achievement.description }}</text>
  </view>
</template>

<style lang="scss" scoped>
.node {
  display: flex; flex-direction: column; align-items: center;
  width: 160rpx; margin: 16rpx 0;
}
.node.locked { opacity: 0.45; }
.a-circle {
  width: 80rpx; height: 80rpx; border-radius: 50%;
  border: 5rpx solid;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 8rpx;
  background: #fff;
  transition: all 0.3s;
}
.a-icon { font-size: 36rpx; }
.a-lock { font-size: 28rpx; }
.a-name { font-size: 22rpx; font-weight: 600; color: #333; text-align: center; }
.a-name.dim { color: #ccc; }
.a-desc { font-size: 20rpx; color: #999; text-align: center; margin-top: 2rpx; }
</style>
