<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAppStore } from '@/store/index'

const store = useAppStore()
const activeTab = ref<'scratch' | 'dice' | 'slot'>('scratch')

// ---- 刮刮卡 ----
const scMax = ref(100)
const scExp = ref(3)
const scShowSet = ref(false)
const scWinNum = ref(0)
interface ScCell { num: number; amount: number; open: boolean }
const scGrid = ref<ScCell[][]>([])
const scDone = ref(false)
const scWin = ref(0)
const scOpen = ref(0)

function scLoadSet() { try { const s = uni.getStorageSync('scratch_settings'); if (s) { scMax.value = s.maxAmount || 100; scExp.value = s.exponent || 3 } } catch {} }
function scSaveSet() { uni.setStorageSync('scratch_settings', { maxAmount: scMax.value, exponent: scExp.value }); scShowSet.value = false; scGen() }
function scRand(): number { return Math.max(1, Math.round(scMax.value * Math.pow(Math.random(), scExp.value))) }
function scGen() {
  scDone.value = false; scWin.value = 0; scOpen.value = 0
  scWinNum.value = Math.floor(Math.random() * 10)
  const g: ScCell[][] = []
  for (let r = 0; r < 4; r++) { g.push([]); for (let c = 0; c < 4; c++) g[r].push({ num: Math.floor(Math.random() * 10), amount: scRand(), open: false }) }
  scGrid.value = g
}
function scTap(r: number, c: number) {
  if (scDone.value) return
  const cell = scGrid.value[r]?.[c]; if (!cell || cell.open) return
  cell.open = true; scOpen.value++
  if (cell.num === scWinNum.value) scWin.value += cell.amount
  if (scOpen.value >= 16) scDone.value = true
}

onMounted(() => { scLoadSet(); scGen() })

// ---- 骰子 ----
const diceCount = ref(2)
const diceValues = ref<number[]>([1, 1])
const diceRolling = ref(false)

function getDots(v: number): boolean[] {
  const d = [false,false,false,false,false,false,false,false,false]
  if (v===1) d[4]=true
  else if (v===2) { d[2]=d[6]=true }
  else if (v===3) { d[2]=d[4]=d[6]=true }
  else if (v===4) { d[0]=d[2]=d[6]=d[8]=true }
  else if (v===5) { d[0]=d[2]=d[4]=d[6]=d[8]=true }
  else if (v===6) { d[0]=d[2]=d[3]=d[5]=d[6]=d[8]=true }
  return d
}

function setDiceCount(n: number) {
  if (diceRolling.value) return
  diceCount.value = n
  diceValues.value = Array(n).fill(1)
}

function rollDice() {
  if (diceRolling.value) return
  diceRolling.value = true
  let count = 0
  const timer = setInterval(() => {
    diceValues.value = Array.from({length: diceCount.value}, () => Math.floor(Math.random()*6)+1)
    count++
    if (count >= 10) {
      clearInterval(timer)
      diceValues.value = Array.from({length: diceCount.value}, () => Math.floor(Math.random()*6)+1)
      diceRolling.value = false
    }
  }, 60)
}

// ---- 老虎机 ----
const SLOT_SYMBOLS = ['🍒', '🍋', '🍇', '🍉', '⭐']
const SLOT_WEIGHTS = [30, 25, 20, 15, 10]
const SLOT_TOTAL_WT = SLOT_WEIGHTS.reduce((a, b) => a + b, 0)
const SLOT_PAYOUTS_3 = [2, 3, 6, 12, 30]
const SLOT_PAYOUT_2 = 1

const slotBet = ref(10)
const slotReels = ref(['🍒', '🍒', '🍒'] as string[])
const slotSpinning = ref(false)
const slotResult = ref('')
const slotWinAmount = ref(0)
const slotShowResult = ref(false)
const slotSpinPhase = ref([false, false, false])

function slotSetBet(amount: number) {
  if (slotSpinning.value) return
  slotBet.value = amount
}

function slotWeightedRandom(): string {
  const rand = Math.random() * SLOT_TOTAL_WT
  let sum = 0
  for (let i = 0; i < SLOT_SYMBOLS.length; i++) {
    sum += SLOT_WEIGHTS[i]
    if (rand <= sum) return SLOT_SYMBOLS[i]
  }
  return SLOT_SYMBOLS[0]
}

