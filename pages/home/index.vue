<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { useAppStore } from '@/store/index'
import { daysBetween } from '@/utils/date'

const store = useAppStore()
const loading = ref(true)
const hasLoaded = ref(false)

const coupleName = ref('奶龙的家')
const togetherSince = ref('2019-05-01')
const togetherDays = computed(() => daysBetween(new Date(), togetherSince.value))

const myAvatar = ref('')
const myAvatarFailed = ref(false)
const partnerAvatar = ref('')
const partnerAvatarFailed = ref(false)
const partnerGender = ref('')
const myGender = ref('')

const dreamDone = ref(0)
const dreamTotal = ref(0)

function genderEmoji(g: string) { return g === 'female' ? '👩' : '🧑' }

async function loadData() {
  if (!store.coupleId) return
  if (!hasLoaded.value) loading.value = true
  try {
    const res = await wx.cloud.callFunction({ name: 'getProfileData', data: { coupleId: store.coupleId } })
    if (!res.result.success) return

    coupleName.value = res.result.name || '奶龙的家'
    store.setBalance(res.result.coins || 0)

    if (res.result.myAvatar && res.result.myAvatar !== myAvatar.value) {
      myAvatar.value = res.result.myAvatar
    }
    myGender.value = store.user?.gender || ''

    if (res.result.partner) {
      const newPartnerAvatar = res.result.partner.avatar || ''
      if (newPartnerAvatar !== partnerAvatar.value) {
        partnerAvatar.value = newPartnerAvatar
        partnerAvatarFailed.value = false
      }
      partnerGender.value = res.result.partner.gender || ''
      store.setPartner(res.result.partner)
    }

    const s = res.result.stats || {}
    dreamDone.value = s.dreams || 0
    dreamTotal.value = s.dreamsTotal || 0
    hasLoaded.value = true
  } catch {} finally {
    loading.value = false
  }
}

async function onChooseAvatar(e: any) {
  const tempUrl = e.detail?.avatarUrl || ''
  if (!tempUrl) return

  uni.showLoading({ title: '上传头像...' })
  try {
    const uid = store.openid || String(Date.now())
    const cloudPath = `avatars/${uid}.jpg`
    const upRes = await wx.cloud.uploadFile({ cloudPath, filePath: tempUrl })
    const cloudFileId = upRes.fileID

    const urlRes = await wx.cloud.getTempFileURL({ fileList: [cloudFileId] })
    myAvatar.value = urlRes.fileList[0]?.tempFileURL || cloudFileId
    store.updateUser({ avatar: cloudFileId })
    uni.setStorageSync('my_avatar', cloudFileId)
    const saveRes = await wx.cloud.callFunction({ name: 'updateAvatar', data: { avatar: cloudFileId } })
    uni.hideLoading()
    if (saveRes.result?.success) {
      uni.showToast({ title: '头像已同步', icon: 'success' })
    } else {
      uni.showToast({ title: saveRes.result?.error || '同步失败', icon: 'none' })
    }
  } catch {
    uni.hideLoading()
    uni.showToast({ title: '上传失败，请重试', icon: 'none' })
  }
}

onShow(() => {
  if (!hasLoaded.value) loadData()
})
onPullDownRefresh(async () => {
  await loadData()
  uni.stopPullDownRefresh()
})

function goArcade(tab: string) {
  uni.setStorageSync('arcade_tab', tab)
  setTimeout(() => {
    uni.switchTab({ url: '/pages/arcade/index' })
  }, 50)
}

function goExpense() {
  uni.navigateTo({ url: '/pages/expense/index' })
}

myAvatar.value = store.user?.avatar || uni.getStorageSync('my_avatar') || ''
</script>

<template>
  <page-layout>
    <!-- 金色渐变头部 -->
    <view class="home-header">
      <view class="avatars-row">
        <view class="avatar-block">
          <button open-type="chooseAvatar" @chooseavatar="onChooseAvatar" class="avatar-circle-btn">
            <image v-if="myAvatar && !myAvatarFailed" :src="myAvatar" class="avatar-img" mode="aspectFill" @error="myAvatarFailed = true" />
            <text v-else class="a-emoji">{{ genderEmoji(myGender) }}</text>
          </button>
        </view>
        <view class="heart-wrap"><text class="heart-beat">❤️</text></view>
        <view class="avatar-block">
          <view class="avatar-circle">
            <image v-if="partnerAvatar && !partnerAvatarFailed" :src="partnerAvatar" class="avatar-img" mode="aspectFill" @error="partnerAvatarFailed = true" />
            <text v-else class="a-emoji">{{ genderEmoji(partnerGender) }}</text>
          </view>
        </view>
      </view>
      <text class="couple-name">{{ coupleName }}</text>
      <text class="days-text">在一起 {{ togetherDays }} 天</text>
    </view>

    <!-- 互动币浮卡 -->
    <view class="coin-card">
      <text class="cc-label">互动币</text>
      <text class="cc-label cc-right">余额</text>
      <text class="cc-value">{{ store.balance }}🪙</text>
    </view>

    <loading-spinner v-if="loading" text="加载中..." />

    <template v-else>
      <!-- 快捷入口 -->
      <view class="quick-entries">
        <view class="qe-item" @tap="goArcade('shop')">
          <view class="qe-icon-wrap shop"><text class="qe-icon">🛒</text></view>
          <text class="qe-label">小卖部</text>
        </view>
        <view class="qe-item" @tap="goArcade('wheel')">
          <view class="qe-icon-wrap wheel"><text class="qe-icon">🎡</text></view>
          <text class="qe-label">转盘</text>
        </view>
        <view class="qe-item" @tap="goExpense">
          <view class="qe-icon-wrap expense"><text class="qe-icon">💰</text></view>
          <text class="qe-label">记账</text>
        </view>
      </view>

      <!-- 梦想进度 -->
      <view class="dream-card" @tap="uni.switchTab({ url: '/pages/future/index' })">
        <view class="dream-header">
          <text class="dream-title">⭐ 梦想进度</text>
          <text class="dream-count">{{ dreamDone }}/{{ dreamTotal }} 已完成</text>
        </view>
        <view class="dream-bar-bg">
          <view class="dream-bar-fill" :style="{ width: dreamTotal ? (dreamDone / dreamTotal * 100) + '%' : '0%' }" />
        </view>
      </view>
    </template>
  </page-layout>
