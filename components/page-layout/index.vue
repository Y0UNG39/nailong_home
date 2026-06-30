<script setup lang="ts">
interface Props {
  padBottom?: boolean
  stagger?: boolean
}
withDefaults(defineProps<Props>(), { padBottom: true, stagger: true })
</script>

<template>
  <view class="layout" :class="{ 'pad-bottom': padBottom, stagger: stagger }">
    <slot />
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.layout {
  padding: $space-lg 28rpx;
  padding-top: calc(#{$space-lg} + env(safe-area-inset-top));
  min-height: 100vh;
  position: relative;
  z-index: 1;
}

.pad-bottom {
  padding-bottom: calc(80rpx + env(safe-area-inset-bottom));
}

/* 交错进入动画子元素 */
.stagger {
  animation: pageEnter 0.6s $ease-out-quart both;
}

@keyframes pageEnter {
  from { opacity: 0; transform: translateY(20rpx); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
