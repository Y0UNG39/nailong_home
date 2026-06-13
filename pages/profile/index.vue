<script setup lang="ts">
import { ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAppStore } from '@/store/index'

const store = useAppStore()

const coupleName = ref('我们的空间')
const editingName = ref(false)
const newName = ref('')
const inviteCode = ref('')
const myGender = ref(store.user?.gender || '')

// 订阅通知
const subBannerClosed = ref(!!uni.getStorageSync('sub_banner_closed'))
const subscribed = ref(!!uni.getStorageSync('subscribed_msg'))

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

function dismissSubBanner() {
  subBannerClosed.value = true
  uni.setStorageSync('sub_banner_closed', true)
}

onShow(() => loadSettingsData())

async function loadSettingsData() {
  if (!store.coupleId) return
  try {
    const res = await wx.cloud.callFunction({ name: 'getProfileData', data: { coupleId: store.coupleId } })
    if (!res.result.success) return

    coupleName.value = res.result.name || '我们的空间'

    const code = res.result.inviteCode
    if (code) {
      inviteCode.value = code
      store.setInviteCode(code)
    }

    myGender.value = store.user?.gender || ''

    coupons.value = res.result.coupons || []
    updateCoupons()
  } catch {}
}

// 券包
const coupons = ref<any[]>([])
const showCoupons = ref(false)
const showSettings = ref(false)
const couponTab = ref('unused')
const filteredCoupons = ref<any[]>([])
const unusedCount = ref(0)

function updateCoupons() {
  filteredCoupons.value = coupons.value.filter(c => c.status === couponTab.value)
  unusedCount.value = coupons.value.filter(c => c.status === 'unused').length
}

async function loadCoupons() {
  if (!store.coupleId) return
  try {
    const res = await wx.cloud.callFunction({ name: 'getProfileData', data: { coupleId: store.coupleId } })
    if (res.result.success) {
      coupons.value = res.result.coupons || []
      updateCoupons()
    }
  } catch {}
}

function openCoupons() {
  showCoupons.value = true
  loadCoupons()
}

const swipeState = ref<Record<string, number>>({})
const swipeStartX = ref(0)
const swipingId = ref('')
const couponDelWidth = 140

function couponTouchStart(e: any, id: string) {
  const c = coupons.value.find(c => c._id === id)
  if (!c || c.status === 'unused') return
  swipeStartX.value = e.touches[0].clientX
  swipingId.value = id
}

function couponTouchMove(e: any) {
  if (!swipingId.value) return
  const dx = e.touches[0].clientX - swipeStartX.value
  const cur = swipeState.value[swipingId.value] || 0
  if (dx < 0) {
    swipeState.value[swipingId.value] = Math.max(dx, -couponDelWidth)
  } else {
    swipeState.value[swipingId.value] = Math.min(0, cur + dx * 0.3)
  }
}

function couponTouchEnd() {
  const id = swipingId.value
  if (!id) return
  const cur = swipeState.value[id] || 0
  swipeState.value[id] = cur < -couponDelWidth / 2 ? -couponDelWidth : 0
  swipingId.value = ''
}

function couponTap(id: string) {
  const x = swipeState.value[id] || 0
  if (Math.abs(x) > 5) {
    swipeState.value[id] = 0
  }
}

async function onCouponDelete(c: any) {
  const ok = await uni.showModal({ title: '确认删除', content: `确定删除「${c.name}」吗？` })
  if (!ok.confirm) return
  swipeState.value[c._id] = 0
  coupons.value = coupons.value.filter(x => x._id !== c._id)
  updateCoupons()
  try {
    const res = await wx.cloud.callFunction({ name: 'couponDelete', data: { couponId: c._id } })
    if (!res.result.success) {
      coupons.value.push(c)
      updateCoupons()
      uni.showToast({ title: res.result.error || '删除失败', icon: 'none' })
    } else {
      uni.showToast({ title: '已删除', icon: 'success' })
    }
  } catch {
    coupons.value.push(c)
    updateCoupons()
    uni.showToast({ title: '删除失败', icon: 'none' })
  }
}

