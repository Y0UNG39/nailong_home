<script setup lang="ts">
import { ref, onMounted } from 'vue'

// ---- 设置 ----
const maxAmount = ref(100)
const exponent = ref(3)
const showSettings = ref(false)

// ---- 卡片 ----
const winningNum = ref(0)
interface Cell { num: number; amount: number; revealed: boolean }
const cells = ref<Cell[][]>([])
const finished = ref(false)
const totalWin = ref(0)
const totalRevealed = ref(0)

// ---- 颜色 ----
const COLORS = ['#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF','#FF9F40',
  '#48BB78','#F6AD55','#63B3ED','#B794F4','#FC8181','#68D391','#FBD38D',
  '#FF6B6B','#C9CBCF','#E7E9ED']

function loadSettings() {
  try {
    const s = uni.getStorageSync('scratch_settings')
    if (s) { maxAmount.value = s.maxAmount || 100; exponent.value = s.exponent || 3 }
  } catch {}
}
function saveSettings() {
  uni.setStorageSync('scratch_settings', { maxAmount: maxAmount.value, exponent: exponent.value })
  showSettings.value = false
  generateCard()
}

function randAmount(): number {
  const raw = Math.pow(Math.random(), exponent.value)
  return Math.max(1, Math.round(maxAmount.value * raw))
}

function generateCard() {
  finished.value = false
  totalWin.value = 0
  totalRevealed.value = 0
  winningNum.value = Math.floor(Math.random() * 10)
  const grid: Cell[][] = []
  for (let r = 0; r < 4; r++) {
    grid.push([])
    for (let c = 0; c < 4; c++) {
      grid[r].push({ num: Math.floor(Math.random() * 10), amount: randAmount(), revealed: false })
    }
  }
  cells.value = grid
}

function revealCell(row: number, col: number) {
  if (finished.value) return
  const cell = cells.value[row]?.[col]
  if (!cell || cell.revealed) return
  cell.revealed = true
  totalRevealed.value++
  if (cell.num === winningNum.value) totalWin.value += cell.amount
  if (totalRevealed.value >= 16) finished.value = true
}

onMounted(() => { loadSettings(); generateCard() })
</script>

<template>
  <view class="sc-wrap">
    <!-- 头部 -->
    <view class="sc-header">
      <text class="sc-title">刮刮卡</text>
      <text class="sc-gear" @tap="showSettings = true">⚙️ 设置</text>
    </view>

    <!-- 中奖号 -->
    <view class="sc-wn">
      <text class="sc-wn-label">🎯 中奖号</text>
      <text class="sc-wn-num">{{ winningNum }}</text>
      <text class="sc-wn-hint">刮到相同数字即中奖</text>
    </view>

    <!-- 4×4 格子 -->
    <view class="sc-grid">
      <view class="sc-row" v-for="(row, ri) in cells" :key="ri">
        <view
          class="sc-cell"
          v-for="(cell, ci) in row" :key="ci"
          @tap="revealCell(ri, ci)"
        >
          <!-- 刮开后 -->
          <view v-if="cell.revealed" class="sc-cell-inner">
            <view class="sc-cell-top">
              <text class="sc-cell-amount">¥{{ cell.amount }}</text>
            </view>
            <view class="sc-cell-bot" :class="{ win: cell.num === winningNum }">
              <text class="sc-cell-num">{{ cell.num }}</text>
            </view>
            <view v-if="cell.num === winningNum" class="sc-cell-win">✓</view>
          </view>
          <!-- 涂层 -->
          <view v-else class="sc-coat">
            <text class="sc-coat-q">?</text>
            <text class="sc-coat-hint">刮开</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 结果 -->
    <view class="sc-result" v-if="finished">
      <text v-if="totalWin > 0" class="sc-result-text">🎉 恭喜！你赢了 <text class="sc-win-amount">¥{{ totalWin }}</text></text>
      <text v-else class="sc-result-text">😅 再接再厉</text>
    </view>
    <view class="sc-result" v-else>
      <text class="sc-result-placeholder">已刮 {{ totalRevealed }}/16</text>
    </view>

    <!-- 按钮 -->
    <view class="sc-btn-row">
      <view class="sc-btn" :class="{ disabled: !finished }" @tap="generateCard">
        <text class="sc-btn-text">{{ finished ? '🔄 再来一张' : '继续刮 ⇡' }}</text>
      </view>
    </view>

    <!-- 设置弹窗 -->
    <view class="sc-modal" v-if="showSettings" @tap="showSettings = false">
      <view class="sc-modal-body" @tap.stop>
        <text class="sc-modal-title">刮刮卡设置</text>

        <view class="sc-field">
          <text class="sc-label">奖金上限 ¥{{ maxAmount }}</text>
          <view class="sc-slider-row">
            <text class="sc-slider-val">10</text>
            <slider
              class="sc-slider"
              :min="10"
              :max="500"
              :step="10"
              :value="maxAmount"
              @change="(e: any) => maxAmount = e.detail.value"
              activeColor="#FF9800"
              backgroundColor="#E0E0E0"
              block-size="20"
            />
            <text class="sc-slider-val">500</text>
          </view>
        </view>

        <view class="sc-field">
          <text class="sc-label">难度：{{ exponent }}（越高越难中大奖）</text>
          <view class="sc-slider-row">
            <text class="sc-slider-val">易</text>
            <slider
              class="sc-slider"
              :min="1"
              :max="8"
              :step="0.5"
              :value="exponent"
              @change="(e: any) => exponent = e.detail.value"
              activeColor="#FF9800"
              backgroundColor="#E0E0E0"
              block-size="20"
            />
            <text class="sc-slider-val">难</text>
          </view>
          <text class="sc-hint">越难越少出现大奖</text>
        </view>

        <view class="sc-modal-btns">
          <view class="sc-mbtn cancel" @tap="showSettings = false">取消</view>
          <view class="sc-mbtn save" @tap="saveSettings">保存并重开</view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.sc-wrap { padding: 16rpx 0; }

