<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAppStore } from '@/store/index'

const store = useAppStore()
const loading = ref(true)
const hasLoaded = ref(false)

// ---- 分类 ----
const categories = [
  { key: '吃饭', icon: '🍜' },
  { key: '交通', icon: '🚗' },
  { key: '娱乐', icon: '🎮' },
  { key: '其他', icon: '📦' }
]
const selectedCategory = ref('吃饭')
const selectedPayer = ref(uni.getStorageSync('expense_payer') || 'me')

function selectCategory(key: string) { selectedCategory.value = key }
function selectPayer(who: string) {
  selectedPayer.value = who
  uni.setStorageSync('expense_payer', who)
}

// ---- 表单 ----
const amount = ref('')
const note = ref('')
const saving = ref(false)

// ---- 数据 ----
const entries = ref<any[]>([])
const stats = ref({ total: 0, myTotal: 0, partnerTotal: 0 })

const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)

function formatAmount(val: number): string {
  return val.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function getCategoryIcon(key: string): string {
  return categories.find(c => c.key === key)?.icon || '📦'
}

function formatTime(val: any): string {
  const d = val?.$date ? new Date(val.$date) : new Date(val)
  if (isNaN(d.getTime())) return ''
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (isToday) return `今天 ${time}`
  return `${d.getMonth() + 1}/${d.getDate()} ${time}`
}

function getPaidByLabel(entry: any): string {
  return entry.paidBy === store.openid ? '我付' : 'TA付'
}

// ---- 加载 ----
async function loadExpenses() {
  if (!store.coupleId) return
  if (!hasLoaded.value) loading.value = true
  try {
    const res = await wx.cloud.callFunction({
      name: 'getExpenses',
      data: { coupleId: store.coupleId, year: year.value, month: month.value }
    })
    if (res.result.success) {
      entries.value = res.result.entries || []
      stats.value = res.result.stats || { total: 0, myTotal: 0, partnerTotal: 0 }
    }
    hasLoaded.value = true
  } catch {} finally {
    loading.value = false
  }
}

// ---- 保存 ----
async function saveExpense() {
  const num = parseFloat(amount.value)
  if (!num || num <= 0 || saving.value) return
  saving.value = true

  const paidBy = selectedPayer.value === 'me' ? store.openid : (store.partner?.openid || '')
  const today = new Date().toISOString().slice(0, 10)

  const tempId = 'temp_' + Date.now()
  const tempEntry = {
    _id: tempId,
    coupleId: store.coupleId,
    amount: num,
    category: selectedCategory.value,
    paidBy,
    note: note.value.trim(),
    date: today,
    createdAt: { $date: new Date().toISOString() }
  }
  entries.value.unshift(tempEntry)
  stats.value.total += num
  if (selectedPayer.value === 'me') stats.value.myTotal += num
  else stats.value.partnerTotal += num

  amount.value = ''
  note.value = ''

  try {
    const res = await wx.cloud.callFunction({
      name: 'addExpense',
      data: {
        coupleId: store.coupleId,
        amount: num,
        category: selectedCategory.value,
        paidBy,
        note: note.value.trim(),
        date: today
      }
    })
    if (res.result.success) {
      const ti = entries.value.findIndex(e => e._id === tempId)
      if (ti !== -1) entries.value[ti]._id = res.result.entryId
    }
  } catch {
    entries.value = entries.value.filter(e => e._id !== tempId)
    loadExpenses()
  } finally {
    saving.value = false
  }
}

// ---- 左滑删除 ----
const swipeStates = ref<Record<string, number>>({})
const swipeStartX = ref(0)
const swipingId = ref('')
const delWidth = 140

function onTouchStart(e: any, id: string) {
  // 关闭其他已滑开的
  for (const k in swipeStates.value) {
    if (swipeStates.value[k] < 0) swipeStates.value[k] = 0
  }
  swipeStartX.value = e.touches[0].clientX
  swipingId.value = id
}

function onTouchMove(e: any) {
  if (!swipingId.value) return
  const dx = e.touches[0].clientX - swipeStartX.value
  const cur = swipeStates.value[swipingId.value] || 0
  if (dx < 0) {
    swipeStates.value[swipingId.value] = Math.max(dx, -delWidth)
  } else {
    swipeStates.value[swipingId.value] = Math.min(0, cur + dx * 0.3)
  }
}

function onTouchEnd() {
  const id = swipingId.value
  if (!id) return
  const cur = swipeStates.value[id] || 0
  swipeStates.value[id] = cur < -delWidth / 2 ? -delWidth : 0
  swipingId.value = ''
}

function getSwipeStyle(id: string): string {
  const dx = swipeStates.value[id] || 0
  if (!dx) return ''
  return `transform:translateX(${dx}rpx)`
}

async function deleteEntry(entry: any) {
  const ok = await uni.showModal({ title: '确认删除', content: '删除这条记录？' })
  if (!ok.confirm) return

  swipeStates.value[entry._id] = 0
  entries.value = entries.value.filter(e => e._id !== entry._id)
  stats.value.total -= entry.amount
  if (entry.paidBy === store.openid) stats.value.myTotal -= entry.amount
  else stats.value.partnerTotal -= entry.amount

  wx.cloud.callFunction({ name: 'deleteExpense', data: { entryId: entry._id } })
    .catch(() => loadExpenses())
}

async function deleteAllEntries() {
  const ok = await uni.showModal({ title: '确认清空', content: '删除本月所有记录？不可恢复' })
  if (!ok.confirm) return

  const toDelete = entries.value.filter(e => !e._id.startsWith('temp_'))
  entries.value = []
  stats.value = { total: 0, myTotal: 0, partnerTotal: 0 }

  for (const e of toDelete) {
    wx.cloud.callFunction({ name: 'deleteExpense', data: { entryId: e._id } })
      .catch(() => {})
  }
}

onShow(() => loadExpenses())
</script>

<template>
  <page-layout>
    <!-- 顶部统计 -->
    <view class="stats-card">
      <text class="stats-label">本月支出</text>
      <text class="stats-total">¥ {{ formatAmount(stats.total) }}</text>
    </view>

    <!-- 分类选择 -->
    <view class="form-section">
      <text class="form-label">选择分类</text>
      <view class="category-row">
        <view
          v-for="c in categories" :key="c.key"
          class="cat-chip"
          :class="{ on: selectedCategory === c.key }"
          @tap="selectCategory(c.key)"
        >
          <text>{{ c.icon }} {{ c.key }}</text>
        </view>
      </view>
    </view>

    <!-- 谁付的 -->
    <view class="form-section">
      <text class="form-label">谁付的</text>
      <view class="payer-row">
        <view class="payer-btn" :class="{ on: selectedPayer === 'me' }" @tap="selectPayer('me')">
          <text>🧑 我</text>
        </view>
        <view class="payer-btn" :class="{ on: selectedPayer === 'partner' }" @tap="selectPayer('partner')">
          <text>👩 TA</text>
        </view>
      </view>
    </view>

    <!-- 金额 -->
    <view class="form-section">
      <view class="amount-input-wrap">
        <text class="amount-prefix">¥</text>
        <input
          class="amount-input"
          type="digit"
          v-model="amount"
          placeholder="0.00"
          :maxlength="10"
        />
      </view>
    </view>

    <!-- 备注 -->
    <view class="form-section">
      <input
        class="note-input"
        v-model="note"
        placeholder="添加备注..."
        :maxlength="100"
      />
    </view>

    <!-- 保存按钮 -->
    <view
      class="save-btn"
      :class="{ off: !parseFloat(amount) || saving }"
      @tap="saveExpense"
    >
      <text>{{ saving ? '保存中...' : '保存' }}</text>
    </view>

    <loading-spinner v-if="loading" text="加载中..." />

    <!-- 记录列表 -->
    <view v-else class="record-list">
      <view class="list-title-row">
        <text class="list-title">最近记录</text>
        <text v-if="entries.length > 0" class="clear-all-btn" @tap="deleteAllEntries">清空</text>
      </view>
      <view v-if="entries.length === 0" class="empty-hint">
        <text>还没有记录，记一笔吧</text>
      </view>
      <view v-for="entry in entries" :key="entry._id" class="record-wrap">
        <view
          class="record-card"
          :style="getSwipeStyle(entry._id)"
          @touchstart="onTouchStart($event, entry._id)"
          @touchmove="onTouchMove($event)"
          @touchend="onTouchEnd()"
        >
          <view class="record-left">
            <text class="record-icon">{{ getCategoryIcon(entry.category) }}</text>
            <view class="record-info">
              <text class="record-note">{{ entry.note || entry.category }}</text>
              <text class="record-meta">{{ formatTime(entry.createdAt) }} · {{ getPaidByLabel(entry) }}</text>
            </view>
          </view>
          <text class="record-amount">-¥{{ entry.amount }}</text>
        </view>
        <view class="record-del" :class="{ show: (swipeStates[entry._id] || 0) < 0 }" @tap="deleteEntry(entry)">
          <text class="del-text">删除</text>
        </view>
      </view>
    </view>
  </page-layout>
</template>

<style lang="scss" scoped>
/* ---- 顶部统计 ---- */
.stats-card {
  background: linear-gradient(135deg, #FF9800, #FF5722);
  border-radius: 20rpx; padding: 28rpx 24rpx; margin-bottom: 20rpx;
  text-align: center;
  box-shadow: 0 8rpx 28rpx rgba(255,87,34,0.2);
}
.stats-label { font-size: 24rpx; color: rgba(255,255,255,0.7); }
.stats-total { font-size: 56rpx; font-weight: 800; color: #fff; display: block; margin: 8rpx 0 16rpx; }
.stats-row { display: flex; justify-content: center; gap: 40rpx; }
.stats-item { font-size: 24rpx; color: rgba(255,255,255,0.8); }
.stats-item b { color: #fff; }

/* ---- 表单区域 ---- */
.form-section { margin-bottom: 16rpx; }
.form-label { font-size: 24rpx; color: #999; display: block; margin-bottom: 12rpx; }

.category-row { display: flex; flex-wrap: wrap; gap: 12rpx; }
.cat-chip {
  padding: 12rpx 20rpx; border-radius: 32rpx;
  background: #F5F5F5; font-size: 24rpx; color: #888;
  border: 2rpx solid transparent;
}
.cat-chip.on {
  background: #FFF3E0; color: #FF9800; border-color: #FF9800; font-weight: 600;
}
.cat-chip:active { transform: scale(0.95); }

.payer-row { display: flex; gap: 16rpx; }
.payer-btn {
  flex: 1; text-align: center; padding: 16rpx; border-radius: 16rpx;
  background: #F5F5F5; font-size: 26rpx; color: #888;
  border: 2rpx solid transparent;
}
.payer-btn.on {
  background: #FFF3E0; color: #FF9800; border-color: #FF9800; font-weight: 600;
}
.payer-btn:active { transform: scale(0.95); }

/* ---- 金额输入 ---- */
.amount-input-wrap {
  display: flex; align-items: center;
  background: #FAFAFA; border: 2rpx solid #F0F0F0; border-radius: 16rpx;
  padding: 20rpx 24rpx;
}
.amount-prefix { font-size: 36rpx; color: #999; margin-right: 12rpx; }
.amount-input {
  flex: 1; font-size: 48rpx; font-weight: 700; color: #333;
}

/* ---- 备注 ---- */
.note-input {
  background: #FAFAFA; border: 2rpx solid #F0F0F0; border-radius: 16rpx;
  padding: 20rpx 24rpx; font-size: 26rpx; color: #333;
}

/* ---- 保存按钮 ---- */
.save-btn {
  background: linear-gradient(135deg, #FF9800, #FFB74D);
  border-radius: 16rpx; padding: 24rpx; text-align: center;
  font-size: 30rpx; font-weight: 700; color: #fff; margin: 20rpx 0;
  box-shadow: 0 6rpx 20rpx rgba(255,152,0,0.3);
}
.save-btn:active { transform: scale(0.97); }
.save-btn.off { opacity: 0.5; pointer-events: none; }

/* ---- 记录列表 ---- */
.record-list { margin-top: 8rpx; }
.list-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.list-title { font-size: 26rpx; font-weight: 700; color: #666; }
.clear-all-btn { font-size: 24rpx; color: #F44336; font-weight: 600; }
.clear-all-btn:active { opacity: 0.6; }
.empty-hint { text-align: center; padding: 48rpx 0; font-size: 26rpx; color: #ccc; }

.record-wrap { position: relative; overflow: hidden; border-radius: 16rpx; margin-bottom: 12rpx; }
.record-card {
  display: flex; align-items: center; justify-content: space-between;
  background: rgba(255,255,255,0.85); backdrop-filter: blur(16rpx);
  padding: 20rpx 24rpx; position: relative; z-index: 1;
  transition: transform 0.2s ease;
  border: 1rpx solid rgba(255,255,255,0.5);
}
.record-left { display: flex; align-items: center; gap: 16rpx; }
.record-icon { font-size: 36rpx; }
.record-info { display: flex; flex-direction: column; }
.record-note { font-size: 28rpx; font-weight: 600; color: #333; }
.record-meta { font-size: 22rpx; color: #bbb; margin-top: 4rpx; }
.record-amount { font-size: 30rpx; font-weight: 700; color: #FF5722; flex-shrink: 0; }

.record-del {
  position: absolute; right: 0; top: 0; bottom: 0;
  width: 140rpx; background: #F44336;
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.2s;
}
.record-del.show { opacity: 1; }
.del-text { color: #fff; font-size: 26rpx; font-weight: 700; }
</style>
