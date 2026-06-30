<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAppStore } from '@/store/index'

const store = useAppStore()

// ---- 日历状态 ----
const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)
const selectedDate = ref(formatDate(now))
const entries = ref<any[]>([])
const loading = ref(true)
const hasLoaded = ref(false)

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ---- 月份数据 ----
const weekDays = ['日', '一', '二', '三', '四', '五', '六']

const calendarDays = computed(() => {
  const y = year.value
  const m = month.value - 1
  const firstDay = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()

  const days: { date: string; day: number; isToday: boolean }[] = []

  // 上月补空位（占位但不可点击）
  for (let i = 0; i < firstDay; i++) {
    days.push({ date: '', day: 0, isToday: false })
  }

  // 本月
  const today = formatDate(new Date())
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(y, m, d)
    days.push({ date: formatDate(dt), day: d, isToday: formatDate(dt) === today })
  }

  return days
})

// 有记录的日期集合
const entryDates = computed(() => {
  const set = new Set<string>()
  entries.value.forEach(e => set.add(e.date))
  return set
})

// ---- 月份切换 ----
function prevMonth() {
  if (month.value === 1) { year.value--; month.value = 12 }
  else month.value--
}

function nextMonth() {
  if (month.value === 12) { year.value++; month.value = 1 }
  else month.value++
}

function goToday() {
  const n = new Date()
  year.value = n.getFullYear()
  month.value = n.getMonth() + 1
  selectedDate.value = formatDate(n)
}

// ---- 年月选择器 ----
const showPicker = ref(false)
const pickerYear = ref(year.value)
const pickerMonth = ref(month.value)

function openPicker() {
  pickerYear.value = year.value
  pickerMonth.value = month.value
  showPicker.value = true
}

function pickerPrevYear() { pickerYear.value-- }
function pickerNextYear() { pickerYear.value++ }

function pickerSelectMonth(m: number) {
  pickerMonth.value = m
  year.value = pickerYear.value
  month.value = m
  showPicker.value = false
}

// ---- 选中日期 ----
function selectDay(date: string) {
  selectedDate.value = date
}

// 当天记录
const dayEntries = computed(() => {
  return entries.value.filter(e => e.date === selectedDate.value)
})

// ---- 加载数据 ----
async function loadEntries() {
  if (!store.coupleId) return
  if (!hasLoaded.value) loading.value = true
  try {
    const res = await wx.cloud.callFunction({
      name: 'getDiaries',
      data: { coupleId: store.coupleId, year: year.value, month: month.value }
    })
    if (res.result.success) entries.value = res.result.entries || []
    hasLoaded.value = true
  } catch {} finally {
    loading.value = false
  }
}

// ---- 弹窗 ----
const showPopup = ref(false)
const editingId = ref('')
const popupContent = ref('')
const popupImage = ref('')
const saving = ref(false)

function openAdd() {
  editingId.value = ''
  popupContent.value = ''
  popupImage.value = ''
  showPopup.value = true
}

function openEdit(entry: any) {
  if (entry.authorId !== store.openid) return
  editingId.value = entry._id
  popupContent.value = entry.content
  popupImage.value = entry.imageUrl || ''
  showPopup.value = true
}

function closePopup() {
  showPopup.value = false
  editingId.value = ''
  popupContent.value = ''
  popupImage.value = ''
}

async function saveEntry() {
  if (!popupContent.value.trim() || saving.value) return
  saving.value = true
  const content = popupContent.value.trim()
  const imageUrl = popupImage.value
  try {
    if (editingId.value) {
      // 编辑：立即更新本地
      const idx = entries.value.findIndex(e => e._id === editingId.value)
      if (idx !== -1) {
        entries.value[idx] = { ...entries.value[idx], content, imageUrl }
      }
      closePopup()
      wx.cloud.callFunction({
        name: 'updateDiary',
        data: { entryId: editingId.value, content, imageUrl }
      }).catch(() => loadEntries())
    } else {
      // 新增：立即插入本地
      const tempId = 'temp_' + Date.now()
      const tempEntry = {
        _id: tempId, coupleId: store.coupleId, authorId: store.openid,
        date: selectedDate.value, content, imageUrl,
        authorNickname: store.user?.nickname || '我',
        createdAt: { $date: new Date().toISOString() }
      }
      entries.value.unshift(tempEntry)
      closePopup()
      const res = await wx.cloud.callFunction({
        name: 'createDiary',
        data: { coupleId: store.coupleId, date: selectedDate.value, content, imageUrl }
      })
      // 替换临时条目为真实条目
      const ti = entries.value.findIndex(e => e._id === tempId)
      if (ti !== -1 && res.result.success) {
        entries.value[ti] = { ...entries.value[ti], _id: res.result.entryId }
      }
    }
  } catch {
    loadEntries()
  } finally {
    saving.value = false
  }
}

