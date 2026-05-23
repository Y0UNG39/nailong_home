<script setup lang="ts">
import { ref } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { useAppStore } from '@/store/index'
import { timeAgo } from '@/utils/date'

const store = useAppStore()

const plantData = ref({
  stage: 'growing', growthValue: 55, health: 'healthy',
  variety: 'rose', lastWatered: '30分钟前'
})

const checkIn = ref({ completed: 2, total: 4 })

const activities = ref([
  { type: 'task_complete', user: 'TA', content: '完成了「今天11点前睡」打卡', time: '30分钟前', icon: '✅' },
  { type: 'achievement', user: '你', content: '解锁了成就「打卡狂魔」', time: '2小时前', icon: '🏆' },
  { type: 'watering', user: 'TA', content: '给植物浇了水', time: '3小时前', icon: '💧' },
  { type: 'shop', user: '你', content: '在小卖部购买了「按摩券」', time: '5小时前', icon: '🛒' },
  { type: 'task_create', user: 'TA', content: '发布了新任务「今天喝水8杯」', time: '昨天', icon: '📋' }
])

async function loadData() {
  // TODO: real cloud function calls
}

onShow(() => loadData())
onPullDownRefresh(async () => {
  await loadData()
  uni.stopPullDownRefresh()
})

function goCheckIn() {
  uni.switchTab({ url: '/pages/tasks/index' })
}
</script>

<template>
  <page-layout>
    <!-- 植物园卡片 -->
    <plant-status :plantData="plantData" />

    <!-- 今日打卡入口 -->
    <view class="checkin-card" @tap="goCheckIn">
      <view class="ck-left">
        <view class="ck-icon-wrap"><text class="ck-icon">📋</text></view>
        <view class="ck-info">
          <text class="ck-title">今日打卡</text>
          <text class="ck-sub">去看看今天的任务吧</text>
        </view>
      </view>
      <view class="ck-right">
        <text class="ck-progress">{{ checkIn.completed }}</text>
        <text class="ck-total"> / {{ checkIn.total }}</text>
        <text class="ck-arrow">→</text>
      </view>
    </view>

    <!-- 最近动态 -->
    <view class="activity-card">
      <view class="section-header">
        <text class="section-title">📰 最近动态</text>
      </view>
      <view class="act-list">
        <view class="act-item" v-for="a in activities" :key="a.time">
          <view class="act-icon-wrap"><text class="act-icon">{{ a.icon }}</text></view>
          <view class="act-body">
            <text class="act-text">
              <text class="act-user">{{ a.user }}</text>
              {{ a.content }}
            </text>
            <text class="act-time">{{ a.time }}</text>
          </view>
        </view>
      </view>
    </view>
  </page-layout>
</template>

<style lang="scss" scoped>
.checkin-card {
  background: linear-gradient(135deg, #FFB800 0%, #FFCC00 100%);
  border-radius: 28rpx;
  padding: 28rpx 30rpx;
  margin-bottom: 24rpx;
  display: flex; align-items: center; justify-content: space-between;
  box-shadow: 0 12rpx 32rpx rgba(255,184,0,0.25);
}
.ck-left { display: flex; align-items: center; }
.ck-icon-wrap {
  width: 76rpx; height: 76rpx; border-radius: 50%;
  background: rgba(255,255,255,0.22); backdrop-filter: blur(8rpx);
  display: flex; align-items: center; justify-content: center;
  margin-right: 18rpx;
}
.ck-icon { font-size: 36rpx; }
.ck-title { font-size: 32rpx; font-weight: 700; color: #fff; display: block; }
.ck-sub { font-size: 22rpx; color: rgba(255,255,255,0.7); margin-top: 4rpx; }
.ck-right { display: flex; align-items: baseline; }
.ck-progress { font-size: 44rpx; font-weight: 800; color: #fff; }
.ck-total { font-size: 28rpx; color: rgba(255,255,255,0.6); }
.ck-arrow { font-size: 36rpx; color: rgba(255,255,255,0.5); margin-left: 6rpx; }

.activity-card {
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(20rpx);
  border-radius: 24rpx;
  padding: 20rpx 0;
  box-shadow: 0 6rpx 28rpx rgba(255,184,0,0.06);
  border: 1rpx solid rgba(255,255,255,0.5);
}
.section-header { padding: 0 28rpx 18rpx; border-bottom: 1rpx solid rgba(255,184,0,0.06); }
.section-title { font-size: 30rpx; font-weight: 700; color: #333; }
.act-list { padding: 0 28rpx; }
.act-item { display: flex; align-items: center; padding: 20rpx 0; border-bottom: 1rpx solid rgba(255,184,0,0.04); }
.act-item:last-child { border-bottom: none; }
.act-icon-wrap {
  width: 52rpx; height: 52rpx; border-radius: 50%;
  background: linear-gradient(135deg, rgba(255,184,0,0.08), rgba(255,182,193,0.12));
  display: flex; align-items: center; justify-content: center; margin-right: 16rpx; flex-shrink: 0;
}
.act-icon { font-size: 26rpx; }
.act-body { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.act-text { font-size: 26rpx; color: #555; line-height: 1.5; }
.act-user { color: #FFB800; font-weight: 600; }
.act-time { font-size: 22rpx; color: #ccc; margin-top: 4rpx; }
</style>
