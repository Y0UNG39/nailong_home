<script setup lang="ts">
import { computed } from 'vue'
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

interface Props { task: Task; showMeta?: boolean }

const props = withDefaults(defineProps<Props>(), { showMeta: true })
const emit = defineEmits<{ tap: [task: Task]; action: [task: Task, action: string] }>()

const diff = computed(() => TASK_DIFFICULTY[props.task.difficulty])
const typeLabel = computed(() => TASK_TYPE[props.task.type])

const statusCfg = computed(() => {
  const m: Record<string, { label: string; btn?: string; btnAction?: string; cls: string }> = {
    pending: { label: '进行中', btn: '去打卡', btnAction: 'checkin', cls: 's-pending' },
    submitted: { label: '待审核', cls: 's-submitted' },
    approved: { label: '已完成', cls: 's-approved' },
    rejected: { label: '已退回', btn: '重新打卡', btnAction: 'recheckin', cls: 's-rejected' },
    expired: { label: '已过期', cls: 's-expired' }
  }
  return m[props.task.status] || m.pending
})

function onTap() { emit('tap', props.task) }
function onAction() {
  if (statusCfg.value.btnAction) {
    emit('action', props.task, statusCfg.value.btnAction)
  }
}
</script>

<template>
  <view class="card" @tap="onTap">
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
      <text class="deadline" v-if="task.deadline">截止 {{ task.deadline }}</text>
    </view>
    <view class="footer">
      <text class="who">{{ task.creatorNickname }} → {{ task.assigneeNickname }}</text>
      <text class="time">{{ timeAgo(task.createdAt) }}</text>
    </view>
    <view v-if="statusCfg.btn" class="action-btn" :class="statusCfg.cls" @tap.stop="onAction">
      <text>{{ statusCfg.btn }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.card {
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(16rpx);
  border-radius: 24rpx;
  padding: 26rpx 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 6rpx 28rpx rgba(255,184,0,0.06);
  border: 1rpx solid rgba(255,255,255,0.5);
  position: relative;
  transition: transform 0.2s;
  &:active { transform: scale(0.98); }
}
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
.deadline { font-size: 22rpx; color: #bbb; margin-left: auto; }
.footer { display: flex; justify-content: space-between; }
.who { font-size: 22rpx; color: #ccc; }
.time { font-size: 22rpx; color: #ddd; }
.action-btn {
  position: absolute; bottom: 26rpx; right: 28rpx;
  padding: 12rpx 28rpx; border-radius: 28rpx; font-size: 24rpx; font-weight: 700;
}
.action-btn.s-pending { background: linear-gradient(135deg, #FFB800, #FFCC00); color: #fff; box-shadow: 0 4rpx 14rpx rgba(255,184,0,0.3); }
.action-btn.s-rejected { background: linear-gradient(135deg, #FF9800, #FFB74D); color: #fff; box-shadow: 0 4rpx 14rpx rgba(255,152,0,0.3); }
</style>
