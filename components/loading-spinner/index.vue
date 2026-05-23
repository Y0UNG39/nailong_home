<script setup lang="ts">
interface Props {
  text?: string
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  text: '加载中...',
  size: 'md'
})

const sizeMap = { sm: 36, md: 56, lg: 80 }
const wh = computed(() => sizeMap[props.size] + 'rpx')
</script>

<template>
  <view class="spinner-wrap">
    <view class="spinner" :style="{ width: wh, height: wh }">
      <view class="ring" />
      <view class="ring ring2" />
    </view>
    <text class="text" v-if="text">{{ text }}</text>
  </view>
</template>

<style lang="scss" scoped>
.spinner-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}
.spinner {
  position: relative;
}
.ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 5rpx solid rgba(255, 184, 0, 0.12);
  border-top-color: #FFB800;
  animation: spin 0.8s linear infinite;
}
.ring2 {
  inset: 10rpx;
  border-width: 4rpx;
  border-top-color: #FFD54F;
  animation-duration: 1.2s;
  animation-direction: reverse;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.text {
  margin-top: 24rpx;
  font-size: 26rpx;
  color: #999;
}
</style>
