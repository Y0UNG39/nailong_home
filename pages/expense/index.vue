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
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
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

  const noteText = note.value.trim()
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
        note: noteText,
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
@import '@/uni.scss';

/* ---- 顶部统计 ---- */
.stats-card {
  background: linear-gradient(135deg, $accent, #FF5722);
  border-radius: $radius-lg; padding: 28rpx 24rpx; margin-bottom: $space-lg;
  text-align: center;
  box-shadow: 0 8rpx 28rpx rgba(255,87,34,0.2);
}
.stats-label { font-size: $text-sm; color: rgba(255,255,255,0.7); }
.stats-total { font-size: 56rpx; font-weight: 800; color: $white; display: block; margin: 8rpx 0 $space-md; }

/* ---- 表单区域 ---- */
.form-section { margin-bottom: $space-md; }
.form-label { font-size: $text-sm; color: $text-muted; display: block; margin-bottom: $space-sm; }

.category-row { display: flex; flex-wrap: wrap; gap: $space-sm; }
.cat-chip {
  padding: $space-sm $space-lg; border-radius: 32rpx;
  background: $border-light; font-size: $text-sm; color: $text-muted;
  border: 2rpx solid transparent;
  &:active { transform: scale(0.95); }
}
.cat-chip.on {
  background: #FFF3E0; color: $accent; border-color: $accent; font-weight: 600;
}

.payer-row { display: flex; gap: $space-md; }
.payer-btn {
  flex: 1; text-align: center; padding: $space-md; border-radius: $radius-md;
  background: $border-light; font-size: 26rpx; color: $text-muted;
  border: 2rpx solid transparent;
  &:active { transform: scale(0.95); }
}
.payer-btn.on {
  background: #FFF3E0; color: $accent; border-color: $accent; font-weight: 600;
}

/* ---- 金额输入 ---- */
.amount-input-wrap {
  display: flex; align-items: center;
  background: $surface; border: 2rpx solid $border; border-radius: $radius-md;
  padding: 20rpx 24rpx;
}
.amount-prefix { font-size: $text-lg; color: $text-muted; margin-right: $space-sm; }
.amount-input { flex: 1; font-size: $text-xl; font-weight: 700; color: $text; }

/* ---- 备注 ---- */
.note-input {
  background: $surface; border: 2rpx solid $border; border-radius: $radius-md;
  padding: 20rpx 24rpx; font-size: 26rpx; color: $text;
}

/* ---- 保存按钮 ---- */
.save-btn {
  @include btn-primary;
  padding: 24rpx; text-align: center; margin: $space-lg 0;
}
.save-btn.off { opacity: 0.5; pointer-events: none; }

/* ---- 记录列表 ---- */
.record-list { margin-top: $space-xs; }
.list-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: $space-md; }
.list-title { font-size: 26rpx; font-weight: 700; color: $text-secondary; }
.clear-all-btn { font-size: $text-sm; color: $error; font-weight: 600; }
.clear-all-btn:active { opacity: 0.6; }
.empty-hint { text-align: center; padding: $space-xxl 0; font-size: 26rpx; color: $text-faint; }

.record-wrap { position: relative; overflow: hidden; border-radius: $radius-md; margin-bottom: $space-sm; }
.record-card {
  display: flex; align-items: center; justify-content: space-between;
  @include glass-card;
  border-radius: $radius-md;
  padding: 20rpx 24rpx; position: relative; z-index: 1;
  transition: transform 0.2s ease;
}
.record-left { display: flex; align-items: center; gap: $space-md; }
.record-icon { font-size: $text-lg; }
.record-info { display: flex; flex-direction: column; }
.record-note { font-size: 28rpx; font-weight: 600; color: $text; }
.record-meta { font-size: $text-xs; color: $text-faint; margin-top: 4rpx; }
.record-amount { font-size: $text-base; font-weight: 700; color: #FF5722; flex-shrink: 0; }

.record-del {
  position: absolute; right: 0; top: 0; bottom: 0;
  width: 140rpx; background: $error;
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.2s;
}
.record-del.show { opacity: 1; }
.del-text { color: $white; font-size: 26rpx; font-weight: 700; }
</style>
