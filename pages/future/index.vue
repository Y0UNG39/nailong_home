<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAppStore } from '@/store/index'
import { DREAM_CATEGORIES } from '@/utils/constants'

const store = useAppStore()

const dreams = ref<any[]>([])
const dreamFilter = ref<'dreaming' | 'completed'>('dreaming')
const filteredDreams = computed(() => dreams.value.filter(d => d.status === dreamFilter.value))
const myOpenid = ref(store.openid || '')

const showCreateDream = ref(false)
const editingDreamId = ref('')
const dreamForm = ref({ title: '', category: 'travel' })
const dreamSubmitting = ref(false)

function loadFutureData() {
  if (!store.coupleId) return

  wx.cloud.callFunction({ name: 'getDreams', data: { coupleId: store.coupleId } }).then(res => {
    if (res.result.success) dreams.value = res.result.dreams || []
  }).catch(() => {})
}

async function onDreamLike(dream: any) {
  try {
    const res = await wx.cloud.callFunction({ name: 'likeDream', data: { dreamId: dream._id } })
    if (res.result.success) {
      dream.likes = res.result.likes
    }
  } catch { /* ignore */ }
}

const completingSet = new Set<string>()

async function onDreamComplete(dream: any) {
  if (completingSet.has(dream._id)) return
  completingSet.add(dream._id)
  try {
    const res = await wx.cloud.callFunction({ name: 'dreamComplete', data: { dreamId: dream._id } })
    if (res.result.success) {
      dream.status = res.result.status
      uni.showToast({ title: res.result.status === 'completed' ? '已标记完成' : '已取消完成', icon: 'success' })
    }
  } catch { /* ignore */ }
  completingSet.delete(dream._id)
}

function onDreamEdit(dream: any) {
  editingDreamId.value = dream._id
  dreamForm.value = { title: dream.title, category: dream.category }
  showCreateDream.value = true
}

function openCreateDream() {
  editingDreamId.value = ''
  dreamForm.value = { title: '', category: 'travel' }
  showCreateDream.value = true
}

async function submitDream() {
  if (!dreamForm.value.title.trim()) {
    uni.showToast({ title: '请输入梦想标题', icon: 'none' })
    return
  }
  if (!store.coupleId) return
  dreamSubmitting.value = true
  const isEdit = !!editingDreamId.value
  try {
    const res = await wx.cloud.callFunction({
      name: isEdit ? 'dreamUpdate' : 'dreamCreate',
      data: isEdit
        ? { dreamId: editingDreamId.value, title: dreamForm.value.title.trim(), category: dreamForm.value.category }
        : { coupleId: store.coupleId, title: dreamForm.value.title.trim(), category: dreamForm.value.category }
    })
    if (res.result.success) {
      uni.showToast({ title: isEdit ? '已更新' : '已添加', icon: 'success' })
      showCreateDream.value = false
      editingDreamId.value = ''
      dreamForm.value = { title: '', category: 'travel' }
      loadFutureData()
    } else {
      uni.showToast({ title: res.result.error || (isEdit ? '更新失败' : '添加失败'), icon: 'none' })
    }
  } catch {
    uni.showToast({ title: isEdit ? '更新失败' : '添加失败', icon: 'none' })
  } finally {
    dreamSubmitting.value = false
  }
}

async function onDreamDelete(dream: any) {
  const ok = await uni.showModal({ title: '确认删除', content: `确定删除「${dream.title}」吗？` })
  if (!ok.confirm) return
  try {
    dreams.value = dreams.value.filter((d: any) => d._id !== dream._id)
    uni.showToast({ title: '已删除', icon: 'success' })
    const res = await wx.cloud.callFunction({ name: 'dreamDelete', data: { dreamId: dream._id } })
    if (!res.result.success) {
      dreams.value.push(dream)
      uni.showToast({ title: '删除失败', icon: 'none' })
    } else {
      loadFutureData()
    }
  } catch {
    dreams.value.push(dream)
    uni.showToast({ title: '删除失败', icon: 'none' })
  }
}

onShow(() => {
  loadFutureData()
})
</script>

