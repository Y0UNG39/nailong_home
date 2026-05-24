<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { TASK_DIFFICULTY } from '@/utils/constants'
import { useAppStore } from '@/store/index'

const store = useAppStore()
const activeTab = ref(0)
const tabs = ['对方给我的', '我发布的', '历史记录']
const showCreate = ref(false)
const formData = ref({ title: '', description: '', difficulty: 'EASY', type: 'ONCE' })
const submitting = ref(false)

interface Task { _id: string; title: string; description: string; difficulty: 'EASY'|'MEDIUM'|'HARD'; type: 'ONCE'|'DAILY'|'WEEKLY'; coins: number; status: 'pending'|'submitted'|'approved'|'rejected'|'expired'; creatorNickname: string; assigneeNickname: string; createdAt: string; isMine: boolean }

const tasks = ref<Task[]>([])
const loading = ref(false)

async function loadTasks() {
  if (!store.coupleId) return
  loading.value = true
  try {
    const res = await wx.cloud.callFunction({ name: 'getTasks', data: { coupleId: store.coupleId } })
    if (res.result.success) {
      tasks.value = res.result.tasks || []
    }
  } catch (e) {
    console.error('loadTasks', e)
  } finally {
    loading.value = false
  }
}

const filterTasks = computed(() => {
  if (activeTab.value === 0) return tasks.value.filter(t => !t.isMine && (t.status === 'pending' || t.status === 'submitted' || t.status === 'rejected'))
  if (activeTab.value === 1) return tasks.value.filter(t => t.isMine && (t.status === 'pending' || t.status === 'submitted' || t.status === 'rejected'))
  return tasks.value.filter(t => t.status === 'approved' || t.status === 'expired')
})

