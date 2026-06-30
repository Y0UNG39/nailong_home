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

const glowPhase = ref(0)

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
  } catch {
    uni.showToast({ title: '加载失败，请下拉刷新', icon: 'none' })
  } finally {
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
  // 在页面显示时激发光晕动画
  glowPhase.value++
})
onPullDownRefresh(async () => {
  await loadData()
  uni.stopPullDownRefresh()
})

function goArcade(tab: string) {
  uni.setStorageSync('arcade_tab', tab)
  setTimeout(() => uni.switchTab({ url: '/pages/arcade/index' }), 50)
}

function goRecord(tab: string) {
  uni.setStorageSync('record_tab', tab)
  setTimeout(() => uni.switchTab({ url: '/pages/record/index' }), 50)
}

function goExpense() {
  uni.navigateTo({ url: '/pages/expense/index' })
}

myAvatar.value = store.user?.avatar || uni.getStorageSync('my_avatar') || ''
</script>

<template>
  <page-layout>
    <!-- 金色渐变头部 —— 带光晕和背景粒子 -->
    <view class="home-header stagger-enter">
      <!-- 动态光晕背景 -->
      <view class="header-aurora" :class="'phase-' + (glowPhase % 3)" />
      <view class="header-sparkles">
        <text class="hs hs1">✨</text>
        <text class="hs hs2">💛</text>
        <text class="hs hs3">✨</text>
        <text class="hs hs4">🌟</text>
        <text class="hs hs5">💛</text>
      </view>

      <view class="avatars-row">
        <view class="avatar-block">
          <button open-type="chooseAvatar" @chooseavatar="onChooseAvatar" class="avatar-circle-btn avatar-glow">
            <image v-if="myAvatar && !myAvatarFailed" :src="myAvatar" class="avatar-img" mode="aspectFill" @error="myAvatarFailed = true" />
            <text v-else class="a-emoji">{{ genderEmoji(myGender) }}</text>
          </button>
        </view>
        <view class="heart-wrap">
          <text class="heart-beat">❤️</text>
          <!-- 围绕爱心的微型粒子 -->
          <text class="heart-orb ho1">✨</text>
          <text class="heart-orb ho2">💕</text>
        </view>
        <view class="avatar-block">
          <view class="avatar-circle avatar-glow">
            <image v-if="partnerAvatar && !partnerAvatarFailed" :src="partnerAvatar" class="avatar-img" mode="aspectFill" @error="partnerAvatarFailed = true" />
            <text v-else class="a-emoji">{{ genderEmoji(partnerGender) }}</text>
          </view>
        </view>
      </view>
      <text class="couple-name">{{ coupleName }}</text>
      <text class="days-text">在一起</text>
      <text class="days-number">{{ togetherDays }}</text>
      <text class="days-unit">天</text>
    </view>

    <!-- 互动币浮卡 —— 带呼吸光晕 -->
    <view class="coin-card stagger-enter">
      <view class="coin-glow-ring" />
      <text class="cc-label">🪙 互动币</text>
      <text class="cc-value">{{ store.balance }}</text>
    </view>

    <loading-spinner v-if="loading" text="加载中..." />

    <template v-else>
      <!-- 快捷入口 —— 带弹性动画 -->
      <view class="quick-entries stagger-enter">
        <view class="qe-item" @tap="uni.navigateTo({ url: '/pages/shop/index' })">
          <view class="qe-icon-wrap shop"><text class="qe-icon">🛒</text></view>
          <text class="qe-label">小卖部</text>
        </view>
        <view class="qe-item" @tap="uni.navigateTo({ url: '/pages/wheel/index' })">
          <view class="qe-icon-wrap wheel"><text class="qe-icon">🎡</text></view>
          <text class="qe-label">转盘</text>
        </view>
        <view class="qe-item" @tap="goArcade('scratch')">
          <view class="qe-icon-wrap arcade"><text class="qe-icon">🎮</text></view>
          <text class="qe-label">乐园</text>
        </view>
        <view class="qe-item" @tap="goExpense">
          <view class="qe-icon-wrap expense"><text class="qe-icon">💰</text></view>
          <text class="qe-label">记账</text>
        </view>
      </view>

      <!-- 梦想进度 —— 带流光条 -->
      <view class="dream-card stagger-enter" @tap="goRecord('dream')">
        <view class="dream-glow-bar" />
        <view class="dream-header">
          <text class="dream-title">⭐ 梦想进度</text>
          <text class="dream-count">{{ dreamDone }}/{{ dreamTotal }} 已完成</text>
        </view>
        <view class="dream-bar-bg">
          <view
            class="dream-bar-fill"
            :style="{ width: dreamTotal ? (dreamDone / dreamTotal * 100) + '%' : '0%' }"
          >
            <view class="bar-shimmer" />
          </view>
        </view>
        <view class="dream-percent" v-if="dreamTotal > 0">
          {{ Math.round(dreamDone / dreamTotal * 100) }}%
        </view>
      </view>
    </template>
  </page-layout>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

