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
        <button class="go-btn" @click="() => uni.switchTab({ url: '/pages/home/index' })">进入家 →</button>
      </view>
      <template v-else>
        <view class="btn create-btn" @click="mode = 'create'">
          <text class="btn-icon">🏡</text>
          <text class="btn-title">创建我们的家</text>
          <text class="btn-desc">邀请你的 TA 加入</text>
        </view>
        <view class="btn join-btn" @click="mode = 'join'">
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
          <button class="back-btn" @click="mode = 'choose'">返回</button>
          <button class="submit-btn" @click="doCreate" :loading="loading">创建</button>
        </view>
      </view>
    </template>

    <!-- 加入家表单 -->
    <template v-if="mode === 'join'">
      <view class="form-card">
        <text class="form-label">输入 TA 给你的邀请码</text>
        <input class="form-input code-input" v-model="inviteCode" type="number" placeholder="6位数字" maxlength="6" />
        <view class="form-btns">
          <button class="back-btn" @click="mode = 'choose'">返回</button>
          <button class="submit-btn" @click="doJoin" :loading="loading">加入</button>
        </view>
      </view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.setup-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #FFF8E1 0%, #FFFAEE 30%, #ffffff 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 48rpx 60rpx;
}
.logo-area { display: flex; flex-direction: column; align-items: center; margin-bottom: 64rpx; }
.logo-icon { font-size: 100rpx; }
.logo-title { font-size: 44rpx; font-weight: 800; color: #333; margin-top: 16rpx; }
.logo-sub { font-size: 26rpx; color: #bbb; margin-top: 8rpx; }

.btn {
  width: 100%; max-width: 560rpx; padding: 32rpx 36rpx;
  border-radius: 24rpx; margin-bottom: 24rpx;
  box-shadow: 0 8rpx 28rpx rgba(0,0,0,0.06);
  display: flex; flex-direction: column;
}
.create-btn { background: linear-gradient(135deg, #FFB800, #FFD54F); }
.join-btn { background: #fff; border: 2rpx solid #FFB800; }
.btn-icon { font-size: 48rpx; }
.btn-title { font-size: 32rpx; font-weight: 700; margin-top: 8rpx; }
.create-btn .btn-title { color: #fff; }
.join-btn .btn-title { color: #FFB800; }
.btn-desc { font-size: 24rpx; color: rgba(255,255,255,0.8); margin-top: 4rpx; }
.join-btn .btn-desc { color: #bbb; }

.code-card {
  background: #fff; border-radius: 24rpx; padding: 48rpx 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.06);
  display: flex; flex-direction: column; align-items: center;
  max-width: 560rpx; width: 100%;
}
.code-label { font-size: 28rpx; color: #999; }
.code-value {
  font-size: 72rpx; font-weight: 900; color: #FFB800; letter-spacing: 16rpx;
  margin: 16rpx 0; padding: 16rpx 40rpx; background: #FFF8E1; border-radius: 16rpx;
  border: 2rpx dashed #FFB800;
}
.code-hint { font-size: 24rpx; color: #bbb; text-align: center; line-height: 1.6; margin-bottom: 32rpx; }
.go-btn {
  width: 100%; padding: 20rpx 0; text-align: center;
  background: linear-gradient(135deg, #FFB800, #FFD54F);
  border-radius: 44rpx; font-size: 30rpx; font-weight: 700; color: #fff;
  box-shadow: 0 6rpx 20rpx rgba(255,184,0,0.3);
}

.form-card {
  background: #fff; border-radius: 24rpx; padding: 40rpx 36rpx;
  box-shadow: 0 8rpx 28rpx rgba(0,0,0,0.05); max-width: 560rpx; width: 100%;
}
.form-label { font-size: 30rpx; font-weight: 600; color: #333; margin-bottom: 20rpx; display: block; }
.form-input {
  width: 100%; height: 88rpx; border: 2rpx solid #EEE; border-radius: 16rpx;
  padding: 0 20rpx; font-size: 30rpx; box-sizing: border-box; text-align: center;
}
.form-input:focus { border-color: #FFB800; }
.code-input { font-size: 44rpx; letter-spacing: 20rpx; }
.form-btns { display: flex; gap: 20rpx; margin-top: 32rpx; }
.back-btn {
  flex: 1; padding: 20rpx 0; text-align: center; background: #F5F5F5;
  border-radius: 44rpx; font-size: 28rpx; color: #666;
}
.submit-btn {
  flex: 2; padding: 20rpx 0; text-align: center;
  background: linear-gradient(135deg, #FFB800, #FFD54F);
  border-radius: 44rpx; font-size: 28rpx; font-weight: 700; color: #fff;
}
</style>
