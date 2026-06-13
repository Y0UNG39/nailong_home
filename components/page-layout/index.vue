<script setup lang="ts">
interface Props {
  padBottom?: boolean
}
withDefaults(defineProps<Props>(), { padBottom: true })
</script>

<template>
  <view class="layout" :class="{ 'pad-bottom': padBottom }">
    <slot />
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.layout {
  padding: $space-lg 28rpx;
  padding-top: calc(#{$space-lg} + env(safe-area-inset-top));
  min-height: 100vh;
}
.pad-bottom {
  padding-bottom: calc(80rpx + env(safe-area-inset-bottom));
}
</style>
