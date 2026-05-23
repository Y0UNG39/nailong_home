<script setup lang="ts">
import { ref, computed } from 'vue'
import { TASK_DIFFICULTY } from '@/utils/constants'
import { useAppStore } from '@/store/index'

const store = useAppStore()
const activeTab = ref(0)
const tabs = ['对方给我的', '我发布的', '历史记录']
const showCreate = ref(false)
const formData = ref({ title: '', description: '', difficulty: 'EASY', type: 'ONCE' })

interface Task { _id: string; title: string; description: string; difficulty: 'EASY'|'MEDIUM'|'HARD'; type: 'ONCE'|'DAILY'|'WEEKLY'; coins: number; status: 'pending'|'submitted'|'approved'|'rejected'|'expired'; creatorNickname: string; assigneeNickname: string; createdAt: string }

const MOCK: Task[] = [
  { _id: '1', title: '今天11点前睡', description: '', difficulty: 'MEDIUM', type: 'DAILY', coins: 3, status: 'pending', creatorNickname: 'TA', assigneeNickname: '你', createdAt: new Date().toISOString() },
  { _id: '2', title: '喝8杯水', description: '多喝水对身体好', difficulty: 'EASY', type: 'DAILY', coins: 1, status: 'submitted', creatorNickname: 'TA', assigneeNickname: '你', createdAt: new Date().toISOString() },
  { _id: '3', title: '去跑步30分钟', description: '一起运动', difficulty: 'HARD', type: 'WEEKLY', coins: 5, status: 'approved', creatorNickname: '你', assigneeNickname: 'TA', createdAt: new Date().toISOString() },
  { _id: '4', title: '给TA做顿饭', description: '周末大厨上线', difficulty: 'HARD', type: 'ONCE', coins: 5, status: 'pending', creatorNickname: '你', assigneeNickname: '你', createdAt: new Date().toISOString() },
  { _id: '5', title: '看一本书', description: '这个月读完这本书', difficulty: 'MEDIUM', type: 'WEEKLY', coins: 3, status: 'rejected', creatorNickname: 'TA', assigneeNickname: '你', createdAt: new Date().toISOString() }
]

const filterTasks = computed(() => {
  if (activeTab.value === 0) return MOCK.filter(t => t.assigneeNickname === '你')
  if (activeTab.value === 1) return MOCK.filter(t => t.creatorNickname === '你')
  return MOCK.filter(t => t.status === 'approved' || t.status === 'expired')
})

function onTaskTap(task: Task) { /* TODO */ }
function onTaskAction(task: Task, action: string) {
  if (action === 'checkin') {
    uni.showToast({ title: '打卡成功(模拟)', icon: 'success' })
  }
}

function submitCreate() {
  if (!formData.value.title.trim()) {
    uni.showToast({ title: '请输入任务标题', icon: 'none' })
    return
  }
  const diff = TASK_DIFFICULTY[formData.value.difficulty as keyof typeof TASK_DIFFICULTY]
  uni.showToast({ title: `任务已发布！奖励${diff.coins}币`, icon: 'success' })
  showCreate.value = false
  formData.value = { title: '', description: '', difficulty: 'EASY', type: 'ONCE' }
}
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
      <task-card v-for="t in filterTasks" :key="t._id" :task="t" @tap="onTaskTap" @action="onTaskAction" />
      <empty-state v-if="filterTasks.length === 0" icon="📋" text="暂无任务" />
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
          <view class="submit-btn" @tap="submitCreate"><text>发布任务</text></view>
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
</style>
