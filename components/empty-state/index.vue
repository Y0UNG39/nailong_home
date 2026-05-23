<script setup lang="ts">
interface Props {
  icon?: string
  text?: string
  subText?: string
  showBtn?: boolean
  btnText?: string
}

const props = withDefaults(defineProps<Props>(), {
  icon: '📭',
  text: '暂无内容',
  subText: '',
  showBtn: false,
  btnText: '去创建'
})

const emit = defineEmits<{ action: [] }>()
</script>

<template>
  <view class="empty">
    <view class="icon-circle">{{ icon }}</view>
    <text class="text">{{ text }}</text>
    <text class="sub" v-if="subText">{{ subText }}</text>
    <view v-if="showBtn" class="btn" @tap="emit('action')">
      <text class="btn-text">{{ btnText }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 48rpx 80rpx;
}
.icon-circle {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255,184,0,0.08), rgba(255,212,79,0.12));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64rpx;
  margin-bottom: 32rpx;
}
.text {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}
.sub {
  font-size: 24rpx;
  color: #bbb;
  margin-top: 10rpx;
}
.btn {
  margin-top: 36rpx;
  padding: 18rpx 56rpx;
  border-radius: 48rpx;
  background: linear-gradient(135deg, #FFB800, #FFCC00);
  box-shadow: 0 6rpx 20rpx rgba(255,184,0,0.3);
}
.btn-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
}
</style>
