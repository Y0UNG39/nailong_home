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
  // 先登录
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

// 创建家
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
      mode.value = 'choose' // 切回来显示结果
    } else {
      uni.showToast({ title: res.result.error, icon: 'none' })
    }
  } catch (e: any) {
    uni.showToast({ title: '创建失败', icon: 'none' })
  }
  loading.value = false
}

// 加入家
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
    <!-- Logo -->
    <view class="logo-area">
      <text class="logo-icon">🏠</text>
      <text class="logo-title">奶龙的家</text>
      <text class="logo-sub">属于两个人的小世界</text>
    </view>

    <!-- 选择模式 -->
    <template v-if="mode === 'choose'">
      <!-- 已创建显示邀请码 -->
      <view v-if="createdCode" class="code-card">
        <text class="code-label">邀请码</text>
        <text class="code-value">{{ createdCode }}</text>
        <text class="code-hint">把这个邀请码发给 TA，TA 输入后就能加入你的家啦</text>
        <button class="go-btn" @tap="() => uni.switchTab({ url: '/pages/home/index' })">进入家 →</button>
      </view>
      <template v-else>
        <view class="btn create-btn" @tap="mode = 'create'">
          <text class="btn-icon">🏡</text>
          <text class="btn-title">创建我们的家</text>
          <text class="btn-desc">邀请你的 TA 加入</text>
        </view>
        <view class="btn join-btn" @tap="mode = 'join'">
          <text class="btn-icon">🔑</text>
          <text class="btn-title">加入 TA 的家</text>
          <text class="btn-desc">输入邀请码加入</text>
        </view>
      </template>
    </template>

    <!-- 创建家表单 -->
    <template v-if="mode === 'create' && !createdCode">
      <view class="form-card">
        <text class="form-label">给你们家起个名字</text>
        <input class="form-input" v-model="coupleName" placeholder="例如：我们的小窝" maxlength="20" />
        <view class="form-btns">
          <button class="back-btn" @tap="mode = 'choose'">返回</button>
          <button class="submit-btn" @tap="doCreate" :loading="loading">创建</button>
        </view>
      </view>
    </template>

    <!-- 加入家表单 -->
    <template v-if="mode === 'join'">
      <view class="form-card">
        <text class="form-label">输入 TA 给你的邀请码</text>
        <input class="form-input code-input" v-model="inviteCode" type="number" placeholder="6位数字" maxlength="6" />
        <view class="form-btns">
          <button class="back-btn" @tap="mode = 'choose'">返回</button>
          <button class="submit-btn" @tap="doJoin" :loading="loading">加入</button>
        </view>
      </view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.setup-page {
  min-height: 100vh;
  background: $gradient-page;
  display: flex; flex-direction: column; align-items: center;
  padding: 120rpx 48rpx 60rpx;
}
.logo-area { display: flex; flex-direction: column; align-items: center; margin-bottom: 64rpx; }
.logo-icon { font-size: 100rpx; }
.logo-title { font-size: 44rpx; font-weight: 800; color: $text; margin-top: $space-md; }
.logo-sub { font-size: 26rpx; color: $text-faint; margin-top: $space-xs; }

.btn {
  width: 100%; max-width: 560rpx; padding: 32rpx 36rpx;
  border-radius: $radius-lg; margin-bottom: $space-lg;
  box-shadow: 0 8rpx 28rpx rgba(0,0,0,0.06);
  display: flex; flex-direction: column;
}
.create-btn { background: $gradient-primary; }
.join-btn { background: $white; border: 2rpx solid $primary; }
.btn-icon { font-size: 48rpx; }
.btn-title { font-size: 32rpx; font-weight: 700; margin-top: $space-xs; }
.create-btn .btn-title { color: $white; }
.join-btn .btn-title { color: $primary; }
.btn-desc { font-size: $text-sm; color: rgba(255,255,255,0.8); margin-top: 4rpx; }
.join-btn .btn-desc { color: $text-faint; }

.code-card {
  background: $white; border-radius: $radius-lg; padding: $space-xxl 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.06);
  display: flex; flex-direction: column; align-items: center;
  max-width: 560rpx; width: 100%;
}
.code-label { font-size: 28rpx; color: $text-muted; }
.code-value {
  font-size: $text-xxl; font-weight: 900; color: $primary; letter-spacing: $space-md;
  margin: $space-md 0; padding: $space-md 40rpx; background: $primary-bg; border-radius: $radius-md;
  border: 2rpx dashed $primary;
}
.code-hint { font-size: $text-sm; color: $text-faint; text-align: center; line-height: 1.6; margin-bottom: 32rpx; }
.go-btn {
  @include btn-primary;
  width: 100%; padding: $space-lg 0; text-align: center;
}

.form-card {
  background: $white; border-radius: $radius-lg; padding: 40rpx 36rpx;
  box-shadow: 0 8rpx 28rpx rgba(0,0,0,0.05); max-width: 560rpx; width: 100%;
}
.form-label { font-size: $text-base; font-weight: 600; color: $text; margin-bottom: $space-lg; display: block; }
.form-input {
  @include form-input;
  height: 88rpx; text-align: center;
}
.form-input:focus { border-color: $primary; }
.code-input { font-size: 44rpx; letter-spacing: $space-lg; }
.form-btns { display: flex; gap: $space-lg; margin-top: 32rpx; }
.back-btn {
  flex: 1; padding: $space-lg 0; text-align: center; background: $border-light;
  border-radius: 44rpx; font-size: 28rpx; color: $text-secondary;
}
.submit-btn {
  flex: 2; padding: $space-lg 0; text-align: center;
  @include btn-primary;
}
</style>