/* ============================================
   金色头部 —— 带动态光晕
   ============================================ */
.home-header {
  background: $gradient-header;
  border-radius: 28rpx;
  padding: 36rpx 30rpx 32rpx;
  margin-bottom: -20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 12rpx 36rpx rgba(255, 184, 0, 0.25), 0 0 60rpx rgba(255, 184, 0, 0.08);
  position: relative;
  z-index: 1;
  overflow: hidden;
}

/* 动态光晕背景层 */
.header-aurora {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.5;
  transition: opacity 1s $ease-out-quart;
  background:
    radial-gradient(ellipse at 20% 50%, rgba(255, 215, 0, 0.3) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 50%, rgba(255, 107, 157, 0.15) 0%, transparent 50%);
  animation: auroraBreath 3s $ease-out-quart infinite;
}

.header-aurora.phase-1 {
  background:
    radial-gradient(ellipse at 30% 40%, rgba(255, 215, 0, 0.35) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 60%, rgba(255, 152, 0, 0.2) 0%, transparent 50%);
}

.header-aurora.phase-2 {
  background:
    radial-gradient(ellipse at 50% 30%, rgba(255, 215, 0, 0.4) 0%, transparent 50%),
    radial-gradient(ellipse at 60% 70%, rgba(255, 107, 157, 0.2) 0%, transparent 50%);
}

@keyframes auroraBreath {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
}

/* 头部浮动粒子 */
.header-sparkles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.hs {
  position: absolute;
  font-size: 20rpx;
  animation: particleRise 5s $ease-out-quart infinite;
  opacity: 0;
}
.hs1 { left: 10%; animation-delay: 0s; }
.hs2 { left: 30%; animation-delay: 1.5s; }
.hs3 { left: 55%; animation-delay: 0.8s; }
.hs4 { left: 75%; animation-delay: 2.2s; }
.hs5 { left: 90%; animation-delay: 0.3s; }

/* 头像行 */
.avatars-row { display: flex; align-items: center; margin-bottom: $space-md; position: relative; z-index: 1; }
.avatar-block { display: flex; flex-direction: column; align-items: center; }

/* 发光头像 */
.avatar-glow {
  animation: glowPulse 3s $ease-out-quart infinite;
}

.avatar-circle {
  width: 96rpx; height: 96rpx; border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(6rpx);
  -webkit-backdrop-filter: blur(6rpx);
  display: flex; align-items: center; justify-content: center;
  border: 3rpx solid rgba(255, 255, 255, 0.5);
  overflow: hidden;
  box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.3);
  transition: box-shadow 0.3s $ease-out-quart;
}

.avatar-circle-btn {
  width: 96rpx; height: 96rpx; border-radius: 50%; padding: 0; margin: 0;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(6rpx);
  -webkit-backdrop-filter: blur(6rpx);
  display: flex; align-items: center; justify-content: center;
  border: 3rpx solid rgba(255, 255, 255, 0.5);
  overflow: hidden; line-height: 1;
  box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.3);
  transition: box-shadow 0.3s $ease-out-quart;
}
.avatar-circle-btn::after { border: none; }

.avatar-img { width: 96rpx; height: 96rpx; border-radius: 50%; display: block; }
.a-emoji { font-size: 44rpx; }

/* 爱心（增强心跳） */
.heart-wrap {
  margin: 0 36rpx;
  position: relative;
}
.heart-beat {
  font-size: 44rpx;
  animation: heartbeat 1.8s $ease-spring infinite;
  display: block;
  filter: drop-shadow(0 0 6rpx rgba(255, 0, 0, 0.3));
}
.heart-orb {
  position: absolute;
  font-size: 16rpx;
  animation: float 2.5s $ease-out-quart infinite;
  pointer-events: none;
}
.ho1 { top: -10rpx; left: -15rpx; animation-delay: 0.2s; }
.ho2 { bottom: -8rpx; right: -12rpx; animation-delay: 1s; }