function slotSpin() {
  if (slotSpinning.value) return
  if (store.balance < slotBet.value) {
    const deficit = slotBet.value - store.balance
    store.addBalance(deficit)
    wx.cloud.callFunction({
      name: 'coinChange',
      data: { coupleId: store.coupleId, amount: deficit, type: 'slot_bailout', description: '余额不足自动补贴' }
    })
    uni.showToast({ title: `已补贴${deficit}币`, icon: 'none' })
  }

  store.addBalance(-slotBet.value)
  wx.cloud.callFunction({
    name: 'coinChange',
    data: { coupleId: store.coupleId, amount: -slotBet.value, type: 'slot_bet', description: '老虎机投注' }
  })
  slotSpinning.value = true
  slotShowResult.value = false
  slotResult.value = ''
  slotWinAmount.value = 0

  const final = [slotWeightedRandom(), slotWeightedRandom(), slotWeightedRandom()]
  slotSpinPhase.value = [true, true, true]

  const delays = [800, 1400, 2000]
  for (let i = 0; i < 3; i++) {
    const reelIdx = i
    const flicker = setInterval(() => {
      slotReels.value[reelIdx] = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]
    }, 60)

    setTimeout(() => {
      clearInterval(flicker)
      slotReels.value[reelIdx] = final[reelIdx]
      slotSpinPhase.value[reelIdx] = false

      if (reelIdx === 2) {
        setTimeout(() => slotSettle(final), 300)
      }
    }, delays[i])
  }
}

function slotSettle(final: string[]) {
  let win = 0
  let msg = ''

  if (final[0] === final[1] && final[1] === final[2]) {
    const idx = SLOT_SYMBOLS.indexOf(final[0])
    win = slotBet.value * SLOT_PAYOUTS_3[idx]
    msg = `🎉 ${final[0]}${final[0]}${final[0]} +${win}币`
  } else if (final[0] === final[1] || final[1] === final[2] || final[0] === final[2]) {
    win = Math.floor(slotBet.value * SLOT_PAYOUT_2)
    msg = `✨ 两个相同 +${win}币`
  } else {
    msg = `😅 再来一次`
  }

  if (win > 0) {
    store.addBalance(win)
    wx.cloud.callFunction({
      name: 'coinChange',
      data: { coupleId: store.coupleId, amount: win, type: 'slot_win', description: `老虎机中奖 ${msg}` }
    })
  }
  slotWinAmount.value = win
  slotResult.value = msg
  slotShowResult.value = true
  slotSpinning.value = false
}

</script>

