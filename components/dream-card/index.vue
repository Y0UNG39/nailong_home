<script setup lang="ts">
import { DREAM_CATEGORIES } from '@/utils/constants'
import { formatDate } from '@/utils/date'
import { ref, computed } from 'vue'

interface Dream {
  _id: string; title: string; image?: string; category: string
  status: 'dreaming' | 'completed'; likes: string[]
  creatorNickname?: string
}

interface Props { dream: Dream; myOpenid?: string; showDelete?: boolean }

const props = withDefaults(defineProps<Props>(), { myOpenid: '', showDelete: false })
const emit = defineEmits<{ tap: [dream: Dream]; like: [dream: Dream]; delete: [dream: Dream]; complete: [dream: Dream]; edit: [dream: Dream] }>()

const catInfo = computed(() => {
  return DREAM_CATEGORIES.find(c => c.key === props.dream.category) || DREAM_CATEGORIES[0]
})

const isMutual = computed(() => props.dream.likes?.length >= 2)
const liked = computed(() => props.dream.likes?.includes(props.myOpenid))
const dreamTime = computed(() => {
  if (props.dream.status === 'completed' && props.dream.completedAt) return '完成于 ' + formatDate(props.dream.completedAt)
  if (props.dream.createdAt) return '添加于 ' + formatDate(props.dream.createdAt)
  return ''
})

function onLike() { emit('like', props.dream) }
function onTap() { emit('tap', props.dream) }
function onDelete() { emit('delete', props.dream) }
function onEdit() { emit('edit', props.dream) }
function onToggleComplete() { emit('complete', props.dream) }
</script>

<template>
  <view class="card" :class="{ completed: dream.status === 'completed' }" @tap="onTap">
    <view class="img-area">
      <image class="img" v-if="dream.image" :src="dream.image" mode="aspectFill" />
      <text class="img-placeholder" v-else>{{ catInfo.icon }}</text>
      <view class="status-badge" :class="dream.status" @tap.stop="onToggleComplete">
        <text>{{ dream.status === 'completed' ? '✅' : '⭐' }}</text>
      </view>
      <view class="action-btn" v-if="showDelete && dream.status !== 'completed'" @tap.stop="onEdit"><text>✎</text></view>
      <view class="action-btn" :class="{ del: showDelete && dream.status !== 'completed' }" v-if="showDelete" @tap.stop="onDelete"><text>✕</text></view>
    </view>
    <view class="body">
      <view class="title-row">
        <text class="title">{{ dream.title }}</text>
        <view class="mutual-badge" v-if="isMutual">共同愿望</view>
      </view>
      <view class="bottom-row">
        <view class="cat-tag" :style="{ background: catInfo.color + '18', color: catInfo.color }">
          <text>{{ catInfo.label }}</text>
        </view>
        <view class="like-btn" @tap.stop="onLike">
          <text>{{ liked ? '❤️' : '🤍' }}</text>
          <text class="like-count">{{ dream.likes?.length || 0 }}</text>
        </view>
      </view>
      <text class="dream-time" v-if="dreamTime">{{ dreamTime }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.card {
  @include glass-card;
  overflow: hidden;
  transition: transform 0.2s;
  &:active { transform: scale(0.98); }
}
.card.completed { opacity: 0.65; }
.card.completed .img-area { filter: grayscale(0.5); }
.img-area {
  height: 200rpx;
  background: linear-gradient(135deg, $primary-bg, $primary-light);
  display: flex; align-items: center; justify-content: center;
  position: relative;
}
.img { width: 100%; height: 100%; }
.img-placeholder { font-size: 72rpx; }
.status-badge {
  position: absolute; top: 16rpx; right: 16rpx;
  padding: 6rpx 14rpx; border-radius: 20rpx; font-size: $text-xs;
}
.status-badge.dreaming { background: rgba(255,215,0,0.25); }
.status-badge.completed { background: rgba(76,175,80,0.25); }
.action-btn {
  position: absolute; top: 10rpx; left: 10rpx;
  width: 56rpx; height: 56rpx; border-radius: 50%;
  background: rgba(0,0,0,0.35);
  display: flex; align-items: center; justify-content: center;
  font-size: 24rpx; color: $white;
}
.action-btn.del { left: 72rpx; background: rgba(33,150,243,0.7); }
.body { padding: 18rpx 20rpx; }
.title-row { display: flex; align-items: center; margin-bottom: 12rpx; }
.title {
  font-size: 28rpx; font-weight: 700; color: $text; flex: 1;
  overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
}
.mutual-badge {
  padding: 4rpx 14rpx; border-radius: 16rpx;
  background: $gradient-primary;
  font-size: $text-xs; color: $white; font-weight: 600;
  flex-shrink: 0; margin-left: 8rpx;
}
.bottom-row { display: flex; align-items: center; justify-content: space-between; }
.cat-tag { padding: 4rpx 14rpx; border-radius: 12rpx; font-size: $text-xs; font-weight: 600; }
.like-btn { display: flex; align-items: center; gap: 4rpx; }
.like-count { font-size: $text-xs; color: $text-faint; }
.dream-time { font-size: $text-xs; color: $text-faint; margin-top: 8rpx; display: block; }
</style>
