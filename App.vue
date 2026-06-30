<script>
export default {
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({ env: 'cloudbase-d2gao37vp8879bc2c', traceUser: true })
    }
  }
}
</script>

<template>
  <!-- 全局粒子背景层 -->
  <view class="global-ambient">
    <view class="particle p1" />
    <view class="particle p2" />
    <view class="particle p3" />
    <view class="particle p4" />
    <view class="particle p5" />
    <view class="particle p6" />
    <view class="particle p7" />
    <view class="particle p8" />
    <view class="particle p9" />
    <view class="particle p10" />
  </view>
</template>

<style lang="scss">
@import '@/uni.scss';

/* ---- 全局粒子背景 ---- */
.global-ambient {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
  opacity: 0.5;
}

.particle {
  position: absolute;
  border-radius: 50%;
  will-change: transform, opacity;
}

/* 爱心形粒子用 emoji 替代 */
.particle {
  font-size: 0;
}

.particle::before {
  font-size: 24rpx;
  position: absolute;
}

.p1 { animation: particleRise 6s $ease-out-quart infinite; left: 10%; bottom: -20%; }
.p1::before { content: '✨'; }
.p2 { animation: particleRise 8s $ease-out-quart infinite 1s; left: 25%; bottom: -20%; }
.p2::before { content: '💛'; }
.p3 { animation: particleRise 7s $ease-out-quart infinite 0.5s; left: 40%; bottom: -20%; }
.p3::before { content: '✨'; }
.p4 { animation: particleRise 9s $ease-out-quart infinite 2s; left: 55%; bottom: -20%; }
.p4::before { content: '🌟'; }
.p5 { animation: particleRise 6.5s $ease-out-quart infinite 1.5s; left: 70%; bottom: -20%; }
.p5::before { content: '💛'; }
.p6 { animation: particleRise 7.5s $ease-out-quart infinite 0.3s; left: 85%; bottom: -20%; }
.p6::before { content: '✨'; }
.p7 { animation: particleRise 8.5s $ease-out-quart infinite 2.5s; left: 15%; bottom: -20%; }
.p7::before { content: '⭐'; }
.p8 { animation: particleRise 6.8s $ease-out-quart infinite 1.8s; left: 50%; bottom: -20%; }
.p8::before { content: '💛'; }
.p9 { animation: particleRise 9.2s $ease-out-quart infinite 0.8s; left: 75%; bottom: -20%; }
.p9::before { content: '✨'; }
.p10 { animation: particleRise 7.2s $ease-out-quart infinite 3s; left: 35%; bottom: -20%; }
.p10::before { content: '💛'; }

/* ---- 全局通用动画类 ---- */
.stagger-enter {
  animation: staggerIn 0.5s $ease-out-quart both;
}
.stagger-enter:nth-child(1) { animation-delay: 0.05s; }
.stagger-enter:nth-child(2) { animation-delay: 0.12s; }
.stagger-enter:nth-child(3) { animation-delay: 0.19s; }
.stagger-enter:nth-child(4) { animation-delay: 0.26s; }
.stagger-enter:nth-child(5) { animation-delay: 0.33s; }
.stagger-enter:nth-child(6) { animation-delay: 0.40s; }
.stagger-enter:nth-child(7) { animation-delay: 0.47s; }
.stagger-enter:nth-child(8) { animation-delay: 0.54s; }
.stagger-enter:nth-child(9) { animation-delay: 0.61s; }
.stagger-enter:nth-child(10) { animation-delay: 0.68s; }
</style>
