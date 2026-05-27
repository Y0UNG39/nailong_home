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
              <text class="entry-author">{{ entry.authorNickname || '我' }}</text>
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
/* ---- 月份导航 ---- */
.cal-nav {
  display: flex; align-items: center; justify-content: center;
  padding: 8rpx 0 16rpx; position: relative;
}
.cal-nav-left {
  display: flex; align-items: center; gap: 16rpx;
}
.cal-arrow {
  width: 56rpx; height: 56rpx; border-radius: 50%;
  background: rgba(255,255,255,0.85);
  display: flex; align-items: center; justify-content: center;
  font-size: 36rpx; color: #666; font-weight: 700;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06);
}
.cal-arrow:active { transform: scale(0.92); }
.cal-title { font-size: 30rpx; font-weight: 700; color: #333; }
.cal-today {
  width: 56rpx; height: 56rpx; border-radius: 50%;
  background: linear-gradient(135deg, #FF9800, #FFB74D);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(255,152,0,0.3);
  position: absolute; right: 0;
}
.cal-today:active { transform: scale(0.92); }
.cal-today-t { font-size: 22rpx; color: #fff; font-weight: 700; }

/* ---- 年月选择器 ---- */
.picker-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4); backdrop-filter: blur(4rpx);
  z-index: 100; display: flex; align-items: center; justify-content: center;
}
.picker-sheet {
  width: 580rpx; background: #fff; border-radius: 24rpx;
  padding: 32rpx; animation: pickerIn 0.2s ease-out;
}
@keyframes pickerIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.picker-year-row {
  display: flex; align-items: center; justify-content: center; gap: 40rpx;
  margin-bottom: 24rpx;
}
.picker-arrow {
  width: 48rpx; height: 48rpx; border-radius: 50%;
  background: #F5F5F5; display: flex; align-items: center; justify-content: center;
  font-size: 32rpx; color: #666; font-weight: 700;
}
.picker-arrow:active { background: #E0E0E0; }
.picker-year { font-size: 32rpx; font-weight: 700; color: #333; }
.picker-months {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx;
}
.picker-month {
  text-align: center; padding: 16rpx 0; border-radius: 12rpx;
  background: #F5F5F5; font-size: 26rpx; color: #666;
}
.picker-month:active { background: #E0E0E0; }
.picker-month.on {
  background: linear-gradient(135deg, #FF9800, #FFB74D);
  color: #fff; font-weight: 700;
}

/* ---- 星期行 ---- */
.cal-week {
  display: flex; padding: 0 4rpx; margin-bottom: 8rpx;
}
.cal-wd {
  flex: 1; text-align: center; font-size: 22rpx; color: #bbb; font-weight: 600;
}

/* ---- 日历格子 ---- */
.cal-grid {
  display: flex; flex-wrap: wrap; padding: 0 4rpx;
  background: rgba(255,255,255,0.85); border-radius: 24rpx;
  backdrop-filter: blur(16rpx);
  box-shadow: 0 6rpx 28rpx rgba(255,184,0,0.06);
  border: 1rpx solid rgba(255,255,255,0.5);
  margin-bottom: 20rpx;
}
.cal-cell {
  width: calc(100% / 7); aspect-ratio: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  position: relative;
}
.cal-day-num {
  font-size: 26rpx; color: #333; font-weight: 500;
}
.cal-cell.empty { pointer-events: none; }
.cal-cell.today .cal-day-num {
  color: #fff; background: #FFB800; border-radius: 50%;
  width: 44rpx; height: 44rpx; line-height: 44rpx; text-align: center;
}
.cal-cell.selected {
  background: rgba(255,184,0,0.08); border-radius: 16rpx;
}
.cal-dot {
  width: 8rpx; height: 8rpx; border-radius: 50%;
  background: #FF9800; margin-top: 4rpx;
}

/* ---- 当天记录区 ---- */
.day-section {
  background: rgba(255,255,255,0.85); border-radius: 24rpx;
  backdrop-filter: blur(16rpx);
  box-shadow: 0 6rpx 28rpx rgba(255,184,0,0.06);
  border: 1rpx solid rgba(255,255,255,0.5);
  padding: 24rpx;
}
.day-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 16rpx;
}
.day-title { font-size: 28rpx; font-weight: 700; color: #333; }
.day-add {
  padding: 8rpx 20rpx; border-radius: 24rpx;
  background: linear-gradient(135deg, #FF9800, #FFB74D);
  box-shadow: 0 4rpx 16rpx rgba(255,152,0,0.3);
}
.day-add:active { transform: scale(0.95); }
.day-add-t { font-size: 22rpx; color: #fff; font-weight: 700; }

.day-empty { padding: 40rpx 0; text-align: center; }
.day-empty-t { font-size: 24rpx; color: #ccc; }

/* ---- 记录卡片 ---- */
.entry-list { display: flex; flex-direction: column; gap: 12rpx; }
.entry-card {
  background: rgba(255,255,255,0.6); border-radius: 16rpx;
  padding: 16rpx 20rpx;
  border: 1rpx solid rgba(0,0,0,0.04);
}
.entry-card:active { transform: scale(0.98); }
.entry-top {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 8rpx;
}
.entry-meta { display: flex; align-items: center; gap: 12rpx; }
.entry-author { font-size: 22rpx; color: #FF9800; font-weight: 600; }
.entry-time { font-size: 20rpx; color: #bbb; }
.entry-del { padding: 4rpx 8rpx; }
.entry-del-t { font-size: 22rpx; color: #ccc; }
.entry-content { font-size: 26rpx; color: #333; line-height: 1.6; }
.entry-img {
  width: 100%; max-height: 300rpx; border-radius: 12rpx;
  margin-top: 12rpx; object-fit: cover;
}

/* ---- 弹窗 ---- */
.modal-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4); backdrop-filter: blur(4rpx);
  z-index: 100;
}
.modal-sheet {
  position: fixed; left: 0; right: 0; bottom: 0;
  background: #fff; border-radius: 32rpx 32rpx 0 0;
  max-height: 85vh; z-index: 101;
  animation: slideUp 0.3s ease-out;
}
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 32rpx 32rpx 20rpx;
  border-bottom: 1rpx solid #F0F0F0;
}
.modal-title { font-size: 32rpx; font-weight: 700; color: #333; }
.modal-close { font-size: 32rpx; color: #999; padding: 8rpx; }
.modal-body { padding: 24rpx 32rpx; }
.modal-footer {
  display: flex; gap: 16rpx; padding: 16rpx 32rpx 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #F0F0F0;
}
.modal-btn {
  flex: 1; text-align: center; padding: 20rpx 0;
  border-radius: 16rpx; font-size: 28rpx; font-weight: 600;
}
.modal-btn.cancel { background: #F5F5F5; color: #666; }
.modal-btn.save {
  background: linear-gradient(135deg, #FF9800, #FFB74D);
  color: #fff; box-shadow: 0 4rpx 16rpx rgba(255,152,0,0.3);
}
.modal-btn.off { opacity: 0.5; pointer-events: none; }

/* ---- 输入框 ---- */
.diary-input {
  width: 100%; min-height: 160rpx; padding: 16rpx 20rpx;
  border: 2rpx solid #F0F0F0; border-radius: 16rpx;
  background: #FAFAFA; font-size: 28rpx; color: #333;
  box-sizing: border-box;
}

/* ---- 图片区 ---- */
.diary-img-area { margin-top: 16rpx; }
.diary-img-wrap { position: relative; display: inline-block; }
.diary-img {
  width: 200rpx; height: 200rpx; border-radius: 12rpx;
  object-fit: cover;
}
.diary-img-del {
  position: absolute; top: -12rpx; right: -12rpx;
  width: 36rpx; height: 36rpx; border-radius: 50%;
  background: rgba(0,0,0,0.5); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 20rpx;
}
.diary-img-add {
  width: 200rpx; height: 200rpx; border-radius: 12rpx;
  border: 2rpx dashed #E0E0E0; background: #FAFAFA;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8rpx;
}
.diary-img-add:active { background: #F0F0F0; }
.diary-img-add-t { font-size: 40rpx; }
.diary-img-add-l { font-size: 20rpx; color: #bbb; }
</style>
