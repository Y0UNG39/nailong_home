<script setup lang="ts">
import { ref } from 'vue'
import { GACHA_COST } from '@/utils/constants'
import { callFunction } from '@/utils/auth'

interface Props { coupleId?: string | null }
const props = defineProps<Props>()
const emit = defineEmits<{ drawComplete: [result: any] }>()

const spinning = ref(false)
const showResult = ref(false)
const result = ref<any>(null)
const balls = ref(Array.from({ length: 6 }, (_, i) => i))

async function onDraw() {
  if (spinning.value || !props.coupleId) return
  spinning.value = true
  balls.value = balls.value.sort(() => Math.random() - 0.5)
  try {
    const res = await callFunction('gachaDraw', { coupleId: props.coupleId })
    result.value = res.result
    showResult.value = true
    emit('drawComplete', res.result)
  } catch { /* handled by callFunction */ }
  spinning.value = false
}

function closeResult() { showResult.value = false }
</script>

<template>
  <view class="gacha">
    <text class="gacha-title">🎰 扭蛋机</text>
    <text class="gacha-sub">{{ GACHA_COST }}币一次，试试手气吧</text>

    <!-- 扭蛋机外观 -->
    <view class="machine">
      <view class="dome" :class="{ shaking: spinning }">
        <view class="ball" v-for="i in balls" :key="i" :style="{ '--i': i }" />
      </view>
      <view class="base">
        <view class="window">
          <view class="w-ball" v-for="j in 3" :key="j" :class="{ spin: spinning }" />
        </view>
      </view>
      <view class="chute" />
    </view>

    <view class="draw-btn" :class="{ disabled: spinning }" @tap="onDraw">
      <text>{{ spinning ? '🎰 旋转中...' : '🎰 扭一次 · ' + GACHA_COST + '币' }}</text>
    </view>

    <!-- 结果弹窗 -->
    <view class="result-overlay" v-if="showResult" @tap="closeResult">
      <view class="result-card" @tap.stop>
        <text class="r-icon">{{ result?.icon || '🎁' }}</text>
        <text class="r-label">{{ result?.label || '' }}</text>
        <text class="r-desc">{{ result?.description || '' }}</text>
        <view class="close-btn" @tap="closeResult">
          <text>收下啦</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.gacha {
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(20rpx);
  border-radius: 28rpx;
  padding: 32rpx 28rpx;
  box-shadow: 0 8rpx 36rpx rgba(255,184,0,0.08);
  border: 1rpx solid rgba(255,255,255,0.6);
  display: flex; flex-direction: column; align-items: center;
  margin-bottom: 24rpx;
}
.gacha-title { font-size: 34rpx; font-weight: 800; color: #333; }
.gacha-sub { font-size: 24rpx; color: #bbb; margin-top: 6rpx; margin-bottom: 24rpx; }
.machine { display: flex; flex-direction: column; align-items: center; margin-bottom: 24rpx; }
.dome {
  width: 220rpx; height: 180rpx; border-radius: 140rpx 140rpx 8rpx 8rpx;
  background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,212,79,0.2));
  border: 4rpx solid rgba(255,184,0,0.25); position: relative; overflow: hidden;
}
.dome.shaking { animation: shake 0.3s ease-in-out infinite; }
@keyframes shake {
  0%,100% { transform: translateX(0); }
  25% { transform: translateX(-6rpx) rotate(-2deg); }
  75% { transform: translateX(6rpx) rotate(2deg); }
}
.ball {
  position: absolute; width: 28rpx; height: 28rpx; border-radius: 50%;
  animation: bFloat 2s ease-in-out infinite;
  animation-delay: calc(var(--i) * 0.3s);
}
.ball:nth-child(odd) { background: radial-gradient(circle at 30% 30%, #FFB800, #E85D72); top: calc(20rpx + var(--i) * 24rpx); left: calc(20rpx + var(--i) * 28rpx); }
.ball:nth-child(even) { background: radial-gradient(circle at 30% 30%, #FFD54F, #FFCC00); top: calc(40rpx + var(--i) * 18rpx); left: calc(40rpx + var(--i) * 22rpx); }
@keyframes bFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10rpx); } }

.base {
  width: 120rpx; height: 60rpx; background: linear-gradient(180deg, rgba(255,184,0,0.15), rgba(255,184,0,0.05));
  border-radius: 0 0 20rpx 20rpx; border: 3rpx solid rgba(255,184,0,0.2); border-top: none;
  display: flex; align-items: center; justify-content: center;
}
.window { display: flex; gap: 10rpx; }
.w-ball {
  width: 18rpx; height: 18rpx; border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #FFB800, #E85D72);
}
.w-ball.spin { animation: wbSpin 0.4s linear infinite; }
@keyframes wbSpin { 0% { transform: translateY(0); opacity: 1; } 50% { transform: translateY(-16rpx); opacity: 0.3; } 100% { transform: translateY(0); opacity: 1; } }
.chute {
  width: 40rpx; height: 24rpx; background: rgba(255,184,0,0.1); border-radius: 0 0 8rpx 8rpx;
}
.draw-btn {
  padding: 20rpx 56rpx; border-radius: 48rpx;
  background: linear-gradient(135deg, #FFB800, #FFCC00);
  box-shadow: 0 8rpx 24rpx rgba(255,184,0,0.3);
  font-size: 28rpx; font-weight: 700; color: #fff;
}
.draw-btn.disabled { opacity: 0.5; }
/* Result Overlay */
.result-overlay {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(0,0,0,0.4); backdrop-filter: blur(8rpx);
  display: flex; align-items: center; justify-content: center;
}
.result-card {
  background: #fff; border-radius: 32rpx; padding: 52rpx 48rpx;
  display: flex; flex-direction: column; align-items: center;
  box-shadow: 0 16rpx 64rpx rgba(0,0,0,0.2);
  animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  max-width: 500rpx; margin: 40rpx;
}
@keyframes popIn { from { transform: scale(0.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.r-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.r-label { font-size: 36rpx; font-weight: 800; color: #333; margin-bottom: 8rpx; }
.r-desc { font-size: 26rpx; color: #999; margin-bottom: 36rpx; text-align: center; }
.close-btn {
  padding: 18rpx 64rpx; border-radius: 44rpx;
  background: linear-gradient(135deg, #FFB800, #FFCC00);
  font-size: 28rpx; font-weight: 700; color: #fff;
  box-shadow: 0 6rpx 20rpx rgba(255,184,0,0.3);
}
</style>