// ---- 图片 ----
function chooseImage() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: (res) => {
      const path = res.tempFilePaths[0]
      uni.showLoading({ title: '上传中...' })
      wx.cloud.uploadFile({
        cloudPath: `diary/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`,
        filePath: path,
        success: (r) => { popupImage.value = r.fileID },
        fail: () => { uni.showToast({ title: '上传失败', icon: 'none' }) },
        complete: () => uni.hideLoading()
      })
    }
  })
}

function removeImage() {
  popupImage.value = ''
}

// ---- 删除 ----
async function deleteEntry(entry: any) {
  if (entry.authorId !== store.openid) return
  const ok = await uni.showModal({ title: '确认删除', content: '删除这条记录？' })
  if (!ok.confirm) return
  // 立即从本地移除
  const removed = entries.value.filter(e => e._id !== entry._id)
  entries.value = removed
  // 后台同步删除
  wx.cloud.callFunction({ name: 'deleteDiary', data: { entryId: entry._id } })
    .catch(() => loadEntries())
}

// ---- 预览图片 ----
function previewImage(url: string) {
  if (!url) return
  uni.previewImage({ urls: [url], current: url })
}

// ---- 时间格式化 ----
function formatTime(val: any): string {
  const d = val?.$date ? new Date(val.$date) : new Date(val)
  if (isNaN(d.getTime())) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ---- 选中日期变化时重新筛选 ----
watch([year, month], () => loadEntries())

onShow(() => loadEntries())
</script>

<template>
  <page-layout>
    <!-- 月份导航 -->
    <view class="cal-nav">
      <view class="cal-nav-left">
        <view class="cal-arrow" @tap="prevMonth">‹</view>
        <text class="cal-title" @tap="openPicker">{{ year }}年{{ month }}月</text>
        <view class="cal-arrow" @tap="nextMonth">›</view>
      </view>
      <view class="cal-today" @tap="goToday">
        <text class="cal-today-t">今</text>
      </view>
    </view>

    <!-- 星期行 -->
    <view class="cal-week">
      <text v-for="w in weekDays" :key="w" class="cal-wd">{{ w }}</text>
    </view>

    <!-- 日历格子 -->
    <view class="cal-grid">
      <view
        v-for="(d, i) in calendarDays" :key="i"
        class="cal-cell"
        :class="{ today: d.isToday, selected: d.date === selectedDate, empty: !d.day }"
        @tap="d.day && selectDay(d.date)"
      >
        <text v-if="d.day" class="cal-day-num">{{ d.day }}</text>
        <view v-if="d.date && entryDates.has(d.date)" class="cal-dot" />
      </view>
    </view>

    <!-- 当天记录 -->
    <view class="day-section">
      <view class="day-header">
        <text class="day-title">{{ selectedDate }}</text>
        <view class="day-add" @tap="openAdd">
          <text class="day-add-t">+ 写点什么</text>
        </view>
      </view>

      <loading-spinner v-if="loading" text="加载中..." />

      <view v-else-if="dayEntries.length === 0" class="day-empty">
        <text class="day-empty-t">这一天还没有记录</text>
      </view>

      <view v-else class="entry-list">
        <view v-for="entry in dayEntries" :key="entry._id" class="entry-card" @tap="openEdit(entry)" @longpress="deleteEntry(entry)">
          <view class="entry-top">
            <view class="entry-meta">
              <text class="entry-author">{{ entry.authorId === store.openid ? '我' : 'TA' }}</text>
              <text class="entry-time">{{ entry.createdAt ? formatTime(entry.createdAt) : '' }}</text>
            </view>
            <view v-if="entry.authorId === store.openid" class="entry-del" @tap.stop="deleteEntry(entry)">
              <text class="entry-del-t">✕</text>
            </view>
          </view>
          <text class="entry-content">{{ entry.content }}</text>
          <image v-if="entry.imageUrl" :src="entry.imageUrl" class="entry-img" mode="aspectFill" @tap.stop="previewImage(entry.imageUrl)" />
        </view>
      </view>
    </view>

    <!-- 年月选择器 -->
    <view v-if="showPicker" class="picker-mask" @tap="showPicker = false">
      <view class="picker-sheet" @tap.stop>
        <view class="picker-year-row">
          <view class="picker-arrow" @tap="pickerPrevYear">‹</view>
          <text class="picker-year">{{ pickerYear }}年</text>
          <view class="picker-arrow" @tap="pickerNextYear">›</view>
        </view>
        <view class="picker-months">
          <view
            v-for="m in 12" :key="m"
            class="picker-month"
            :class="{ on: pickerYear === year && m === month }"
            @tap="pickerSelectMonth(m)"
          >
            <text>{{ m }}月</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 输入弹窗 -->
    <view v-if="showPopup" class="modal-mask" @tap="closePopup">
      <view class="modal-sheet" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">{{ editingId ? '编辑记录' : '写点什么' }}</text>
          <text class="modal-close" @tap="closePopup">✕</text>
        </view>
        <view class="modal-body">
          <textarea
            class="diary-input"
            v-model="popupContent"
            placeholder="记录今天发生的事..."
            maxlength="500"
            :auto-height="true"
            :show-confirm-bar="false"
          />
          <view class="diary-img-area">
            <view v-if="popupImage" class="diary-img-wrap">
              <image :src="popupImage" class="diary-img" mode="aspectFill" />
              <view class="diary-img-del" @tap="removeImage">✕</view>
            </view>
            <view v-else class="diary-img-add" @tap="chooseImage">
              <text class="diary-img-add-t">📷</text>
              <text class="diary-img-add-l">添加图片</text>
            </view>
          </view>
        </view>
        <view class="modal-footer">
          <view class="modal-btn cancel" @tap="closePopup">取消</view>
          <view class="modal-btn save" :class="{ off: !popupContent.trim() || saving }" @tap="saveEntry">
            <text>{{ saving ? '保存中...' : '保存' }}</text>
          </view>
        </view>
      </view>
    </view>
  </page-layout>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

/* ---- 月份导航 ---- */
.cal-nav {
  display: flex; align-items: center; justify-content: center;
  padding: 8rpx 0 $space-md; position: relative;
}
.cal-nav-left { display: flex; align-items: center; gap: $space-md; }
.cal-arrow {
  width: 56rpx; height: 56rpx; border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  display: flex; align-items: center; justify-content: center;
  font-size: $text-lg; color: $text-secondary; font-weight: 700;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  transition: transform 0.2s $ease-out-quart;
  &:active { transform: scale(0.88); }
}
.cal-title {
  font-size: $text-base;
  font-weight: 700;
  color: $text;
  padding: 0 8rpx;
}
.cal-today {
  width: 56rpx; height: 56rpx; border-radius: 50%;
  background: $gradient-accent;
  display: flex; align-items: center; justify-content: center;
  box-shadow: $shadow-button, 0 0 20rpx rgba(255, 152, 0, 0.15);
  position: absolute; right: 0;
  transition: transform 0.2s $ease-out-quart;
  &:active { transform: scale(0.88); }
}
.cal-today-t { font-size: $text-xs; color: $white; font-weight: 700; }

/* ---- 年月选择器 ---- */
.picker-mask { @include modal-mask; display: flex; align-items: center; justify-content: center; }
.picker-sheet {
  width: 580rpx; background: $white; border-radius: $radius-lg;
  padding: 32rpx; animation: fadeInScale 0.25s $ease-out-quart;
}
.picker-year-row {
  display: flex; align-items: center; justify-content: center; gap: 40rpx;
  margin-bottom: $space-lg;
}
.picker-arrow {
  width: 48rpx; height: 48rpx; border-radius: 50%;
  background: $border-light; display: flex; align-items: center; justify-content: center;
  font-size: 32rpx; color: $text-secondary; font-weight: 700;
  transition: background 0.15s;
  &:active { background: $border; }
}
.picker-year { font-size: 32rpx; font-weight: 700; color: $text; }
.picker-months { display: grid; grid-template-columns: repeat(4, 1fr); gap: $space-md; }
.picker-month {
  text-align: center; padding: $space-md 0; border-radius: $radius-sm;
  background: $border-light; font-size: 26rpx; color: $text-secondary;
  transition: all 0.2s $ease-out-quart;
  &:active { background: $border; transform: scale(0.95); }
}
.picker-month.on { @include btn-primary; box-shadow: $shadow-button; }

/* ---- 星期行 ---- */
.cal-week { display: flex; padding: 0 4rpx; margin-bottom: $space-xs; }
.cal-wd { flex: 1; text-align: center; font-size: $text-xs; color: $text-faint; font-weight: 600; }

/* ---- 日历格子 ---- */
.cal-grid {
  display: flex; flex-wrap: wrap; padding: 0 4rpx;
  @include glass-card-glow;
  margin-bottom: $space-lg;
}
.cal-cell {
  width: calc(100% / 7); aspect-ratio: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  position: relative;
  transition: background 0.2s;
}
.cal-day-num { font-size: 26rpx; color: $text; font-weight: 500; }
.cal-cell.empty { pointer-events: none; }
.cal-cell.today .cal-day-num {
  color: $white;
  background: linear-gradient(135deg, $primary, $accent);
  border-radius: 50%;
  width: 46rpx; height: 46rpx; line-height: 46rpx; text-align: center;
  box-shadow: 0 2rpx 8rpx rgba(255, 184, 0, 0.2);
}
.cal-cell.selected { background: rgba(255, 184, 0, 0.1); border-radius: $radius-md; }
.cal-cell:active { background: rgba(255, 184, 0, 0.06); border-radius: $radius-md; }
.cal-dot {
  width: 8rpx; height: 8rpx; border-radius: 50%;
  background: $accent;
  margin-top: 4rpx;
  box-shadow: 0 0 4rpx rgba(255, 152, 0, 0.3);
}

/* ---- 当天记录区 ---- */
.day-section {
  @include glass-card-glow;
  padding: $space-lg;
}
.day-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: $space-md;
}
.day-title { font-size: 28rpx; font-weight: 700; color: $text; }
.day-add {
  padding: 8rpx $space-lg; border-radius: 24rpx;
  @include btn-glow;
  &:active { transform: scale(0.95); }
}
.day-add-t { font-size: $text-xs; color: $white; font-weight: 700; }