function startEditName() { newName.value = coupleName.value; editingName.value = true }
async function saveName() {
  if (!store.coupleId) return
  try {
    await wx.cloud.callFunction({ name: 'updateCoupleName', data: { coupleId: store.coupleId, name: newName.value } })
    coupleName.value = newName.value
    editingName.value = false
    uni.showToast({ title: '已修改', icon: 'success' })
  } catch {
    uni.showToast({ title: '修改失败', icon: 'none' })
  }
}

async function useCoupon(c: any) {
  try {
    await wx.cloud.callFunction({ name: 'shopUseCoupon', data: { couponId: c._id } })
    c.status = 'used'
    c.usedAt = new Date().toISOString()
    updateCoupons()
    uni.showToast({ title: '已使用', icon: 'success' })
  } catch {
    uni.showToast({ title: '使用失败', icon: 'none' })
  }
}

async function setGender(g: string) {
  if (myGender.value === g) return
  try {
    await wx.cloud.callFunction({ name: 'login', data: { gender: g } })
    myGender.value = g
    store.updateUser({ gender: g })
    uni.showToast({ title: '已更新', icon: 'success' })
  } catch {
    uni.showToast({ title: '更新失败', icon: 'none' })
  }
}

function onShowSettings() {
  showSettings.value = true
}

function goExpense() {
  uni.navigateTo({ url: '/pages/expense/index' })
}

watch(couponTab, updateCoupons)
</script>