<template>
  <page-layout>
    <view class="sub-tabs">
      <view class="sub-tab" :class="{ active: activeTab === 'scratch' }" @tap="activeTab = 'scratch'">💳 刮刮卡</view>
      <view class="sub-tab" :class="{ active: activeTab === 'dice' }" @tap="activeTab = 'dice'">🎲 骰子</view>
      <view class="sub-tab" :class="{ active: activeTab === 'slot' }" @tap="activeTab = 'slot'">🎰 老虎机</view>
    </view>

    <!-- 刮刮卡 -->
    <view class="tab-content" v-if="activeTab === 'scratch'">
      <view class="sc-header">
        <text class="sc-title">刮刮卡</text>
        <text class="sc-gear" @tap="scShowSet = true">⚙️ 设置</text>
      </view>
      <view class="sc-wn">
        <text class="sc-wn-label">🎯 中奖号</text>
        <text class="sc-wn-num">{{ scWinNum }}</text>
        <text class="sc-wn-hint">刮到相同数字即中奖</text>
      </view>
      <view class="sc-grid">
        <view class="sc-row" v-for="(row, ri) in scGrid" :key="ri">
          <view class="sc-cell" v-for="(cell, ci) in row" :key="ci" @tap="scTap(ri, ci)">
            <view v-if="cell.open" class="sc-inner">
              <view class="sc-top"><text class="sc-amount">¥{{ cell.amount }}</text></view>
              <view class="sc-bot" :class="{ win: cell.num === scWinNum }">
                <text class="sc-num">{{ cell.num }}</text>
              </view>
              <text v-if="cell.num === scWinNum" class="sc-tick">✓</text>
            </view>
            <view v-else class="sc-coat">
              <text class="sc-coat-q">?</text>
              <text class="sc-coat-h">刮开</text>
            </view>
          </view>
        </view>
      </view>
      <view class="sc-res" v-if="scDone">
        <text v-if="scWin > 0" class="sc-res-t">🎉 赢了 ¥{{ scWin }}</text>
        <text v-else class="sc-res-t">😅 再接再厉</text>
      </view>
      <view class="sc-res" v-else>
        <text class="sc-res-p">已刮 {{ scOpen }}/16</text>
      </view>
      <view class="sc-btn-r">
        <view class="sc-btn" :class="{ off: !scDone }" @tap="scGen">
          <text class="sc-btn-t">{{ scDone ? '🔄 再来一张' : '继续刮 ⇡' }}</text>
        </view>
      </view>

      <view class="sc-modal" v-if="scShowSet" @tap="scShowSet = false">
        <view class="sc-modal-b" @tap.stop>
          <text class="sc-modal-tl">刮刮卡设置</text>
          <view class="sc-fd">
            <text class="sc-lb">奖金上限 ¥{{ scMax }}</text>
            <view class="sc-sl-r">
              <text class="sc-sl-v">10</text>
              <slider class="sc-sl" :min="10" :max="500" :step="10" :value="scMax" @change="(e: any) => scMax = e.detail.value" activeColor="#FF9800" backgroundColor="#E0E0E0" block-size="20" />
              <text class="sc-sl-v">500</text>
            </view>
          </view>
          <view class="sc-fd">
            <text class="sc-lb">难度：{{ scExp }}（越高越难中大奖）</text>
            <view class="sc-sl-r">
              <text class="sc-sl-v">易</text>
              <slider class="sc-sl" :min="1" :max="8" :step="0.5" :value="scExp" @change="(e: any) => scExp = e.detail.value" activeColor="#FF9800" backgroundColor="#E0E0E0" block-size="20" />
              <text class="sc-sl-v">难</text>
            </view>
            <text class="sc-hint">越难越少出现大奖</text>
          </view>
          <view class="sc-modal-bt">
            <view class="sc-mb cancel" @tap="scShowSet = false">取消</view>
            <view class="sc-mb save" @tap="scSaveSet">保存并重开</view>
          </view>
        </view>
      </view>
    </view>

    <!-- 骰子 -->
    <view class="tab-content" v-if="activeTab === 'dice'">
      <view class="dc-wrap">
        <view class="dc-pick">
          <text class="dc-pick-l">骰子数量</text>
          <view class="dc-pick-row">
            <view v-for="n in 6" :key="n" class="dc-pick-n" :class="{ on: diceCount === n }" @tap="setDiceCount(n)">{{ n }}</view>
          </view>
        </view>
        <view class="dc-dices">
          <view v-for="(v, i) in diceValues" :key="i" class="dc-box" :class="{ rolling: diceRolling }">
            <view class="dc-face">
              <view v-for="(dot, j) in getDots(v)" :key="j" class="dc-dot" :class="{ on: dot }" />
            </view>
          </view>
        </view>
        <view class="dc-total" v-if="!diceRolling">
          <text class="dc-total-t">总点数</text>
          <text class="dc-total-n">{{ diceValues.reduce((a,b)=>a+b, 0) }}</text>
        </view>
        <view class="dc-total" v-else><text class="dc-total-t">...</text></view>
        <view class="dc-btn" @tap="rollDice">
          <text class="dc-btn-t">{{ diceRolling ? '摇...' : '🎲 掷骰子' }}</text>
        </view>
      </view>
    </view>

    <!-- 老虎机 -->
    <view class="tab-content" v-if="activeTab === 'slot'">
      <view class="slot-machine">
        <view class="slot-balance">
          <text class="slot-bal-label">余额</text>
          <text class="slot-bal-value">{{ store.balance }}🪙</text>
        </view>

        <view class="slot-reels">
          <view v-for="(reel, i) in slotReels" :key="i" class="slot-reel" :class="{ spinning: slotSpinPhase[i] }">
            <text class="slot-symbol">{{ reel }}</text>
          </view>
        </view>

        <view class="slot-paytable">
          <view class="slot-pt-row" v-for="(s, i) in SLOT_SYMBOLS" :key="s">
            <text class="slot-pt-sym">{{ s }}{{ s }}{{ s }}</text>
            <text class="slot-pt-mult">{{ SLOT_PAYOUTS_3[i] }}x</text>
          </view>
          <view class="slot-pt-row">
            <text class="slot-pt-sym">任意两个相同</text>
            <text class="slot-pt-mult">1x</text>
          </view>
        </view>

        <view class="slot-bets">
          <view v-for="b in [10, 50, 100]" :key="b" class="slot-bet-btn" :class="{ on: slotBet === b }" @tap="slotSetBet(b)">
            <text>{{ b }}币</text>
          </view>
        </view>

        <view class="slot-spin-btn" :class="{ off: slotSpinning }" @tap="slotSpin">
          <text class="slot-spin-t">{{ slotSpinning ? '转动中...' : '🎰 转一下' }}</text>
        </view>

        <view class="slot-result" v-if="slotShowResult">
          <text class="slot-res-text" :class="{ win: slotWinAmount > 0 }">{{ slotResult }}</text>
        </view>
      </view>
    </view>
  </page-layout>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.sub-tabs { @include sub-tabs; }
