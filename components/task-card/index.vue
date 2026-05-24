<script setup lang="ts">
import { ref, computed } from 'vue'
import { TASK_DIFFICULTY, TASK_TYPE } from '@/utils/constants'
import { timeAgo } from '@/utils/date'

interface Task {
  _id: string; title: string; description: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'; type: 'ONCE' | 'DAILY' | 'WEEKLY'
  coins: number; status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'expired'
  creatorNickname: string; assigneeNickname: string
  deadline?: string; proofImage?: string; proofNote?: string
  createdAt: string
}

interface Props { task: Task; showMeta?: boolean; isMine?: boolean }

const props = withDefaults(defineProps<Props>(), { showMeta: true, isMine: false })
const emit = defineEmits<{ tap: [task: Task]; action: [task: Task, action: string]; delete: [task: Task] }>()

const diff = computed(() => TASK_DIFFICULTY[props.task.difficulty])
const typeLabel = computed(() => TASK_TYPE[props.task.type])

const statusCfg = computed(() => {
  const t = props.task
  if (props.isMine) {
    // 我发布给对方的
    const m: Record<string, { label: string; btn?: string; btnAction?: string; cls: string }> = {
      pending:   { label: '进行中', cls: 's-pending' },
      submitted: { label: '待审核', btn: '审核', btnAction: 'review', cls: 's-submitted' },
      approved:  { label: '已完成', cls: 's-approved' },
      rejected:  { label: '已退回', cls: 's-rejected' },
      expired:   { label: '已过期', cls: 's-expired' }
    }
    return m[t.status] || m.pending
  }
  // 对方发布给我的
  const m: Record<string, { label: string; btn?: string; btnAction?: string; cls: string }> = {
    pending:   { label: '进行中', btn: '去打卡', btnAction: 'checkin', cls: 's-pending' },
    submitted: { label: '待审核', cls: 's-submitted' },
    approved:  { label: '已完成', cls: 's-approved' },
    rejected:  { label: '已退回', btn: '重新打卡', btnAction: 'recheckin', cls: 's-rejected' },
    expired:   { label: '已过期', cls: 's-expired' }
  }
  return m[t.status] || m.pending
})

// 左滑删除
const translateX = ref(0)
const startX = ref(0)
const swiping = ref(false)
const deleteBtnWidth = 140

function onTouchStart(e: any) {
  startX.value = e.touches[0].clientX
  swiping.value = true
}
function onTouchMove(e: any) {
  if (!swiping.value) return
  const dx = e.touches[0].clientX - startX.value
  if (dx < 0) {
    translateX.value = Math.max(dx, -deleteBtnWidth)
  } else {
    translateX.value = Math.min(0, translateX.value + dx * 0.3)
  }
}
function onTouchEnd() {
  swiping.value = false
  if (translateX.value < -deleteBtnWidth / 2) {
    translateX.value = -deleteBtnWidth
  } else {
    translateX.value = 0
  }
}

function onDelete() {
  translateX.value = 0
  emit('delete', props.task)
}

function onTap() {
  if (Math.abs(translateX.value) > 5) {
    translateX.value = 0
    return
  }
  emit('tap', props.task)
}

function onAction() {
  if (statusCfg.value.btnAction) {
    emit('action', props.task, statusCfg.value.btnAction)
  }
}
</script>

<template>
  <view class="card-wrap">
    <view class="delete-btn" :class="{ show: translateX < 0 }" @tap.stop="onDelete">
      <text class="del-text" v-if="translateX < 0">删除</text>
    </view>
    <view
      class="card"
      :class="{ mine: isMine }"
      :style="{ transform: 'translateX(' + translateX + 'rpx)' }"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @tap="onTap"
    >
      <view class="header">
        <text class="title">{{ task.title }}</text>
        <view class="status-tag" :class="statusCfg.cls">
          <text>{{ statusCfg.label }}</text>
        </view>
      </view>
      <text class="desc" v-if="task.description">{{ task.description }}</text>
      <view class="meta" v-if="showMeta">
        <view class="tag difficulty" :style="{ background: diff.color }">
          <text>{{ diff.label }} · {{ task.coins }}币</text>
        </view>
        <view class="tag type-tag">
          <text>{{ typeLabel }}</text>
        </view>
      </view>
      <view class="footer">
        <text class="who">{{ isMine ? ('我→' + task.assigneeNickname) : (task.creatorNickname + '→我') }}</text>
        <text class="time">{{ timeAgo(task.createdAt) }}</text>
      </view>
      <view v-if="statusCfg.btn" class="action-btn" :class="statusCfg.cls" @tap.stop="onAction">
        <text>{{ statusCfg.btn }}</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.card-wrap {
  position: relative; overflow: hidden; margin-bottom: 20rpx; border-radius: 24rpx;
}
.delete-btn {
  position: absolute; right: 0; top: 0; bottom: 0; width: 140rpx;
  border-radius: 0 24rpx 24rpx 0;
  display: flex; align-items: center; justify-content: center;
  opacity: 0;
}
.delete-btn.show { background: #F44336; opacity: 1; }
.del-text { color: #fff; font-size: 26rpx; font-weight: 700; }
.card {
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(16rpx);
  border-radius: 24rpx;
  padding: 26rpx 28rpx;
  box-shadow: 0 6rpx 28rpx rgba(255,184,0,0.06);
  border: 1rpx solid rgba(255,255,255,0.5);
  position: relative; z-index: 1;
  transition: transform 0.2s ease;
  &:active { transform: scale(0.98); }
}
.card.mine { border-left: 5rpx solid #FFB800; }
.header {
  display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10rpx;
}
.title {
  font-size: 30rpx; font-weight: 700; color: #333; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.status-tag {
  padding: 6rpx 16rpx; border-radius: 20rpx; font-size: 22rpx; font-weight: 600; flex-shrink: 0; margin-left: 12rpx;
}
.s-pending { background: rgba(255,152,0,0.12); color: #FF9800; }
.s-submitted { background: rgba(33,150,243,0.12); color: #2196F3; }
.s-approved { background: rgba(76,175,80,0.12); color: #4CAF50; }
.s-rejected { background: rgba(244,67,54,0.12); color: #F44336; }
.s-expired { background: rgba(158,158,158,0.12); color: #9E9E9E; }
.desc {
  font-size: 24rpx; color: #999; margin-bottom: 12rpx; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.meta { display: flex; align-items: center; gap: 10rpx; margin-bottom: 14rpx; }
.tag {
  padding: 4rpx 14rpx; border-radius: 12rpx; font-size: 22rpx; color: #fff; font-weight: 600;
}
.type-tag { background: rgba(255,184,0,0.15); color: #FFB800; }
.footer { display: flex; justify-content: space-between; }
.who { font-size: 22rpx; color: #ccc; }
.time { font-size: 22rpx; color: #ddd; }
.action-btn {
  position: absolute; bottom: 26rpx; right: 28rpx;
  padding: 12rpx 28rpx; border-radius: 28rpx; font-size: 24rpx; font-weight: 700;
}
.action-btn.s-pending { background: linear-gradient(135deg, #FFB800, #FFCC00); color: #fff; box-shadow: 0 4rpx 14rpx rgba(255,184,0,0.3); }
.action-btn.s-rejected { background: linear-gradient(135deg, #FF9800, #FFB74D); color: #fff; box-shadow: 0 4rpx 14rpx rgba(255,152,0,0.3); }
.action-btn.s-submitted { background: linear-gradient(135deg, #4CAF50, #66BB6A); color: #fff; box-shadow: 0 4rpx 14rpx rgba(76,175,80,0.3); }
</style>
