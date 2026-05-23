<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAppStore } from '@/store/index'
import { VARIETY_MAP, PLANT_STAGES } from '@/utils/constants'
import { daysBetween } from '@/utils/date'

const store = useAppStore()

const coupleName = ref('我们的小空间')
const togetherSince = '2025-01-01'
const togetherDays = computed(() => daysBetween(new Date(), togetherSince))

const editingName = ref(false)
const newName = ref('')
const plantVariety = ref('rose')
const inviteCode = ref('')

const myAvatar = ref('')
const myAvatarFailed = ref(false)
const partnerAvatar = ref('')
const partnerAvatarFailed = ref(false)
const partnerName = ref('TA')

// 将头像 URL 转为可显示的链接：cloud:// → 临时 https；已是 https:// → 直接用；其余 → 空串回退 emoji
async function resolveAvatarUrl(url: string): Promise<string> {
  if (!url) return ''
  if (url.startsWith('cloud://')) {
    try {
      const tmp = await wx.cloud.getTempFileURL({ fileList: [url] })
      return tmp.fileList?.[0]?.tempFileURL || ''
    } catch { return '' }
  }
  if (url.startsWith('https://')) return url
  return ''
}

async function loadAvatars() {
  const raw = store.user?.avatar || uni.getStorageSync('my_avatar') || ''
  myAvatar.value = await resolveAvatarUrl(raw)
  myAvatarFailed.value = false

  if (!store.coupleId) return
  try {
    const res = await wx.cloud.callFunction({ name: 'getPartner', data: { coupleId: store.coupleId } })
    if (res.result.success) {
      const rawPartner = res.result.partner.avatar || ''
      partnerAvatar.value = await resolveAvatarUrl(rawPartner)
      partnerAvatarFailed.value = false
      partnerName.value = res.result.partner.nickname || 'TA'
      store.setPartner(res.result.partner)
    }
  } catch { /* 伴侣还没加入 */ }
}

// 点击自己的头像 → 微信原生选择头像 → 上传到云存储
async function onChooseAvatar(e: any) {
  const tempUrl = e.detail?.avatarUrl || ''
  if (!tempUrl) return

  uni.showLoading({ title: '上传头像...' })
  try {
    // 上传到云存储，获得永久 cloud:// 链接
    const uid = store.openid || String(Date.now())
    const cloudPath = `avatars/${uid}.jpg`
    const upRes = await wx.cloud.uploadFile({ cloudPath, filePath: tempUrl })
    const cloudFileId = upRes.fileID // cloud://xxx 格式，永久有效

    myAvatar.value = cloudFileId
    if (store.user) store.user.avatar = cloudFileId
    uni.setStorageSync('my_avatar', cloudFileId)
    // 同步到数据库
    await wx.cloud.callFunction({ name: 'login', data: { avatar: cloudFileId } })
    uni.hideLoading()
    uni.showToast({ title: '头像已同步', icon: 'success' })
  } catch (err: any) {
    uni.hideLoading()
    uni.showToast({ title: '上传失败，请重试', icon: 'none' })
  }
}

async function loadInviteCode() {
  // 1. 内存 store
  if (store.inviteCode) {
    inviteCode.value = store.inviteCode
    return
  }
  // 2. 本地存储
  store.loadInviteCodeFromStorage()
  if (store.inviteCode) {
    inviteCode.value = store.inviteCode
    return
  }
  // 3. 云函数
  if (!store.coupleId) return
  try {
    const res = await wx.cloud.callFunction({ name: 'getCoupleInfo', data: { coupleId: store.coupleId } })
    if (res.result.success && res.result.inviteCode) {
      inviteCode.value = res.result.inviteCode
      store.setInviteCode(res.result.inviteCode)
    } else {
      inviteCode.value = '暂无'
    }
  } catch {
    inviteCode.value = '获取失败'
  }
}

function onShowSettings() {
  showSettings.value = true
  loadInviteCode()
}

onShow(() => {
  loadAvatars()
})

// Mock 券数据
const coupons = ref([
  { _id:'1', type:'service', name:'免费按摩5分钟', status:'unused', createdAt:new Date().toISOString() },
  { _id:'2', type:'physical', name:'一杯奶茶', status:'used', createdAt:new Date(Date.now()-86400000).toISOString(), usedAt:new Date().toISOString() },
  { _id:'3', type:'privilege', name:'免生气券', status:'unused', createdAt:new Date(Date.now()-172800000).toISOString() },
])