.sc-header { display: flex; justify-content: space-between; align-items: center; padding: 0 16rpx 12rpx; }
.sc-title { font-size: 30rpx; font-weight: 700; color: #333; }
.sc-gear { font-size: 22rpx; color: #FF9800; padding: 8rpx 16rpx; background: rgba(255,152,0,0.08); border-radius: 16rpx; }

.sc-wn { display: flex; align-items: center; justify-content: center; gap: 16rpx; padding: 16rpx 0; }
.sc-wn-label { font-size: 26rpx; color: #666; }
.sc-wn-num { font-size: 48rpx; font-weight: 800; color: #E53935; }
.sc-wn-hint { font-size: 20rpx; color: #bbb; }

/* 网格 */
.sc-grid { padding: 0 20rpx; }
.sc-row { display: flex; gap: 10rpx; margin-bottom: 10rpx; }
.sc-cell { flex: 1; aspect-ratio: 1; }

.sc-cell-inner {
  width: 100%; height: 100%; border-radius: 16rpx; background: #fff;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); position: relative; overflow: hidden;
}
.sc-cell-top { flex: 1; display: flex; align-items: flex-end; padding-bottom: 4rpx; }
.sc-cell-amount { font-size: 20rpx; color: #795548; }
.sc-cell-bot { flex: 1; display: flex; align-items: flex-start; }
.sc-cell-bot.win { background: rgba(76,175,80,0.08); border-radius: 0 0 16rpx 16rpx; width: 100%; justify-content: center; }
.sc-cell-num { font-size: 28rpx; font-weight: 700; color: #333; }
.sc-cell-win { position: absolute; top: 4rpx; right: 8rpx; font-size: 18rpx; color: #4CAF50; font-weight: 700; }

/* 涂层 */
.sc-coat {
  width: 100%; height: 100%; border-radius: 16rpx;
  background: linear-gradient(135deg, #BDBDBD 20%, #9E9E9E 80%);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.15);
}
.sc-coat-q { font-size: 36rpx; color: #fff; font-weight: 700; text-shadow: 0 2rpx 4rpx rgba(0,0,0,0.2); }
.sc-coat-hint { font-size: 16rpx; color: rgba(255,255,255,0.7); margin-top: 4rpx; }

/* 结果 */
.sc-result { text-align: center; padding: 12rpx 0; height: 52rpx; display: flex; align-items: center; justify-content: center; }
.sc-result-text { font-size: 28rpx; color: #333; }
.sc-win-amount { font-size: 36rpx; font-weight: 800; color: #E53935; }
.sc-result-placeholder { font-size: 22rpx; color: #ccc; }

/* 按钮 */
.sc-btn-row { display: flex; justify-content: center; padding: 8rpx 0 16rpx; }
.sc-btn { display: inline-flex; align-items: center; justify-content: center; padding: 16rpx 48rpx; background: linear-gradient(135deg, #FF9800, #FFB74D); border-radius: 44rpx; }
.sc-btn.disabled { opacity: 0.35; }
.sc-btn-text { font-size: 28rpx; color: #fff; font-weight: 700; }

/* 设置弹窗 */
.sc-modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.45); z-index: 100; display: flex; align-items: center; justify-content: center; }
.sc-modal-body { width: 640rpx; background: #fff; border-radius: 24rpx; padding: 36rpx 32rpx; }
.sc-modal-title { font-size: 32rpx; font-weight: 700; color: #333; display: block; margin-bottom: 24rpx; }
.sc-field { margin-bottom: 24rpx; }
.sc-label { font-size: 26rpx; color: #666; margin-bottom: 8rpx; display: block; }
.sc-slider-row { display: flex; align-items: center; gap: 12rpx; }
.sc-slider-val { font-size: 20rpx; color: #999; flex-shrink: 0; width: 32rpx; text-align: center; }
.sc-slider { flex: 1; }
.sc-hint { font-size: 20rpx; color: #bbb; margin-top: 4rpx; display: block; }
.sc-modal-btns { display: flex; gap: 16rpx; margin-top: 8rpx; }
.sc-mbtn { flex: 1; text-align: center; padding: 20rpx 0; border-radius: 16rpx; font-size: 28rpx; font-weight: 600; }
.sc-mbtn.cancel { background: #F5F5F5; color: #666; }
.sc-mbtn.save { background: linear-gradient(135deg, #FF9800, #FFB74D); color: #fff; }
</style>