.day-empty { padding: 40rpx 0; text-align: center; }
.day-empty-t { font-size: $text-sm; color: $text-faint; }

/* ---- 记录卡片 ---- */
.entry-list { display: flex; flex-direction: column; gap: $space-sm; }
.entry-card {
  background: rgba(255, 255, 255, 0.6);
  border-radius: $radius-md;
  padding: $space-md $space-lg;
  border: 1rpx solid rgba(255, 215, 0, 0.06);
  transition: transform 0.15s $ease-out-quart, box-shadow 0.15s $ease-out-quart;
  &:active { transform: scale(0.97); box-shadow: $shadow-card; }
}
.entry-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.entry-meta { display: flex; align-items: center; gap: $space-sm; }
.entry-author { font-size: $text-xs; color: $accent; font-weight: 600; }
.entry-time { font-size: 20rpx; color: $text-faint; }
.entry-del { padding: 4rpx 8rpx; }
.entry-del-t { font-size: $text-xs; color: $text-faint; }
.entry-content { font-size: 26rpx; color: $text; line-height: 1.6; }
.entry-img { width: 100%; max-height: 300rpx; border-radius: $radius-sm; margin-top: $space-sm; object-fit: cover; }

/* ---- 弹窗 ---- */
.modal-mask { @include modal-mask; }
.modal-sheet { @include modal-sheet; }
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 32rpx 32rpx $space-lg;
  border-bottom: 1rpx solid $border;
}
.modal-title { font-size: 32rpx; font-weight: 700; color: $text; }
.modal-close { font-size: 32rpx; color: $text-muted; padding: 8rpx; transition: transform 0.15s; &:active { transform: scale(1.2); } }
.modal-body { padding: $space-lg 32rpx; }
.modal-footer {
  display: flex; gap: $space-md; padding: $space-md 32rpx 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid $border;
}
.modal-btn {
  flex: 1; text-align: center; padding: $space-lg 0;
  border-radius: $radius-md; font-size: 28rpx; font-weight: 600;
  transition: all 0.15s;
}
.modal-btn.cancel { background: $border-light; color: $text-secondary; &:active { background: $border; } }
.modal-btn.save { @include btn-primary; }
.modal-btn.off { opacity: 0.5; pointer-events: none; }