const showCoupons = ref(false)
const showSettings = ref(false)
const couponTab = ref('unused')
const filteredCoupons = computed(() => coupons.value.filter(c => c.status === couponTab.value))
const unusedCount = computed(() => coupons.value.filter(c => c.status === 'unused').length)

function startEditName() { newName.value = coupleName.value; editingName.value = true }
function saveName() { coupleName.value = newName.value; editingName.value = false; uni.showToast({ title: '已修改', icon: 'success' }) }
function useCoupon(c: any) { c.status = 'used'; c.usedAt = new Date().toISOString(); uni.showToast({ title: '已使用', icon: 'success' }) }

const stats = [
  { icon:'✅', value:'126', unit:'次', label:'累计任务' },
  { icon:'🏆', value:'8', unit:'个', label:'解锁成就' },
  { icon:PLANT_STAGES[2].icon, value:PLANT_STAGES[2].label, unit:'', label:'植物状态' },
  { icon:'🎰', value:'23', unit:'次', label:'扭蛋次数' },
  { icon:'🛒', value:'15', unit:'次', label:'小卖部' },
  { icon:'⭐', value:'2', unit:'个', label:'梦想完成' },
]
</script>

<template>
  <page-layout>
    <!-- 伴侣头像区 -->
    <view class="couple-header">
      <view class="avatars-row">
        <view class="avatar-block">
          <button open-type="chooseAvatar" @chooseavatar="onChooseAvatar" class="avatar-btn">
            <image v-if="myAvatar && !myAvatarFailed" :src="myAvatar" class="avatar-img" mode="aspectFill" @error="myAvatarFailed = true" />
            <text v-else class="a-emoji">🧑</text>
          </button>
          <text class="a-name">你</text>
        </view>
        <view class="heart-wrap"><text class="heart-beat">❤️</text></view>
        <view class="avatar-block">
          <view class="avatar-circle">
            <image v-if="partnerAvatar && !partnerAvatarFailed" :src="partnerAvatar" class="avatar-img" mode="aspectFill" @error="partnerAvatarFailed = true" />
            <text v-else class="a-emoji">👩</text>
          </view>
          <text class="a-name">{{ partnerName }}</text>
        </view>
      </view>
      <text class="couple-name">{{ coupleName }}</text>
      <text class="days">在一起 {{ togetherDays }} 天</text>
      <view class="plant-badge">
        <text class="pb-icon">{{ PLANT_STAGES[2].icon }}</text>
        <text class="pb-text">{{ VARIETY_MAP[plantVariety] }} · {{ PLANT_STAGES[2].label }}</text>
      </view>
    </view>

    <!-- 互动币 -->
    <coin-display :coupleId="store.coupleId" />

    <!-- 数据面板 -->
    <view class="data-grid">
      <view class="section-header"><text class="s-title">📊 关系数据</text></view>
      <view class="grid">
        <view class="g-item" v-for="s in stats" :key="s.label">
          <text class="g-icon">{{ s.icon }}</text>
          <text class="g-value">{{ s.value }}</text>
          <text class="g-unit" v-if="s.unit">{{ s.unit }}</text>
          <text class="g-label">{{ s.label }}</text>
        </view>
      </view>
    </view>

    <!-- 我的券包 -->
    <view class="menu-card" @tap="showCoupons = true">
      <view class="m-left"><text class="m-icon">🎫</text><text class="m-title">我的券包</text></view>
      <view class="m-right">
        <view class="m-badge" v-if="unusedCount > 0">{{ unusedCount }}张可用</view>
        <text class="m-arrow">›</text>
      </view>
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
          <text class="panel-title">🎫 我的券包</text>
          <view class="close-btn" @tap="showCoupons = false"><text>✕</text></view>
        </view>
        <view class="coupon-tabs">
          <view v-for="t in ['unused','used','expired']" :key="t" class="ctab" :class="{ active:couponTab===t }" @tap="couponTab=t">
            {{ t==='unused'?'未使用':t==='used'?'已使用':'已过期' }}
          </view>
        </view>
        <scroll-view class="coupon-list" scroll-y>
          <view v-for="c in filteredCoupons" :key="c._id" class="c-card" :class="c.status">
            <view class="c-left"><text class="c-icon">{{ c.type==='service'?'🛎️':c.type==='physical'?'🎁':'👑' }}</text></view>
            <view class="c-info">
              <text class="c-name">{{ c.name }}</text>
              <text class="c-date">{{ c.usedAt ? '已使用' : '有效期至永久' }}</text>
            </view>
            <view v-if="c.status==='unused'" class="use-btn" @tap="useCoupon(c)"><text>使用</text></view>
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
            <text class="set-label">情侣名</text>
            <text class="set-val" v-if="!editingName" @tap="startEditName">{{ coupleName }} ✏️</text>
            <input v-else class="set-input" v-model="newName" @blur="saveName" maxlength="20" />
          </view>
          <view class="set-row">
            <text class="set-label">邀请码</text>
            <text class="invite-code" v-if="inviteCode && inviteCode !== '暂无' && inviteCode !== '获取失败'" @tap="() => { uni.setClipboardData({ data: inviteCode }); uni.showToast({ title: '已复制', icon: 'success' }) }">{{ inviteCode }} 📋</text>
            <text class="invite-code dim" v-else>{{ inviteCode || '加载中...' }}</text>
          </view>
          <view class="set-row">
            <text class="set-label">植物品种</text>
            <view class="variety-grid">
              <view v-for="(label, key) in VARIETY_MAP" :key="key" class="v-item" :class="{ sel:plantVariety===key }" @tap="plantVariety=key as string; uni.showToast({title:'已切换',icon:'success'})">
                <text>{{ label }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </page-layout>
</template>

<style lang="scss" scoped>
.couple-header {
  background: linear-gradient(135deg, #FFB800, #FFCC00 50%, #FFD54F);
  border-radius: 28rpx; padding: 40rpx 30rpx 30rpx; margin-bottom: 24rpx;
  display: flex; flex-direction: column; align-items: center;
  box-shadow: 0 12rpx 36rpx rgba(255,184,0,0.25);
}
.avatars-row { display:flex; align-items:center; margin-bottom:18rpx; }
.avatar-block { display:flex; flex-direction:column; align-items:center; }
.avatar-circle { width:104rpx; height:104rpx; border-radius:50%; background:rgba(255,255,255,0.3); backdrop-filter:blur(6rpx); display:flex; align-items:center; justify-content:center; border:3rpx solid rgba(255,255,255,0.5); overflow:hidden; }
.avatar-btn { width:104rpx; height:104rpx; border-radius:50%; padding:0; margin:0; background:rgba(255,255,255,0.3); border:3rpx solid rgba(255,255,255,0.5); overflow:hidden; display:flex; align-items:center; justify-content:center; line-height:1; }
.avatar-btn::after { border:none; }
.avatar-img { width:104rpx; height:104rpx; border-radius:50%; display:block; }
.a-emoji { font-size:48rpx; color:#333; }
.a-name { margin-top:8rpx; font-size:24rpx; color:#fff; font-weight:600; }
.heart-wrap { margin:0 40rpx; padding-bottom:30rpx; }
.heart-beat { font-size:44rpx; animation:heartbeat 1.2s ease-in-out infinite; display:block; }
@keyframes heartbeat { 0%,100%{transform:scale(1)} 25%{transform:scale(1.2)} 50%{transform:scale(1)} 75%{transform:scale(1.15)} }
.couple-name { font-size:36rpx; font-weight:700; color:#fff; margin-bottom:8rpx; letter-spacing:2rpx; }
.days { font-size:26rpx; color:rgba(255,255,255,0.8); margin-bottom:16rpx; }
.plant-badge { display:flex; align-items:center; background:rgba(255,255,255,0.22); backdrop-filter:blur(6rpx); border-radius:32rpx; padding:8rpx 24rpx; }
.pb-icon { font-size:22rpx; margin-right:6rpx; }
.pb-text { font-size:22rpx; color:#fff; font-weight:500; }

.data-grid { background:rgba(255,255,255,0.85); backdrop-filter:blur(16rpx); border-radius:20rpx; padding:20rpx 10rpx 10rpx; margin-bottom:16rpx; box-shadow:0 4rpx 20rpx rgba(255,184,0,0.06); border:1rpx solid rgba(255,255,255,0.5); }
.section-header { padding:0 20rpx 16rpx; border-bottom:1rpx solid rgba(255,184,0,0.06); margin-bottom:8rpx; }
.s-title { font-size:28rpx; font-weight:700; color:#333; }
.grid { display:flex; flex-wrap:wrap; }
.g-item { width:33.33%; display:flex; flex-direction:column; align-items:center; padding:18rpx 8rpx; box-sizing:border-box; }
.g-icon { font-size:32rpx; margin-bottom:6rpx; }
.g-value { font-size:34rpx; font-weight:800; color:#FFB800; }
.g-unit { font-size:20rpx; color:#999; }
.g-label { font-size:20rpx; color:#999; margin-top:2rpx; }

.menu-card { background:rgba(255,255,255,0.85); backdrop-filter:blur(16rpx); border-radius:20rpx; padding:26rpx 28rpx; margin-bottom:14rpx; display:flex; align-items:center; justify-content:space-between; box-shadow:0 4rpx 16rpx rgba(255,184,0,0.04); border:1rpx solid rgba(255,255,255,0.5); transition:transform 0.15s; }
.menu-card:active { transform:scale(0.98); }
.m-left { display:flex; align-items:center; }
.m-icon { font-size:32rpx; margin-right:14rpx; }
.m-title { font-size:28rpx; font-weight:600; color:#333; }
.m-right { display:flex; align-items:center; }
.m-badge { font-size:22rpx; color:#FFB800; background:rgba(255,184,0,0.08); border-radius:16rpx; padding:4rpx 14rpx; margin-right:8rpx; }
.m-arrow { font-size:36rpx; color:#ddd; }

.overlay { position:fixed; inset:0; background:rgba(0,0,0,0.4); backdrop-filter:blur(4rpx); z-index:1000; display:flex; align-items:flex-end; }
.panel { width:100%; max-height:85vh; background:#fff; border-radius:32rpx 32rpx 0 0; display:flex; flex-direction:column; overflow:hidden; animation:slideUp 0.3s ease-out; }
@keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
.panel-header { display:flex; align-items:center; justify-content:space-between; padding:28rpx 30rpx; border-bottom:1rpx solid #FFF8E1; }
.panel-title { font-size:32rpx; font-weight:700; color:#333; }
.close-btn { width:44rpx; height:44rpx; border-radius:50%; background:#FFF8E1; display:flex; align-items:center; justify-content:center; font-size:26rpx; color:#FFB800; }

.coupon-tabs { display:flex; border-bottom:1rpx solid #FFF8E1; }
.ctab { flex:1; text-align:center; padding:20rpx 0; font-size:26rpx; color:#999; }
.ctab.active { color:#FFB800; font-weight:700; position:relative; }
.ctab.active::after { content:''; position:absolute; bottom:0; left:50%; transform:translateX(-50%); width:40rpx; height:4rpx; background:#FFB800; border-radius:2rpx; }
.coupon-list { flex:1; padding:16rpx 24rpx; max-height:50vh; }
.c-card { display:flex; align-items:center; padding:22rpx 18rpx; margin-bottom:14rpx; border-radius:14rpx; border-left:6rpx solid #FFB800; background:#FFFDE7; }
.c-card.used { border-left-color:#ccc; background:#F7F7F7; }
.c-card.expired { border-left-color:#ddd; background:#F5F5F5; }
.c-left { margin-right:14rpx; }
.c-icon { font-size:36rpx; }
.c-info { flex:1; }
.c-name { font-size:26rpx; font-weight:600; color:#333; display:block; }
.c-date { font-size:22rpx; color:#bbb; margin-top:4rpx; }
.use-btn { padding:10rpx 24rpx; border-radius:20rpx; background:linear-gradient(135deg,#FFB800,#FFCC00); font-size:22rpx; font-weight:700; color:#fff; }

.settings-body { padding:24rpx 28rpx; }
.set-row { padding:20rpx 0; border-bottom:1rpx solid #F5F5F5; }
.set-label { font-size:28rpx; font-weight:600; color:#333; display:block; margin-bottom:14rpx; }
.set-val { font-size:26rpx; color:#FFB800; }
.invite-code { font-size:32rpx; font-weight:800; color:#FFB800; letter-spacing:4rpx; }
.invite-code.dim { color:#bbb; font-weight:400; letter-spacing:0; }
.set-input { font-size:26rpx; border:2rpx solid #FFD54F; border-radius:12rpx; padding:12rpx 16rpx; }
.variety-grid { display:flex; flex-wrap:wrap; gap:12rpx; }
.v-item { padding:12rpx 24rpx; border-radius:20rpx; font-size:24rpx; color:#999; background:#F5F5F5; }
.v-item.sel { background:#FFB800; color:#fff; font-weight:600; }
</style>