<template>
  <page-layout>
    <!-- 开启通知 -->
    <view class="sub-banner" v-if="!subscribed && !subBannerClosed" @tap="requestSubscribe">
      <text class="sb-icon">🔔</text>
      <text class="sb-text">开启通知，对方用券时提醒你</text>
      <text class="sb-btn" @tap.stop="dismissSubBanner">✕</text>
    </view>

    <!-- 券包 -->
    <view class="menu-card" @tap="openCoupons">
      <view class="m-left"><text class="m-icon">🎫</text><text class="m-title">券包</text></view>
      <view class="m-right">
        <view class="m-badge" v-if="unusedCount > 0">{{ unusedCount }}张可用</view>
        <text class="m-arrow">›</text>
      </view>
    </view>

    <!-- 记账 -->
    <view class="menu-card" @tap="goExpense">
      <view class="m-left"><text class="m-icon">💰</text><text class="m-title">记账</text></view>
      <view class="m-right"><text class="m-arrow">›</text></view>
    </view>

    <!-- 设置 -->
    <view class="menu-card" @tap="onShowSettings">
      <view class="m-left"><text class="m-icon">⚙️</text><text class="m-title">设置</text></view>
      <view class="m-right"><text class="m-arrow">›</text></view>
    </view>

    <!-- 券包弹窗 -->
    <view v-if="showCoupons" class="overlay" @tap="showCoupons = false">
      <view class="panel" @tap.stop>
        <view class="panel-header">
          <text class="panel-title">🎫 券包</text>
          <view class="close-btn" @tap="showCoupons = false"><text>✕</text></view>
        </view>
        <view class="coupon-tabs">
          <view v-for="t in ['unused','used']" :key="t" class="ctab" :class="{ active:couponTab===t }" @tap="couponTab=t">
            {{ t==='unused'?'未使用':'已使用' }}
          </view>
        </view>
        <scroll-view class="coupon-list" scroll-y>
          <view v-for="c in filteredCoupons" :key="c._id" class="coupon-card-wrap">
            <view class="coupon-del-btn" :class="{ show: (swipeState[c._id] || 0) < 0 }" @tap.stop="onCouponDelete(c)" v-if="c.status !== 'unused'">
              <text class="del-text" v-if="(swipeState[c._id] || 0) < 0">删除</text>
            </view>
            <view class="c-card" :class="c.status"
              :style="{ transform: (swipeState[c._id] || 0) ? 'translateX(' + (swipeState[c._id] || 0) + 'rpx)' : '' }"
              @touchstart="couponTouchStart($event, c._id)" @touchmove="couponTouchMove($event)" @touchend="couponTouchEnd()" @tap="couponTap(c._id)">
              <view class="c-left"><text class="c-icon">{{ c.type==='service'?'🛎️':c.type==='physical'?'🎁':'👑' }}</text></view>
              <view class="c-info">
                <text class="c-name">{{ c.name }}</text>
                <text class="c-date">{{ c.ownerId === store.openid ? '我的' : 'TA的' }} · {{ c.usedAt ? '已使用' : '未使用' }}</text>
              </view>
              <view v-if="c.status==='unused' && c.ownerId === store.openid" class="use-btn" @tap.stop="useCoupon(c)"><text>使用</text></view>
            </view>
          </view>
          <empty-state v-if="filteredCoupons.length===0" icon="🎫" text="空空如也" />
        </scroll-view>
      </view>
    </view>

    <!-- 设置弹窗 -->
    <view v-if="showSettings" class="overlay" @tap="showSettings = false">
      <view class="panel" @tap.stop>
        <view class="panel-header">
          <text class="panel-title">⚙️ 设置</text>
          <view class="close-btn" @tap="showSettings = false"><text>✕</text></view>
        </view>
        <view class="settings-body">
          <view class="set-row">
            <text class="set-label">我们的家</text>
            <text class="set-val" v-if="!editingName" @tap="startEditName">{{ coupleName }} ✏️</text>
            <input v-else class="set-input" v-model="newName" @blur="saveName" maxlength="20" />
          </view>
          <view class="set-row">
            <text class="set-label">性别</text>
            <view class="gender-btns">
              <view class="g-btn" :class="{ sel: myGender === 'male' }" @tap="setGender('male')">🧑 男</view>
              <view class="g-btn" :class="{ sel: myGender === 'female' }" @tap="setGender('female')">👩 女</view>
            </view>
          </view>
          <view class="set-row">
            <text class="set-label">邀请码</text>
            <text class="invite-code" v-if="inviteCode && inviteCode !== '暂无' && inviteCode !== '获取失败'" @tap="() => { uni.setClipboardData({ data: inviteCode }); uni.showToast({ title: '已复制', icon: 'success' }) }">{{ inviteCode }} 📋</text>
            <text class="invite-code dim" v-else>{{ inviteCode || '加载中...' }}</text>
          </view>
        </view>
      </view>
    </view>
  </page-layout>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.sub-banner {
  background: linear-gradient(135deg, #FF8F00, #FFB300); border-radius: $radius-lg;
  padding: $space-lg 24rpx; margin-bottom: $space-md; display: flex; align-items: center;
  box-shadow: 0 6rpx 20rpx rgba(255,143,0,0.25);
}
.sb-icon { font-size: 34rpx; margin-right: $space-sm; }
.sb-text { flex: 1; font-size: $text-sm; color: $white; }
.sb-btn {
  background: rgba(255,255,255,0.25); border-radius: 50%; width: 44rpx; height: 44rpx;
  display: flex; align-items: center; justify-content: center;
  font-size: $text-sm; color: $white; font-weight: 700; flex-shrink: 0;
}

.menu-card {
  @include glass-card;
  padding: 26rpx 28rpx; margin-bottom: 14rpx;
  display: flex; align-items: center; justify-content: space-between;
  transition: transform 0.15s;
  &:active { transform: scale(0.98); }
}
.m-left { display: flex; align-items: center; }
.m-icon { font-size: 32rpx; margin-right: 14rpx; }
.m-title { font-size: 28rpx; font-weight: 600; color: $text; }
.m-right { display: flex; align-items: center; }
.m-badge { font-size: $text-xs; color: $primary; background: rgba(255,184,0,0.08); border-radius: $radius-md; padding: 4rpx 14rpx; margin-right: 8rpx; }
.m-arrow { font-size: $text-lg; color: $border; }

.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4rpx);
  z-index: 1000; display: flex; align-items: flex-end;
}
.panel {
  width: 100%; max-height: 85vh; background: $white;
  border-radius: $radius-xl $radius-xl 0 0;
  display: flex; flex-direction: column; overflow: hidden;
  animation: slideUp 0.3s ease-out;
}
.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 28rpx 30rpx; border-bottom: 1rpx solid $primary-bg;
}
.panel-title { font-size: 32rpx; font-weight: 700; color: $text; }
.close-btn {
  width: 44rpx; height: 44rpx; border-radius: 50%; background: $primary-bg;
  display: flex; align-items: center; justify-content: center;
  font-size: 26rpx; color: $primary;
}