/* 文字样式 */
.couple-name {
  font-size: 36rpx;
  font-weight: 800;
  color: $white;
  margin-bottom: 4rpx;
  letter-spacing: 3rpx;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
}

.days-text {
  font-size: $text-sm;
  color: rgba(255, 255, 255, 0.75);
  position: relative;
  z-index: 1;
}

.days-number {
  font-size: $text-hero;
  font-weight: 900;
  color: $white;
  line-height: 1;
  margin-top: -4rpx;
  text-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
  animation: breathe 3s $ease-out-quart infinite;
}

.days-unit {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
  margin-top: -6rpx;
  position: relative;
  z-index: 1;
}

/* ============================================
   互动币浮卡 —— 带呼吸光晕环
   ============================================ */
.coin-card {
  @include glass-card-glow;
  padding: 24rpx 28rpx;
  margin: 0 20rpx 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 2;
  overflow: hidden;
  animation: glowPulse 3s $ease-out-quart infinite;
}
.coin-glow-ring {
  position: absolute;
  inset: -4rpx;
  border-radius: inherit;
  background: $gradient-gold-text;
  opacity: 0.08;
  animation: spin 8s linear infinite;
  z-index: -1;
}
.cc-label { font-size: $text-sm; color: $text-muted; }
.cc-value {
  font-size: $text-lg;
  font-weight: 800;
  @include text-glow($accent);
}

/* ============================================
   快捷入口 —— 弹性动画
   ============================================ */
.quick-entries {
  display: flex;
  gap: $space-md;
  margin-bottom: $space-lg;
}
.qe-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  &:active .qe-icon-wrap { transform: scale(0.88); }
}
.qe-icon-wrap {
  width: 96rpx; height: 96rpx;
  border-radius: $radius-lg;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 10rpx;
  transition: transform 0.2s $ease-spring, box-shadow 0.2s $ease-out-quart;
  &:active { transform: scale(0.88); }
}
.qe-icon-wrap.shop {
  background: linear-gradient(135deg, #FFF3E0, #FFE0B2);
  box-shadow: 0 4rpx 12rpx rgba(255, 152, 0, 0.12);
}
.qe-icon-wrap.wheel {
  background: linear-gradient(135deg, #FCE4EC, #F8BBD0);
  box-shadow: 0 4rpx 12rpx rgba(233, 30, 99, 0.08);
}
.qe-icon-wrap.arcade {
  background: linear-gradient(135deg, #E8F5E9, #C8E6C9);
  box-shadow: 0 4rpx 12rpx rgba(76, 175, 80, 0.08);
}
.qe-icon-wrap.expense {
  background: linear-gradient(135deg, #FFF8E1, #FFECB3);
  box-shadow: 0 4rpx 12rpx rgba(255, 184, 0, 0.1);
}
.qe-icon { font-size: 44rpx; }
.qe-label { font-size: $text-sm; color: $text-secondary; font-weight: 600; }

/* ============================================
   梦想进度 —— 带流光条
   ============================================ */
.dream-card {
  @include glass-card-glow;
  padding: $space-lg;
  position: relative;
  overflow: hidden;
  transition: transform 0.2s $ease-out-quart, box-shadow 0.2s $ease-out-quart;
  &:active {
    transform: scale(0.97);
    box-shadow: $shadow-card;
  }
}
.dream-glow-bar {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3rpx;
  background: $gradient-gold-text;
  opacity: 0.5;
}
.dream-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: $space-md;
}
.dream-title { font-size: 28rpx; font-weight: 700; color: $text; }
.dream-count { font-size: $text-sm; color: $text-faint; }

.dream-bar-bg {
  background: $border-light;
  border-radius: 8rpx;
  height: 14rpx;
  overflow: hidden;
  position: relative;
}
.dream-bar-fill {
  position: relative;
  height: 100%;
  border-radius: 8rpx;
  background: linear-gradient(90deg, $primary, $accent, $warm-pink);
  background-size: 200% 100%;
  animation: shimmerSlow 2.5s linear infinite;
  transition: width 0.5s $ease-out-quart;
  box-shadow: 0 0 8rpx rgba(255, 184, 0, 0.3);
}
/* 流光扫过 */
.bar-shimmer {
  position: absolute;
  inset: 0;
  background: $gradient-shimmer;
  animation: shimmer 2s ease-in-out infinite;
}

.dream-percent {
  font-size: $text-xs;
  color: $accent;
  font-weight: 700;
  text-align: right;
  margin-top: 6rpx;
  opacity: 0.8;
}
</style>
