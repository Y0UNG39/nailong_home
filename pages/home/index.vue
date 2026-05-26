<script setup lang="ts">
import { ref } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { useAppStore } from '@/store/index'

const store = useAppStore()
const loading = ref(false)

const coins = ref(0)

async function loadData() {
  if (!store.coupleId) return
  loading.value = true
  try {
    const res = await wx.cloud.callFunction({ name: 'getHomeData', data: { coupleId: store.coupleId } })
    if (res.result.success) {
      coins.value = res.result.coins || 0
      store.setBalance(coins.value)
      if (res.result.name) {
        uni.setNavigationBarTitle({ title: res.result.name })
      }
    }
  } catch {} finally {
    loading.value = false
  }
}

const subBannerClosed = ref(!!uni.getStorageSync('sub_banner_closed'))
const subscribed = ref(!!uni.getStorageSync('subscribed_msg'))

function dismissSubBanner() {
  subBannerClosed.value = true
  uni.setStorageSync('sub_banner_closed', true)
}

onShow(() => loadData())
onPullDownRefresh(async () => {
  await loadData()
  uni.stopPullDownRefresh()
})

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

function goArcade(tab: string) {
  uni.setStorageSync('arcade_tab', tab)
  setTimeout(() => {
    uni.switchTab({ url: '/pages/arcade/index' })
  }, 50)
}

</script>

<template>
  <page-layout>
    <!-- 订阅消息横幅 -->
    <view class="sub-banner" v-if="!subscribed && !subBannerClosed" @tap="requestSubscribe">
      <text class="sb-icon">🔔</text>
      <text class="sb-text">开启通知，对方用券时提醒你</text>
      <text class="sb-btn">去开启</text>
    </view>

    <!-- 快捷入口 -->
    <view class="quick-entries">
      <view class="qe-item" @tap="goArcade('shop')">
        <text class="qe-icon">🛒</text>
        <text class="qe-label">小卖部</text>
      </view>
      <view class="qe-item" @tap="goArcade('wheel')">
        <text class="qe-icon">🎡</text>
        <text class="qe-label">转盘</text>
      </view>
      <view class="qe-item" @tap="goArcade('scratch')">
        <text class="qe-icon">🎫</text>
        <text class="qe-label">刮刮卡</text>
      </view>
    </view>

    <loading-spinner v-if="loading" text="加载中..." />
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

.quick-entries {
  display: flex; gap: 20rpx; margin-bottom: 24rpx;
}
.qe-item {
  flex: 1; aspect-ratio: 1; border-radius: 24rpx;
  background: rgba(255,255,255,0.85); backdrop-filter: blur(16rpx);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(255,184,0,0.06);
  border: 1rpx solid rgba(255,255,255,0.5);
}
.qe-item:active { transform: scale(0.95); }
.qe-icon { font-size: 48rpx; margin-bottom: 10rpx; }
.qe-label { font-size: 24rpx; color: #555; font-weight: 600; }

</style>
