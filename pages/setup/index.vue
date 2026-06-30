<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAppStore } from '@/store/index'

const store = useAppStore()
const mode = ref<'choose' | 'create' | 'join'>('choose')
const coupleName = ref('我们的家')
const inviteCode = ref('')
const createdCode = ref('')
const loading = ref(false)

onMounted(async () => {
  if (!store.openid) {
    try {
      const res = await wx.cloud.callFunction({ name: 'login', data: {} })
      if (res.result.success) {
        store.setLoginData({ openid: res.result.openid, isNew: res.result.isNew, user: res.result.user })
      }
    } catch (e) { /* 继续，后续云函数调用会自动获取 openid */ }
  }
  if (store.coupleId) {
    uni.switchTab({ url: '/pages/home/index' })
  }
})

async function doCreate() {
  if (!coupleName.value.trim()) {
    uni.showToast({ title: '给家起个名字吧', icon: 'none' })
    return
  }
  loading.value = true
  try {
    const res = await wx.cloud.callFunction({ name: 'createCouple', data: { name: coupleName.value } })
    if (res.result.success) {
      store.setCouple(res.result.coupleId)
      store.setInviteCode(res.result.inviteCode)
      store.user!.coupleId = res.result.coupleId
      createdCode.value = res.result.inviteCode
      mode.value = 'choose'
    } else {
      uni.showToast({ title: res.result.error, icon: 'none' })
    }
  } catch (e: any) {
    uni.showToast({ title: '创建失败', icon: 'none' })
  }
  loading.value = false
}

async function doJoin() {
  if (!inviteCode.value.trim()) {
    uni.showToast({ title: '请输入邀请码', icon: 'none' })
    return
  }
  loading.value = true
  try {
    const res = await wx.cloud.callFunction({ name: 'joinCouple', data: { inviteCode: inviteCode.value.trim() } })
    if (res.result.success) {
      store.setCouple(res.result.coupleId)
      store.user!.coupleId = res.result.coupleId
      uni.showToast({ title: '加入成功！', icon: 'success' })
      setTimeout(() => uni.switchTab({ url: '/pages/home/index' }), 1000)
    } else {
      uni.showToast({ title: res.result.error, icon: 'none' })
    }
  } catch (e: any) {
    uni.showToast({ title: '加入失败', icon: 'none' })
  }
  loading.value = false
}
</script>

<template>
  <view class="setup-page">
    <!-- 动态光晕背景 -->
    <view class="setup-glow" />

    <!-- Logo（带浮动动画） -->
    <view class="logo-area stagger-enter">
      <view class="logo-icon-wrap">
        <text class="logo-icon">🏠</text>
        <view class="logo-ring" />
      </view>
      <text class="logo-title">奶龙的家</text>
      <text class="logo-sub">属于两个人的小世界 ✨</text>
    </view>

    <!-- 选择模式 -->
    <template v-if="mode === 'choose'">
      <view v-if="createdCode" class="code-card stagger-enter">
        <view class="code-glow-bar" />
        <text class="code-label">🎉 邀请码已生成</text>
        <text class="code-value">{{ createdCode }}</text>
        <text class="code-hint">把这个邀请码发给 TA，TA 输入后就能加入你的家啦</text>
        <button class="go-btn" @tap="() => uni.switchTab({ url: '/pages/home/index' })">进入家 →</button>
      </view>
      <template v-else>
        <view class="btn create-btn stagger-enter" @tap="mode = 'create'">
          <text class="btn-icon">🏡</text>
          <text class="btn-title">创建我们的家</text>
          <text class="btn-desc">邀请你的 TA 加入</text>
        </view>
        <view class="btn join-btn stagger-enter" @tap="mode = 'join'">
          <text class="btn-icon">🔑</text>
          <text class="btn-title">加入 TA 的家</text>
          <text class="btn-desc">输入邀请码加入</text>
        </view>
      </template>
    </template>

    <!-- 创建家表单 -->
    <template v-if="mode === 'create' && !createdCode">
      <view class="form-card stagger-enter">
        <view class="form-glow-bar" />
        <text class="form-label">🏷️ 给你们家起个名字</text>
        <input class="form-input" v-model="coupleName" placeholder="例如：我们的小窝" maxlength="20" />
        <view class="form-btns">
          <button class="back-btn" @tap="mode = 'choose'">返回</button>
          <button class="submit-btn" @tap="doCreate" :loading="loading">创建</button>
        </view>
      </view>
    </template>

    <!-- 加入家表单 -->
    <template v-if="mode === 'join'">
      <view class="form-card stagger-enter">
        <view class="form-glow-bar" />
        <text class="form-label">🔐 输入 TA 给你的邀请码</text>
        <input class="form-input code-input" v-model="inviteCode" type="number" placeholder="6位数字" maxlength="6" />
        <view class="form-btns">
          <button class="back-btn" @tap="mode = 'choose'">返回</button>
          <button class="submit-btn" @tap="doJoin" :loading="loading">加入</button>
        </view>
      </view>
    </template>

    <!-- 装饰性底部粒子 -->
    <view class="setup-particles">
      <text class="sp sp1">✨</text>
      <text class="sp sp2">💛</text>
      <text class="sp sp3">✨</text>
      <text class="sp sp4">🌟</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.setup-page {
  min-height: 100vh;
  background: $gradient-page;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 48rpx 60rpx;
  position: relative;
  overflow: hidden;
}

