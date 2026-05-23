<script setup lang="ts">
import { DREAM_CATEGORIES } from '@/utils/constants'
import { ref, computed } from 'vue'

interface Dream {
  _id: string; title: string; image?: string; category: string
  status: 'dreaming' | 'completed'; likes: string[]
  creatorNickname?: string
}

interface Props { dream: Dream; myOpenid?: string }

const props = withDefaults(defineProps<Props>(), { myOpenid: '' })
const emit = defineEmits<{ tap: [dream: Dream]; like: [dream: Dream] }>()

const catInfo = computed(() => {
  return DREAM_CATEGORIES.find(c => c.key === props.dream.category) || DREAM_CATEGORIES[0]
})

const isMutual = computed(() => props.dream.likes?.length >= 2)
const liked = computed(() => props.dream.likes?.includes(props.myOpenid))

function onLike() { emit('like', props.dream) }
function onTap() { emit('tap', props.dream) }
</script>

<template>
  <view class="card" :class="{ completed: dream.status === 'completed' }" @tap="onTap">
    <view class="img-area">
      <image class="img" v-if="dream.image" :src="dream.image" mode="aspectFill" />
      <text class="img-placeholder" v-else>{{ catInfo.icon }}</text>
      <view class="status-badge" :class="dream.status">
        <text>{{ dream.status === 'completed' ? '✅' : '⭐' }}</text>
      </view>
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
    </view>
  </view>
</template>

<style lang="scss" scoped>
.card {
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(16rpx);
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 6rpx 28rpx rgba(255,184,0,0.06);
  border: 1rpx solid rgba(255,255,255,0.5);
  transition: transform 0.2s;
  &:active { transform: scale(0.98); }
}
.card.completed { opacity: 0.65; }
.card.completed .img-area { filter: grayscale(0.5); }
.img-area {
  height: 200rpx; background: linear-gradient(135deg, #FFF8E1, #FFE082);
  display: flex; align-items: center; justify-content: center; position: relative;
}
.img { width: 100%; height: 100%; }
.img-placeholder { font-size: 72rpx; }
.status-badge {
  position: absolute; top: 16rpx; right: 16rpx;
  padding: 6rpx 14rpx; border-radius: 20rpx; font-size: 22rpx;
}
.status-badge.dreaming { background: rgba(255,215,0,0.25); }
.status-badge.completed { background: rgba(76,175,80,0.25); }
.body { padding: 18rpx 20rpx; }
.title-row { display: flex; align-items: center; margin-bottom: 12rpx; }
.title { font-size: 28rpx; font-weight: 700; color: #333; flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.mutual-badge {
  padding: 4rpx 14rpx; border-radius: 16rpx;
  background: linear-gradient(135deg, #FFB800, #FFCC00);
  font-size: 20rpx; color: #fff; font-weight: 600; flex-shrink: 0; margin-left: 8rpx;
}
.bottom-row { display: flex; align-items: center; justify-content: space-between; }
.cat-tag { padding: 4rpx 14rpx; border-radius: 12rpx; font-size: 22rpx; font-weight: 600; }
.like-btn { display: flex; align-items: center; gap: 4rpx; }
.like-count { font-size: 22rpx; color: #bbb; }
</style>