.coupon-tabs { display: flex; border-bottom: 1rpx solid $primary-bg; }
.ctab { flex: 1; text-align: center; padding: $space-lg 0; font-size: 26rpx; color: $text-muted; }
.ctab.active { color: $primary; font-weight: 700; position: relative; }
.ctab.active::after {
  content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 40rpx; height: 4rpx; background: $primary; border-radius: 2rpx;
}
.coupon-list { flex: 1; padding: $space-md 24rpx; max-height: 50vh; }
.c-card {
  display: flex; align-items: center; padding: 22rpx 18rpx; border-radius: 14rpx;
  border-left: 6rpx solid $primary; background: #FFFDE7;
  position: relative; z-index: 1; transition: transform 0.2s ease;
}
.c-card.used { border-left-color: $text-faint; background: #F7F7F7; }
.c-card.expired { border-left-color: $border; background: $border-light; }
.c-left { margin-right: 14rpx; }
.c-icon { font-size: $text-lg; }
.c-info { flex: 1; }
.c-name { font-size: 26rpx; font-weight: 600; color: $text; display: block; }
.c-date { font-size: $text-xs; color: $text-faint; margin-top: 4rpx; }
.use-btn {
  padding: 10rpx 24rpx; border-radius: $space-lg;
  background: $gradient-primary; font-size: $text-xs; font-weight: 700; color: $white; flex-shrink: 0;
}

.coupon-card-wrap { position: relative; overflow: hidden; border-radius: 14rpx; margin-bottom: 14rpx; }
.coupon-del-btn {
  position: absolute; right: 0; top: 0; bottom: 0; width: 140rpx;
  border-radius: 0 14rpx 14rpx 0;
  display: flex; align-items: center; justify-content: center; opacity: 0;
}
.coupon-del-btn.show { background: $error; opacity: 1; }
.coupon-del-btn .del-text { color: $white; font-size: 26rpx; font-weight: 700; }

.settings-body { padding: $space-lg 28rpx; }
.set-row { padding: $space-lg 0; border-bottom: 1rpx solid $border-light; }
.set-label { font-size: 28rpx; font-weight: 600; color: $text; display: block; margin-bottom: 14rpx; }
.set-val { font-size: 26rpx; color: $primary; }
.invite-code { font-size: 32rpx; font-weight: 800; color: $primary; letter-spacing: 4rpx; }
.invite-code.dim { color: $text-faint; font-weight: 400; letter-spacing: 0; }
.set-input { font-size: 26rpx; border: 2rpx solid $primary-light; border-radius: $radius-sm; padding: $space-sm $space-md; }
.gender-btns { display: flex; gap: $space-md; }
.g-btn {
  flex: 1; text-align: center; padding: $space-md; border-radius: $radius-md;
  font-size: 26rpx; color: $text-muted; border: 2rpx solid $border; background: $surface;
}
.g-btn.sel { color: $accent; border-color: $accent; background: #FFF3E0; font-weight: 700; }
</style>
