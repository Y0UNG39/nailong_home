<script setup lang="ts">
import { computed } from 'vue'
import { PLANT_STAGES, HEALTH_MAP, VARIETY_MAP } from '@/utils/constants'

interface PlantData {
  stage: string
  growthValue: number
  health: string
  variety: string
  lastWatered?: string
}

interface Props { plantData: PlantData }

const props = defineProps<Props>()

const stageInfo = computed(() => {
  return PLANT_STAGES.find(s => s.key === props.plantData?.stage) || PLANT_STAGES[0]
})

const healthInfo = computed(() => {
  return HEALTH_MAP[props.plantData?.health] || HEALTH_MAP.healthy
})

const varietyName = computed(() => {
  return VARIETY_MAP[props.plantData?.variety] || VARIETY_MAP.default
})

const progress = computed(() => Math.min(100, Math.max(0, props.plantData?.growthValue || 0)))

const nextStage = computed(() => {
  const idx = PLANT_STAGES.findIndex(s => s.key === props.plantData?.stage)
  if (idx < PLANT_STAGES.length - 1) {
    return PLANT_STAGES[idx + 1]
  }
  return null
})

const remaining = computed(() => {
  if (!nextStage.value) return 0
  return nextStage.value.threshold - progress.value
})
</script>

<template>
  <view class="plant-card">
    <view class="plant-top">
      <view class="plant-icon-area">
        <text class="plant-icon">{{ stageInfo.icon }}</text>
        <view class="health-dot" :style="{ background: healthInfo.color }" />
      </view>
      <view class="plant-info">
        <text class="variety-name">{{ varietyName }}</text>
        <view class="stage-badge">
          <text>{{ stageInfo.icon }}{{ stageInfo.label }}</text>
        </view>
        <view class="health-badge" :style="{ background: healthInfo.color }">
          <text>{{ healthInfo.label }}</text>
        </view>
      </view>
    </view>

    <view class="progress-wrap">
      <view class="progress-bar">
        <view class="progress-fill" :style="{ width: progress + '%' }" />
      </view>
      <text class="progress-text" v-if="nextStage">
        距{{ nextStage.label }}还差 {{ remaining }} 点
      </text>
      <text class="progress-text done" v-else>已满级 🌟</text>
    </view>

    <view class="divider" />
    <view class="water-row">
      <text class="water-icon">💧</text>
      <text class="water-text">最近浇水: {{ plantData?.lastWatered || '暂无记录' }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.plant-card {
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(20rpx);
  border-radius: 28rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 36rpx rgba(255,184,0,0.08);
  border: 1rpx solid rgba(255,255,255,0.6);
}
.plant-top {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}
.plant-icon-area {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255,184,0,0.1), rgba(255,212,79,0.15));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
  position: relative;
}
.plant-icon {
  font-size: 56rpx;
}
.health-dot {
  position: absolute;
  bottom: 6rpx;
  right: 6rpx;
  width: 22rpx;
  height: 22rpx;
  border-radius: 50%;
  border: 3rpx solid #fff;
}
.variety-name {
  font-size: 32rpx;
  font-weight: 700;
  color: #333;
  display: block;
  margin-bottom: 10rpx;
}
.stage-badge {
  display: inline-flex;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  background: rgba(255,184,0,0.1);
  font-size: 24rpx;
  color: #FFB800;
  font-weight: 600;
  margin-right: 10rpx;
}
.health-badge {
  display: inline-flex;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: #fff;
  font-weight: 600;
}
.progress-wrap {
  margin-bottom: 24rpx;
}
.progress-bar {
  height: 12rpx;
  border-radius: 6rpx;
  background: rgba(255,184,0,0.1);
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 6rpx;
  background: linear-gradient(90deg, #FFB800, #FFCC00);
  transition: width 0.5s ease;
  box-shadow: 0 2rpx 8rpx rgba(255,184,0,0.3);
}
.progress-text {
  font-size: 22rpx;
  color: #bbb;
  margin-top: 10rpx;
  display: block;
}
.progress-text.done {
  color: #FFB800;
}
.divider {
  height: 1rpx;
  background: rgba(255,184,0,0.08);
  margin-bottom: 16rpx;
}
.water-row {
  display: flex;
  align-items: center;
}
.water-icon {
  font-size: 24rpx;
  margin-right: 8rpx;
}
.water-text {
  font-size: 24rpx;
  color: #999;
}
</style>