/* 动态光晕背景 */
.setup-glow {
  position: fixed;
  top: -20%;
  left: -20%;
  right: -20%;
  height: 60%;
  background: $gradient-warm-glow;
  animation: auroraBreath 4s $ease-out-quart infinite;
  pointer-events: none;
}

@keyframes auroraBreath {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.08); }
}

/* Logo 区域 */
.logo-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 64rpx;
  position: relative;
  z-index: 1;
}
.logo-icon-wrap {
  position: relative;
  margin-bottom: $space-md;
}
.logo-icon {
  font-size: 110rpx;
  display: block;
  animation: float 3.5s $ease-out-quart infinite;
}
.logo-ring {
  position: absolute;
  inset: -10rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(255, 184, 0, 0.2);
  animation: spin 8s linear infinite;
}
.logo-title {
  font-size: 48rpx;
  font-weight: 900;
  @include text-gradient-gold;
  margin-top: $space-sm;
  letter-spacing: 4rpx;
}
.logo-sub {
  font-size: 26rpx;
  color: $text-faint;
  margin-top: $space-xs;
  letter-spacing: 2rpx;
}

/* 按钮卡片 */
.btn {
  width: 100%;
  max-width: 560rpx;
  padding: 34rpx 40rpx;
  border-radius: $radius-lg;
  margin-bottom: $space-lg;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  transition: transform 0.2s $ease-out-quart, box-shadow 0.2s $ease-out-quart;
  &:active { transform: scale(0.96); }
}
.create-btn {
  background: $gradient-sunset;
  box-shadow: 0 12rpx 40rpx rgba(255, 107, 53, 0.25), 0 0 30rpx rgba(255, 184, 0, 0.1);
}
.join-btn {
  background: $white;
  border: 2rpx solid rgba(255, 184, 0, 0.3);
  box-shadow: 0 8rpx 28rpx rgba(0, 0, 0, 0.06);
}
.btn-icon { font-size: 50rpx; }
.btn-title { font-size: 32rpx; font-weight: 700; margin-top: $space-xs; }
.create-btn .btn-title { color: $white; }
.join-btn .btn-title { color: $primary; }
.btn-desc { font-size: $text-sm; color: rgba(255, 255, 255, 0.8); margin-top: 4rpx; }
.join-btn .btn-desc { color: $text-faint; }

/* 邀请码卡片 */
.code-card {
  background: $white;
  border-radius: $radius-lg;
  padding: $space-xxl 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.06), 0 0 40rpx rgba(255, 184, 0, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 560rpx;
  width: 100%;
  position: relative;
  overflow: hidden;
}
.code-glow-bar {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 4rpx;
  background: $gradient-gold-text;
  animation: shimmerSlow 2s linear infinite;
  background-size: 200% 100%;
}
.code-label {
  font-size: 28rpx;
  color: $text-muted;
  margin-bottom: $space-sm;
}
.code-value {
  font-size: $text-xxl;
  font-weight: 900;
  @include text-glow($primary);
  letter-spacing: $space-md;
  margin: $space-md 0;
  padding: $space-md 40rpx;
  background: $primary-bg;
  border-radius: $radius-md;
  border: 2rpx dashed rgba(255, 184, 0, 0.4);
}
.code-hint {
  font-size: $text-sm;
  color: $text-faint;
  text-align: center;
  line-height: 1.6;
  margin-bottom: 32rpx;
}
.go-btn {
  @include btn-glow;
  width: 100%;
  padding: $space-lg 0;
  text-align: center;
}

/* 表单卡片 */
.form-card {
  background: $white;
  border-radius: $radius-lg;
  padding: 40rpx 36rpx;
  box-shadow: 0 8rpx 28rpx rgba(0, 0, 0, 0.05);
  max-width: 560rpx;
  width: 100%;
  position: relative;
  overflow: hidden;
}
.form-glow-bar {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 4rpx;
  background: $gradient-gold-text;
  animation: shimmerSlow 2s linear infinite;
  background-size: 200% 100%;
}
.form-label {
  font-size: $text-base;
  font-weight: 600;
  color: $text;
  margin-bottom: $space-lg;
  display: block;
}
.form-input {
  @include form-input;
  height: 88rpx;
  text-align: center;
}
.form-input:focus {
  border-color: $primary;
  box-shadow: 0 0 0 4rpx rgba(255, 184, 0, 0.1);
}
.code-input { font-size: 44rpx; letter-spacing: $space-lg; }
.form-btns { display: flex; gap: $space-lg; margin-top: 32rpx; }
.back-btn {
  flex: 1;
  padding: $space-lg 0;
  text-align: center;
  background: $border-light;
  border-radius: 44rpx;
  font-size: 28rpx;
  color: $text-secondary;
  transition: background 0.2s $ease-out-quart;
  &:active { background: $border; }
}
.submit-btn {
  flex: 2;
  padding: $space-lg 0;
  text-align: center;
  @include btn-glow;
}

/* 底部装饰粒子 */
.setup-particles {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60%;
  pointer-events: none;
  overflow: hidden;
}
.sp {
  position: absolute;
  font-size: 20rpx;
  animation: particleRise 6s $ease-out-quart infinite;
  opacity: 0;
}
.sp1 { left: 15%; animation-delay: 0s; }
.sp2 { left: 40%; animation-delay: 1.2s; }
.sp3 { left: 65%; animation-delay: 0.5s; }
.sp4 { left: 85%; animation-delay: 2s; }
</style>