<template>
  <page-layout>
    <!-- 梦想板 -->
    <view class="tab-content">
      <view class="sub-tabs">
        <view class="sub-tab" :class="{ active: dreamFilter === 'dreaming' }" @tap="dreamFilter = 'dreaming'">⭐ 进行中</view>
        <view class="sub-tab" :class="{ active: dreamFilter === 'completed' }" @tap="dreamFilter = 'completed'">✅ 已完成</view>
      </view>
      <view class="dream-grid">
        <view class="dream-col" v-for="d in filteredDreams" :key="d._id">
          <dream-card :dream="d" :myOpenid="myOpenid" showDelete @like="onDreamLike" @delete="onDreamDelete" @complete="onDreamComplete" @edit="onDreamEdit" />
        </view>
      </view>
      <empty-state v-if="filteredDreams.length === 0" :icon="dreamFilter === 'dreaming' ? '⭐' : '✅'" :text="dreamFilter === 'dreaming' ? '还没有进行中的梦想' : '还没有完成的梦想'" />
      <view class="fab" @tap="openCreateDream">
        <text class="fab-icon">+</text><text>添加梦想</text>
      </view>
    </view>

    <!-- 添加梦想弹窗 -->
    <view v-if="showCreateDream" class="modal-mask" @tap="showCreateDream = false; editingDreamId = ''">
      <view class="modal-sheet" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">{{ editingDreamId ? '编辑梦想' : '添加梦想' }}</text>
          <text class="modal-close" @tap="showCreateDream = false; editingDreamId = ''">✕</text>
        </view>
        <scroll-view class="modal-body" scroll-y>
          <view class="form-group">
            <text class="form-label"><text class="required">*</text> 类型</text>
            <view class="seg-group">
              <view v-for="c in DREAM_CATEGORIES" :key="c.key" class="seg" :class="{ sel: dreamForm.category === c.key }" @tap="dreamForm.category = c.key">{{ c.icon }} {{ c.label }}</view>
            </view>
          </view>
          <view class="form-group">
            <text class="form-label"><text class="required">*</text> 标题</text>
            <input class="form-input" v-model="dreamForm.title" placeholder="例如：一起去冰岛看极光" maxlength="100" />
          </view>
        </scroll-view>
        <view class="modal-footer">
          <view class="submit-btn" :class="{ disabled: dreamSubmitting }" @tap="!dreamSubmitting && submitDream()">
            <text>{{ dreamSubmitting ? '保存中...' : editingDreamId ? '保存修改' : '添加梦想' }}</text>
          </view>
        </view>
      </view>
    </view>
  </page-layout>
</template>

<style lang="scss" scoped>
.tab-content { padding-bottom: 140rpx; }
.sub-tabs {
  display: flex; background: rgba(255,255,255,0.8); backdrop-filter: blur(12rpx);
  border-radius: 20rpx; padding: 8rpx; margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(255,184,0,0.06);
}
.sub-tab { flex:1; text-align:center; padding:18rpx 0; font-size:26rpx; color:#999; border-radius:16rpx; transition:all 0.2s; }
.sub-tab.active { background:#FFB800; color:#fff; font-weight:700; box-shadow:0 4rpx 12rpx rgba(255,184,0,0.25); }
.dream-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.dream-col { width: calc(50% - 8rpx); box-sizing: border-box; }

.fab { position:fixed; bottom:40rpx; right:40rpx; z-index:100; display:flex; align-items:center; background:linear-gradient(135deg,#FF9800,#FFB74D); padding:18rpx 32rpx; border-radius:48rpx; box-shadow:0 8rpx 24rpx rgba(255,152,0,0.35); font-size:26rpx; color:#fff; font-weight:600; }
.fab-icon { font-size:36rpx; margin-right:6rpx; }

.modal-mask { position:fixed; inset:0; background:rgba(0,0,0,0.4); backdrop-filter:blur(4rpx); z-index:200; }
.modal-sheet { position:fixed; left:0; right:0; bottom:0; z-index:201; background:#fff; border-radius:32rpx 32rpx 0 0; display:flex; flex-direction:column; animation:slideUp 0.3s ease-out; }
@keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
.modal-header { display:flex; align-items:center; justify-content:space-between; padding:32rpx 32rpx 20rpx; border-bottom:1rpx solid #F0F0F0; }
.modal-title { font-size:34rpx; font-weight:700; color:#333; }
.modal-close { font-size:36rpx; color:#bbb; padding:8rpx; }
.modal-body { padding:24rpx 32rpx; max-height:55vh; }
.form-group { margin-bottom:24rpx; }
.form-label { font-size:28rpx; font-weight:600; color:#333; margin-bottom:12rpx; display:block; }
.required { color:#FFB800; }
.form-input { width:100%; height:80rpx; border:2rpx solid #F0F0F0; border-radius:16rpx; padding:0 20rpx; font-size:28rpx; background:#FAFAFA; box-sizing:border-box; }
.seg-group { display:flex; gap:8rpx; flex-wrap: wrap; }
.seg { flex:1; min-width: 80rpx; text-align:center; font-size:22rpx; color:#999; padding:14rpx 4rpx; border:2rpx solid #F0F0F0; border-radius:16rpx; background:#FAFAFA; }
.seg.sel { color:#FF9800; border-color:#FF9800; background:#FFF3E0; font-weight:700; }
.modal-footer { padding:16rpx 32rpx 32rpx; padding-bottom:calc(32rpx + env(safe-area-inset-bottom)); border-top:1rpx solid #F0F0F0; }
.submit-btn { width:100%; height:88rpx; line-height:88rpx; text-align:center; background:linear-gradient(135deg,#FF9800,#FFB74D); border-radius:44rpx; font-size:32rpx; font-weight:700; color:#fff; }
.submit-btn.disabled { opacity:0.5; pointer-events:none; }
</style>