function onTaskTap(task: Task) {
  // 发布者点击待审核任务 → 弹出审批选项
  if (task.isMine && task.status === 'submitted') {
    uni.showActionSheet({
      itemList: ['通过', '退回'],
      success: async (res) => {
        const approved = res.tapIndex === 0
        try {
          const r = await wx.cloud.callFunction({ name: 'approveTask', data: { taskId: task._id, approved } })
          if (r.result.success && approved) {
            await wx.cloud.callFunction({ name: 'coinChange', data: { coupleId: store.coupleId, amount: task.coins, type: 'task', description: `任务完成: ${task.title}` } })
          }
          uni.showToast({ title: approved ? '已通过' : '已退回', icon: 'success' })
          loadTasks()
        } catch (e: any) {
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    })
  }
}

async function onTaskAction(task: Task, action: string) {
  if (action === 'checkin' || action === 'recheckin') {
    try {
      await wx.cloud.callFunction({ name: 'completeTask', data: { taskId: task._id } })
      uni.showToast({ title: '已提交', icon: 'success' })
      loadTasks()
    } catch (e: any) {
      uni.showToast({ title: '提交失败', icon: 'none' })
    }
  }
  if (action === 'review') {
    uni.showActionSheet({
      itemList: ['通过', '退回'],
      success: async (res) => {
        const approved = res.tapIndex === 0
        try {
          await wx.cloud.callFunction({ name: 'approveTask', data: { taskId: task._id, approved } })
          if (approved) {
            await wx.cloud.callFunction({ name: 'coinChange', data: { coupleId: store.coupleId, amount: task.coins, type: 'task', description: `任务完成: ${task.title}` } })
          }
          uni.showToast({ title: approved ? '已通过' : '已退回', icon: 'success' })
          loadTasks()
        } catch {
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    })
  }
}

async function onTaskDelete(task: Task) {
  uni.showModal({
    title: '删除任务',
    content: '确定删除「' + task.title + '」吗？',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await wx.cloud.callFunction({ name: 'deleteTask', data: { taskId: task._id } })
        uni.showToast({ title: '已删除', icon: 'success' })
        loadTasks()
      } catch {
        uni.showToast({ title: '删除失败', icon: 'none' })
      }
    }
  })
}

async function submitCreate() {
  if (!formData.value.title.trim()) {
    uni.showToast({ title: '请输入任务标题', icon: 'none' })
    return
  }
  if (!store.coupleId) {
    uni.showToast({ title: '请先创建空间', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const res = await wx.cloud.callFunction({
      name: 'createTask',
      data: {
        coupleId: store.coupleId,
        title: formData.value.title.trim(),
        description: formData.value.description.trim(),
        difficulty: formData.value.difficulty,
        type: formData.value.type
      }
    })
    if (res.result.success) {
      uni.showToast({ title: `已发布！奖励${res.result.coins}币`, icon: 'success' })
      showCreate.value = false
      formData.value = { title: '', description: '', difficulty: 'EASY', type: 'ONCE' }
      loadTasks()
    } else {
      uni.showToast({ title: res.result.error || '发布失败', icon: 'none' })
    }
  } catch (e: any) {
    uni.showToast({ title: '发布失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onShow(() => {
  loadTasks()
})
</script>

<template>
  <view class="page-container">
    <!-- Tab 切换 -->
    <view class="tab-bar">
      <view v-for="(tab, i) in tabs" :key="i" class="tab" :class="{ active: activeTab === i }" @tap="activeTab = i">
        {{ tab }}
      </view>
    </view>

    <!-- 任务列表 -->
    <scroll-view class="task-list" scroll-y>
      <loading-spinner v-if="loading" text="加载中..." />
      <task-card v-for="t in filterTasks" :key="t._id" :task="t" :isMine="t.isMine" @tap="onTaskTap" @action="onTaskAction" @delete="onTaskDelete" />
      <empty-state v-if="!loading && filterTasks.length === 0" icon="📋" text="暂无任务" />
    </scroll-view>

    <!-- 发布按钮 -->
    <view v-if="activeTab === 1" class="fab" @tap="showCreate = true">
      <text class="fab-icon">+</text><text>发布任务</text>
    </view>

    <!-- 创建弹窗 -->
    <view v-if="showCreate" class="modal-mask" @tap="showCreate = false">
      <view class="modal-sheet" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">发布新任务</text>
          <text class="modal-close" @tap="showCreate = false">✕</text>
        </view>
        <scroll-view class="modal-body" scroll-y>
          <view class="form-group">
            <text class="form-label"><text class="required">*</text> 任务标题</text>
            <input class="form-input" v-model="formData.title" placeholder="例如：今天11点前睡" maxlength="50" />
          </view>
          <view class="form-group">
            <text class="form-label">描述（选填）</text>
            <textarea class="form-textarea" v-model="formData.description" placeholder="补充说明..." maxlength="200" />
          </view>
          <view class="form-group">
            <text class="form-label"><text class="required">*</text> 难度</text>
            <view class="seg-group">
              <view v-for="(v, k) in TASK_DIFFICULTY" :key="k" class="seg"
                :class="{ sel: formData.difficulty === k }" :style="{ '--c': v.color }"
                @tap="formData.difficulty = k as string">{{ v.label }} · {{ v.coins }}币</view>
            </view>
          </view>
          <view class="form-group">
            <text class="form-label"><text class="required">*</text> 类型</text>
            <view class="seg-group">
              <view v-for="t in ['ONCE', 'DAILY', 'WEEKLY']" :key="t" class="seg" :class="{ sel: formData.type === t }" @tap="formData.type = t">{{ t === 'ONCE' ? '一次性' : t === 'DAILY' ? '每日' : '每周' }}</view>
            </view>
          </view>
        </scroll-view>
        <view class="modal-footer">
          <view class="submit-btn" :class="{ disabled: submitting }" @tap="!submitting && submitCreate()"><text>{{ submitting ? '发布中...' : '发布任务' }}</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page-container { display: flex; flex-direction: column; height: 100vh; background: #FFFAEE; }
.tab-bar { display: flex; background: #fff; padding: 0 20rpx; border-bottom: 1rpx solid #FFE082; }
.tab { flex:1; text-align:center; padding:24rpx 0; font-size:28rpx; color:#999; position:relative; }
.tab.active { color:#FFB800; font-weight:700; }
.tab.active::after { content:''; position:absolute; bottom:0; left:50%; transform:translateX(-50%); width:48rpx; height:6rpx; background:#FFB800; border-radius:3rpx; }
.task-list { flex:1; padding: 24rpx; }
.fab { position:fixed; bottom:40rpx; right:40rpx; z-index:100; display:flex; align-items:center; background:linear-gradient(135deg,#FFB800,#FFCC00); padding:18rpx 32rpx; border-radius:48rpx; box-shadow:0 8rpx 24rpx rgba(255,184,0,0.35); font-size:26rpx; color:#fff; font-weight:600; }
.fab-icon { font-size:36rpx; margin-right:6rpx; }

.modal-mask { position:fixed; inset:0; background:rgba(0,0,0,0.4); backdrop-filter:blur(4rpx); z-index:200; }
.modal-sheet { position:fixed; left:0; right:0; bottom:0; z-index:201; background:#fff; border-radius:32rpx 32rpx 0 0; display:flex; flex-direction:column; animation:slideUp 0.3s ease-out; }
@keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
.modal-header { display:flex; align-items:center; justify-content:space-between; padding:32rpx 32rpx 20rpx; border-bottom:1rpx solid #F0F0F0; }
.modal-title { font-size:34rpx; font-weight:700; color:#333; }
.modal-close { font-size:36rpx; color:#bbb; padding:8rpx; }
.modal-body { padding:24rpx 32rpx; max-height:50vh; }
.form-group { margin-bottom:28rpx; }
.form-label { font-size:28rpx; font-weight:600; color:#333; margin-bottom:12rpx; display:block; }
.required { color:#FFB800; }
.form-input { width:100%; height:80rpx; border:2rpx solid #F0F0F0; border-radius:16rpx; padding:0 20rpx; font-size:28rpx; background:#FAFAFA; box-sizing:border-box; }
.form-textarea { width:100%; min-height:120rpx; border:2rpx solid #F0F0F0; border-radius:16rpx; padding:16rpx 20rpx; font-size:26rpx; background:#FAFAFA; box-sizing:border-box; }
.seg-group { display:flex; gap:14rpx; }
.seg { flex:1; text-align:center; font-size:24rpx; color:#999; padding:14rpx 0; border:2rpx solid #F0F0F0; border-radius:16rpx; background:#FAFAFA; }
.seg.sel { color:#FFB800; border-color:#FFB800; background:#FFF8E1; font-weight:700; }
.modal-footer { padding:16rpx 32rpx 32rpx; padding-bottom:calc(32rpx + env(safe-area-inset-bottom)); border-top:1rpx solid #F0F0F0; }
.submit-btn { width:100%; height:88rpx; line-height:88rpx; text-align:center; background:linear-gradient(135deg,#FFB800,#FFCC00); border-radius:44rpx; font-size:32rpx; font-weight:700; color:#fff; }
.submit-btn.disabled { opacity:0.5; pointer-events:none; }
</style>