.sub-tab {
  flex: 1; text-align: center; padding: 18rpx 0;
  font-size: 26rpx; color: $text-muted; border-radius: $radius-md;
  transition: all 0.2s;
}
.sub-tab.active { @include sub-tab-active; }
.tab-content { padding-bottom: 140rpx; }

/* ---- 刮刮卡 ---- */
.sc-header { display: flex; justify-content: space-between; align-items: center; padding: 0 $space-md 8rpx; }
.sc-title { font-size: $text-base; font-weight: 700; color: $text; }
.sc-gear { font-size: $text-xs; color: $accent; padding: 8rpx $space-md; background: rgba(255,152,0,0.08); border-radius: $radius-md; }
.sc-wn { display: flex; align-items: center; justify-content: center; gap: $space-md; padding: 8rpx 0 $space-sm; }
.sc-wn-label { font-size: $text-sm; color: $text-secondary; }
.sc-wn-num { font-size: 44rpx; font-weight: 800; color: $error; }
.sc-wn-hint { font-size: 18rpx; color: $text-faint; }
.sc-grid { padding: 0 $space-md; }
.sc-row { display: flex; gap: 10rpx; margin-bottom: 10rpx; }
.sc-cell { flex: 1; aspect-ratio: 1; }
.sc-inner {
  width: 100%; height: 100%; border-radius: 14rpx; background: $white;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.06); position: relative;
}
.sc-top { flex: 1; display: flex; align-items: flex-end; padding-bottom: 2rpx; }
.sc-amount { font-size: 18rpx; color: #795548; }
.sc-bot { flex: 1; display: flex; align-items: flex-start; }
.sc-bot.win { background: rgba(76,175,80,0.08); border-radius: 0 0 14rpx 14rpx; width: 100%; justify-content: center; }
.sc-num { font-size: 26rpx; font-weight: 700; color: $text; }
.sc-tick { position: absolute; top: 4rpx; right: 8rpx; font-size: 16rpx; color: $success; font-weight: 700; }
.sc-coat {
  width: 100%; height: 100%; border-radius: 14rpx;
  background: linear-gradient(135deg, #BDBDBD 20%, #9E9E9E 80%);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.12);
}
.sc-coat-q { font-size: 34rpx; color: $white; font-weight: 700; text-shadow: 0 2rpx 4rpx rgba(0,0,0,0.2); }
.sc-coat-h { font-size: 14rpx; color: rgba(255,255,255,0.65); margin-top: 2rpx; }
.sc-res { text-align: center; padding: $space-sm 0; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.sc-res-t { font-size: 28rpx; color: $text; }
.sc-res-p { font-size: 20rpx; color: $text-faint; }
.sc-btn-r { display: flex; justify-content: center; padding: 4rpx 0 $space-md; }
.sc-btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 14rpx 44rpx; @include btn-primary;
}
.sc-btn.off { opacity: 0.35; }
.sc-btn-t { font-size: 26rpx; color: $white; font-weight: 700; }
.sc-modal { @include modal-mask; display: flex; align-items: center; justify-content: center; }
.sc-modal-b { width: 620rpx; background: $white; border-radius: $radius-lg; padding: 36rpx 32rpx; }
.sc-modal-tl { font-size: 32rpx; font-weight: 700; color: $text; display: block; margin-bottom: $space-lg; }
.sc-fd { margin-bottom: $space-lg; }
.sc-lb { font-size: $text-sm; color: $text-secondary; margin-bottom: 6rpx; display: block; }
.sc-sl-r { display: flex; align-items: center; gap: 10rpx; }
.sc-sl-v { font-size: 18rpx; color: $text-muted; flex-shrink: 0; width: 28rpx; text-align: center; }
.sc-sl { flex: 1; }
.sc-hint { font-size: 18rpx; color: $text-faint; margin-top: 4rpx; display: block; }
.sc-modal-bt { display: flex; gap: 14rpx; margin-top: 8rpx; }
.sc-mb { flex: 1; text-align: center; padding: 20rpx 0; border-radius: $radius-md; font-size: 26rpx; font-weight: 600; }
.sc-mb.cancel { background: $border-light; color: $text-secondary; }
.sc-mb.save { @include btn-primary; }

/* ---- 骰子 ---- */
.dc-wrap { display: flex; flex-direction: column; align-items: center; padding: 40rpx 0; }
.dc-pick { margin-bottom: 40rpx; text-align: center; }
.dc-pick-l { font-size: $text-sm; color: $text-muted; display: block; margin-bottom: $space-sm; }
.dc-pick-row { display: flex; gap: $space-md; justify-content: center; }
.dc-pick-n {
  width: 64rpx; height: 64rpx; border-radius: 50%; border: 2rpx solid $border;
  display: flex; align-items: center; justify-content: center;
  font-size: 28rpx; font-weight: 600; color: $text-secondary; background: $white;
}
.dc-pick-n.on { border-color: $accent; background: #FFF3E0; color: $accent; }
.dc-dices { display: flex; flex-wrap: wrap; gap: $space-lg; justify-content: center; margin-bottom: $space-lg; }
.dc-box {
  width: 140rpx; height: 140rpx; border-radius: $radius-lg; background: $white;
  box-shadow: 0 6rpx 24rpx rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center;
}
.dc-box.rolling { animation: dc-shake 0.06s linear infinite; }
@keyframes dc-shake {
  0% { transform: rotate(0deg); }
  25% { transform: rotate(10deg) scale(1.05); }
  50% { transform: rotate(0deg); }
  75% { transform: rotate(-10deg) scale(1.05); }
  100% { transform: rotate(0deg); }
}
.dc-face {
  width: 110rpx; height: 110rpx;
  display: grid; grid-template-columns: repeat(3,1fr); grid-template-rows: repeat(3,1fr);
  padding: 8rpx;
}
.dc-dot { width: 24rpx; height: 24rpx; border-radius: 50%; align-self: center; justify-self: center; }
.dc-dot.on { background: $error; box-shadow: 0 2rpx 4rpx rgba(244,67,54,0.3); }
.dc-total { display: flex; align-items: baseline; gap: 8rpx; margin-bottom: $space-lg; }
.dc-total-t { font-size: $text-sm; color: $text-muted; }
.dc-total-n { font-size: 56rpx; font-weight: 800; color: $accent; }
.dc-btn { @include btn-primary; padding: 20rpx 80rpx; }
.dc-btn-t { font-size: $text-base; color: $white; font-weight: 700; }

/* ---- 老虎机 ---- */
.slot-machine { display: flex; flex-direction: column; align-items: center; padding: $space-lg 0; }
.slot-balance { display: flex; align-items: baseline; gap: $space-sm; margin-bottom: 32rpx; }
.slot-bal-label { font-size: $text-sm; color: $text-muted; }
.slot-bal-value { font-size: 44rpx; font-weight: 800; color: $accent; }

.slot-reels { display: flex; gap: $space-lg; margin-bottom: 32rpx; }
.slot-reel {
  width: 160rpx; height: 180rpx; border-radius: $radius-lg;
  background: $white; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 6rpx 24rpx rgba(0,0,0,0.1); border: 3rpx solid $border;
  overflow: hidden; transition: border-color 0.2s;
}
.slot-reel.spinning { border-color: $primary; animation: slot-shake 0.06s linear infinite; }
@keyframes slot-shake {
  0% { transform: translateY(0); }
  50% { transform: translateY(-6rpx); }
  100% { transform: translateY(0); }
}
.slot-symbol { font-size: 72rpx; }

.slot-paytable {
  display: flex; flex-wrap: wrap; gap: 8rpx 24rpx; justify-content: center;
  margin-bottom: 28rpx; padding: $space-md 24rpx;
  background: rgba(255,255,255,0.6); border-radius: $radius-md;
}
.slot-pt-row { display: flex; align-items: center; gap: 8rpx; }
.slot-pt-sym { font-size: $text-xs; color: $text-secondary; }
.slot-pt-mult { font-size: $text-xs; font-weight: 700; color: $accent; }

.slot-bets { display: flex; gap: $space-md; margin-bottom: 28rpx; }
.slot-bet-btn {
  padding: $space-md 36rpx; border-radius: 32rpx;
  background: $border-light; font-size: 26rpx; color: $text-muted;
  border: 2rpx solid transparent; transition: all 0.2s;
  &:active { transform: scale(0.95); }
}
.slot-bet-btn.on { background: #FFF3E0; color: $accent; border-color: $accent; font-weight: 600; }

.slot-spin-btn {
  @include btn-primary;
  padding: 24rpx 80rpx; border-radius: 48rpx;
}
.slot-spin-btn.off { opacity: 0.5; pointer-events: none; }
.slot-spin-t { font-size: 32rpx; font-weight: 700; color: $white; }

.slot-result { margin-top: $space-lg; text-align: center; min-height: 48rpx; }
.slot-res-text { font-size: 28rpx; color: $text-muted; }
.slot-res-text.win { color: $accent; font-weight: 700; font-size: 32rpx; }
</style>