/* ---- 输入框 ---- */
.diary-input {
  width: 100%; min-height: 160rpx; padding: $space-md $space-lg;
  border: 2rpx solid $border; border-radius: $radius-md;
  background: $surface; font-size: 28rpx; color: $text;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
  &:focus { border-color: $primary; box-shadow: 0 0 0 4rpx rgba(255, 184, 0, 0.08); }
}

/* ---- 图片区 ---- */
.diary-img-area { margin-top: $space-md; }
.diary-img-wrap { position: relative; display: inline-block; }
.diary-img { width: 200rpx; height: 200rpx; border-radius: $radius-sm; object-fit: cover; }
.diary-img-del {
  position: absolute; top: -12rpx; right: -12rpx;
  width: 36rpx; height: 36rpx; border-radius: 50%;
  background: rgba(0, 0, 0, 0.5); color: $white;
  display: flex; align-items: center; justify-content: center;
  font-size: 20rpx;
}
.diary-img-add {
  width: 200rpx; height: 200rpx; border-radius: $radius-sm;
  border: 2rpx dashed $border; background: $surface;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8rpx;
  transition: all 0.2s;
  &:active { background: $border; transform: scale(0.95); }
}
.diary-img-add-t { font-size: 40rpx; }
.diary-img-add-l { font-size: 20rpx; color: $text-faint; }
</style>