</template>

<style lang="scss" scoped>
/* ---- 金色头部 ---- */
.home-header {
  background: linear-gradient(135deg, #FFB800, #FFCC00 50%, #FFD54F);
  border-radius: 28rpx; padding: 36rpx 30rpx 28rpx; margin-bottom: -20rpx;
  display: flex; flex-direction: column; align-items: center;
  box-shadow: 0 12rpx 36rpx rgba(255,184,0,0.25);
  position: relative; z-index: 1;
}
.avatars-row { display: flex; align-items: center; margin-bottom: 16rpx; }
.avatar-block { display: flex; flex-direction: column; align-items: center; }
.avatar-circle {
  width: 96rpx; height: 96rpx; border-radius: 50%;
  background: rgba(255,255,255,0.3); backdrop-filter: blur(6rpx);
  display: flex; align-items: center; justify-content: center;
  border: 3rpx solid rgba(255,255,255,0.5); overflow: hidden;
}
.avatar-circle-btn {
  width: 96rpx; height: 96rpx; border-radius: 50%; padding: 0; margin: 0;
  background: rgba(255,255,255,0.3); backdrop-filter: blur(6rpx);
  display: flex; align-items: center; justify-content: center;
  border: 3rpx solid rgba(255,255,255,0.5); overflow: hidden; line-height: 1;
}
.avatar-circle-btn::after { border: none; }
.avatar-img { width: 96rpx; height: 96rpx; border-radius: 50%; display: block; }
.a-emoji { font-size: 44rpx; }
.heart-wrap { margin: 0 36rpx; }
.heart-beat { font-size: 40rpx; animation: heartbeat 1.2s ease-in-out infinite; display: block; }
@keyframes heartbeat { 0%,100%{transform:scale(1)} 25%{transform:scale(1.2)} 50%{transform:scale(1)} 75%{transform:scale(1.15)} }
.couple-name { font-size: 34rpx; font-weight: 700; color: #fff; margin-bottom: 6rpx; letter-spacing: 2rpx; }
.days-text { font-size: 24rpx; color: rgba(255,255,255,0.8); }

/* ---- 互动币浮卡 ---- */
.coin-card {
  background: #fff; border-radius: 16rpx; padding: 22rpx 28rpx;
  margin: 0 20rpx 20rpx; display: flex; align-items: center;
  box-shadow: 0 6rpx 24rpx rgba(0,0,0,0.08); position: relative; z-index: 2;
}
.cc-label { font-size: 26rpx; color: #999; margin-right: 8rpx; }
.cc-right { margin-right: auto; margin-left: 0; }
.cc-value { font-size: 36rpx; font-weight: 800; color: #FF9800; }

/* ---- 快捷入口 ---- */
.quick-entries {
  display: flex; gap: 16rpx; margin-bottom: 24rpx;
}
.qe-item {
  flex: 1; display: flex; flex-direction: column; align-items: center;
}
.qe-icon-wrap {
  width: 96rpx; height: 96rpx; border-radius: 24rpx;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 10rpx;
}
.qe-icon-wrap.shop { background: #FFF3E0; }
.qe-icon-wrap.wheel { background: #FCE4EC; }
.qe-icon-wrap.scratch { background: #E8F5E9; }
.qe-icon-wrap.dice { background: #E3F2FD; }
.qe-icon-wrap.expense { background: #FFF8E1; }
.qe-icon-wrap.slot { background: #FBE9E7; }
.qe-icon-wrap:active { transform: scale(0.92); }
.qe-icon { font-size: 44rpx; }
.qe-label { font-size: 24rpx; color: #666; font-weight: 600; }

/* ---- 梦想进度 ---- */
.dream-card {
  background: rgba(255,255,255,0.85); backdrop-filter: blur(16rpx);
  border-radius: 20rpx; padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(255,184,0,0.06);
  border: 1rpx solid rgba(255,255,255,0.5); transition: transform 0.15s;
}
.dream-card:active { transform: scale(0.97); }
.dream-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 16rpx;
}
.dream-title { font-size: 28rpx; font-weight: 700; color: #333; }
.dream-count { font-size: 24rpx; color: #bbb; }
.dream-bar-bg {
  background: #F5F5F5; border-radius: 8rpx; height: 12rpx; overflow: hidden;
}
.dream-bar-fill {
  height: 100%; border-radius: 8rpx;
  background: linear-gradient(90deg, #FFB800, #FF5722);
  transition: width 0.3s ease;
}
</style>
