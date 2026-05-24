<script setup lang="ts">
import { ref } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { useAppStore } from '@/store/index'
import { timeAgo } from '@/utils/date'

const store = useAppStore()
const loading = ref(false)

const plantData = ref({
  stage: 'seedling', growthValue: 0, health: 'healthy',
  variety: 'rose', lastWatered: '暂无记录'
})

const todayCheckIn = ref({ completed: 0, total: 0 })
const activities = ref<any[]>([])

function formatRelativeTime(t: string) {
  if (!t) return ''
  try {
    return timeAgo(t)
  } catch { return t }
}

async function loadData() {
  if (!store.coupleId) return
  loading.value = true

  wx.cloud.callFunction({ name: 'getCoupleInfo', data: { coupleId: store.coupleId } }).then(res => {
    if (res.result.success) {
      if (res.result.plant) {
        const p = res.result.plant
        plantData.value = {
          stage: p.stage || 'seedling',
          growthValue: p.growthValue || 0,
          health: p.health || 'healthy',
          variety: p.variety || 'rose',
          lastWatered: p.lastWatered ? formatRelativeTime(p.lastWatered) : '暂无记录'
        }
      }
      wateredToday.value = res.result.wateredToday || false
    }
  }).catch(() => {})

  wx.cloud.callFunction({ name: 'getTasks', data: { coupleId: store.coupleId } }).then(res => {
    if (res.result.success) {
      const tasks = res.result.tasks || []
      const dailyTasks = tasks.filter((t: any) => t.type === 'DAILY')
      const done = dailyTasks.filter((t: any) => t.status === 'submitted' || t.status === 'approved').length
      todayCheckIn.value = { completed: done, total: dailyTasks.length }
    }
  }).catch(() => {})

  wx.cloud.callFunction({ name: 'getFeed', data: { coupleId: store.coupleId } }).then(res => {
    if (res.result.success) {
      activities.value = (res.result.activities || []).map((a: any) => ({
        ...a,
        time: formatRelativeTime(a.time)
      }))
    }
  }).catch(() => {}).finally(() => {
    loading.value = false
  })
}

const subBannerClosed = ref(!!uni.getStorageSync('sub_banner_closed'))
const subscribed = ref(!!uni.getStorageSync('subscribed_msg'))
const watering = ref(false)
const wateredToday = ref(false)

function dismissSubBanner() {
  subBannerClosed.value = true
  uni.setStorageSync('sub_banner_closed', true)
}

onShow(() => loadData())
onPullDownRefresh(async () => {
  await loadData()
  uni.stopPullDownRefresh()
})

async function onWater() {
  if (!store.coupleId || watering.value) return
  watering.value = true
  try {
    const res = await wx.cloud.callFunction({ name: 'plantWater', data: { coupleId: store.coupleId, source: 'manual' } })
    if (res.result.success) {
      uni.showToast({ title: `+${res.result.add} 成长值`, icon: 'success' })
      wateredToday.value = true
      loadData()
    } else {
      uni.showToast({ title: res.result.error || '浇水失败', icon: 'none' })
      if (res.result.error === '今天已经浇过了') wateredToday.value = true
    }
  } catch {
    uni.showToast({ title: '浇水失败', icon: 'none' })
  } finally {
    watering.value = false
  }
}

function requestSubscribe() {
  wx.requestSubscribeMessage({
    tmplIds: ['mP6k6rjwe28q4WZ8njLetvXqeA1eH268EVoqrbvKmWc'],
    success() {
      subscribed.value = true
      uni.setStorageSync('subscribed_msg', true)
      uni.showToast({ title: '已订阅', icon: 'success' })
    },
    fail() { uni.showToast({ title: '订阅失败', icon: 'none' }) }
  })
}

function goCheckIn() {
  uni.switchTab({ url: '/pages/tasks/index' })
}
</script>

<template>
  <page-layout>
    <!-- 植物园卡片 -->
    <plant-status :plantData="plantData" />

    <!-- 订阅消息横幅 -->
    <view class="sub-banner" v-if="!subscribed && !subBannerClosed" @tap="requestSubscribe">
      <text class="sb-icon">🔔</text>
      <text class="sb-text">开启通知，对方用券时提醒你</text>
      <text class="sb-btn">去开启</text>
    </view>

    <!-- 浇水按钮 -->
    <view class="water-btn" :class="{ disabled: wateredToday || watering }" @tap="onWater">
      <text class="water-icon">💧</text>
      <text class="water-label">{{ watering ? '浇水...' : wateredToday ? '今日已浇' : '浇水 +10' }}</text>
    </view>

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
        <text class="ck-progress">{{ todayCheckIn.completed }}</text>
        <text class="ck-total"> / {{ todayCheckIn.total }}</text>
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
.sub-banner {
  background: linear-gradient(135deg, #FF8F00, #FFB300); border-radius: 20rpx;
  padding: 20rpx 24rpx; margin-bottom: 20rpx; display: flex; align-items: center;
  box-shadow: 0 6rpx 20rpx rgba(255,143,0,0.25);
}
.sb-icon { font-size: 34rpx; margin-right: 12rpx; }
.sb-text { flex: 1; font-size: 24rpx; color: #fff; }
.sb-btn {
  background: rgba(255,255,255,0.25); border-radius: 24rpx; padding: 10rpx 24rpx;
  font-size: 24rpx; color: #fff; font-weight: 700; flex-shrink: 0; margin-left: 12rpx;
}
.sb-close { font-size: 28rpx; color: rgba(255,255,255,0.5); flex-shrink: 0; margin-left: 14rpx; padding: 6rpx; }

.water-btn {
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(16rpx);
  border-radius: 24rpx;
  padding: 24rpx 30rpx;
  margin-bottom: 20rpx;
  display: flex; align-items: center; justify-content: center;
  border: 2rpx solid rgba(33,150,243,0.2);
  box-shadow: 0 4rpx 16rpx rgba(33,150,243,0.06);
}
.water-btn.disabled { opacity: 0.5; pointer-events: none; }
.water-icon { font-size: 32rpx; margin-right: 10rpx; }
.water-label { font-size: 28rpx; color: #2196F3; font-weight: 600; }

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
