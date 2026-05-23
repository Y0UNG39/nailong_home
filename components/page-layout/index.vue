<script setup lang="ts">
// 通用页面布局组件 —— 提供统一的 padding 和背景
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
.layout {
  padding: 24rpx 28rpx;
  min-height: 100vh;
}
.pad-bottom {
  padding-bottom: 80rpx;
}
</style>
