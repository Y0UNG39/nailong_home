<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAppStore } from '@/store/index'

const store = useAppStore()
const activeTab = ref<'scratch' | 'dice' | 'slot'>('scratch')

// ---- 刮刮卡（Canvas 滑动刮开）----
const scMax = ref(100)
const scExp = ref(3)
const scShowSet = ref(false)
const scWinNum = ref(0)
const scDone = ref(false)
const scWin = ref(0)
interface ScCell { num: number; amount: number }
const scCells = ref<ScCell[]>([])

// Canvas 变量（双层：底层内容 + 顶层涂层）
let scBgCanvas: any = null
let scBgCtx: any = null
let scCoatCanvas: any = null
let scCoatCtx: any = null
let scDpr = 1
let scCssW = 300
let scCssH = 300
let scCanvasRect: any = null
let scLastX = 0
let scLastY = 0
let scMoveCount = 0
const SC_BRUSH_RADIUS = 15

function scLoadSet() { try { const s = uni.getStorageSync('scratch_settings'); if (s) { scMax.value = s.maxAmount || 100; scExp.value = s.exponent || 3 } } catch {} }
function scSaveSet() { uni.setStorageSync('scratch_settings', { maxAmount: scMax.value, exponent: scExp.value }); scShowSet.value = false; scGen() }
function scRand(): number { return Math.max(1, Math.round(scMax.value * Math.pow(Math.random(), scExp.value))) }

function scGen() {
  scDone.value = false
  scWin.value = 0
  scMoveCount = 0
  scWinNum.value = Math.floor(Math.random() * 10)

  const cells: ScCell[] = []
  for (let i = 0; i < 16; i++) {
    cells.push({ num: Math.floor(Math.random() * 10), amount: scRand() })
  }
  scCells.value = cells

  if (scBgCtx && scCoatCtx) scDrawCard()
}

function scInitCanvas() {
  setTimeout(() => {
    // 初始化底层 Canvas
    uni.createSelectorQuery().select('#scratchBgCanvas')
      .fields({ node: true, size: true, rect: true })
      .exec((res1: any) => {
        if (!res1 || !res1[0]) return
        const bg = res1[0]

        scDpr = uni.getSystemInfoSync().pixelRatio || 2
        scCssW = bg.width
        scCssH = bg.height

        if (bg.node) {
          scBgCanvas = bg.node
          scBgCtx = scBgCanvas.getContext('2d')
          scBgCanvas.width = scCssW * scDpr
          scBgCanvas.height = scCssH * scDpr
          scBgCtx.scale(scDpr, scDpr)
        } else {
          scBgCtx = uni.createCanvasContext('scratchBgCanvas')
        }

        // 初始化涂层 Canvas
        uni.createSelectorQuery().select('#scratchCoatCanvas')
          .fields({ node: true, size: true, rect: true })
          .exec((res2: any) => {
            if (!res2 || !res2[0]) return
            const coat = res2[0]

            if (coat.node) {
              scCoatCanvas = coat.node
              scCoatCtx = scCoatCanvas.getContext('2d')
              scCoatCanvas.width = scCssW * scDpr
              scCoatCanvas.height = scCssH * scDpr
              scCoatCtx.scale(scDpr, scDpr)
            } else {
              scCoatCtx = uni.createCanvasContext('scratchCoatCanvas')
            }

            scCanvasRect = { left: coat.left, top: coat.top }
            scGen()
          })
      })
  }, 300)
}

function scDrawContent(ctx: any, w: number, h: number, cells: ScCell[], highlight: boolean = false) {
  ctx.fillStyle = '#FFF8E1'
  ctx.fillRect(0, 0, w, h)

  const pad = 12, gap = 4
  const cw = (w - pad * 2 - gap * 3) / 4
  const ch = (h - pad * 2 - gap * 3) / 4

  for (let i = 0; i < 16; i++) {
    const r = Math.floor(i / 4), c = i % 4
    const x = pad + c * (cw + gap), y = pad + r * (ch + gap)
    const cell = cells[i]
    const match = highlight && cell.num === scWinNum.value

    ctx.fillStyle = match ? 'rgba(76,175,80,0.2)' : 'rgba(255,215,0,0.1)'
    ctx.fillRect(x, y, cw, ch)
    if (match) {
      ctx.strokeStyle = '#4CAF50'
      ctx.lineWidth = 2
      ctx.strokeRect(x, y, cw, ch)
    }

    ctx.fillStyle = match ? '#4CAF50' : '#333'
    ctx.font = 'bold 22px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(cell.num), x + cw / 2, y + ch / 2 - 10)

    ctx.fillStyle = match ? '#4CAF50' : '#888'
    ctx.font = match ? 'bold 12px sans-serif' : '11px sans-serif'
    ctx.fillText('¥' + cell.amount, x + cw / 2, y + ch / 2 + 12)

    if (match) {
      ctx.fillStyle = '#4CAF50'
      ctx.font = 'bold 10px sans-serif'
      ctx.fillText('✓', x + cw - 10, y + 10)
    }
  }
}

function scDrawCard() {
  if (!scBgCtx || !scCoatCtx) return

  // 底层：画内容
  if (scBgCanvas && scBgCtx.clearRect) scBgCtx.clearRect(0, 0, scCssW, scCssH)
  scDrawContent(scBgCtx, scCssW, scCssH, scCells.value, false)
  if (!scBgCanvas && scBgCtx.draw) scBgCtx.draw()

  // 顶层：画涂层
  if (scCoatCanvas && scCoatCtx.clearRect) scCoatCtx.clearRect(0, 0, scCssW, scCssH)
  scCoatCtx.globalCompositeOperation = 'source-over'
  scCoatCtx.fillStyle = '#B0B0B0'
  scCoatCtx.fillRect(0, 0, scCssW, scCssH)
  scCoatCtx.fillStyle = '#FFF'
  scCoatCtx.font = 'bold 18px sans-serif'
  scCoatCtx.textAlign = 'center'
  scCoatCtx.textBaseline = 'middle'
  scCoatCtx.fillText('刮开有惊喜', scCssW / 2, scCssH / 2 - 6)
  scCoatCtx.fillStyle = 'rgba(255,255,255,0.5)'
  scCoatCtx.font = '11px sans-serif'
  scCoatCtx.fillText('用手指刮开涂层', scCssW / 2, scCssH / 2 + 14)
  scCoatCtx.globalCompositeOperation = 'source-over'
  if (!scCoatCanvas && scCoatCtx.draw) scCoatCtx.draw()
}

function scTouchStart(e: any) {
  if (scDone.value || !scCanvasRect) return
  const t = e.touches[0]
  scLastX = t.clientX - scCanvasRect.left
  scLastY = t.clientY - scCanvasRect.top
}

function scTouchMove(e: any) {
  if (scDone.value || !scCoatCtx || !scCanvasRect) return
  const t = e.touches[0]
  const x = t.clientX - scCanvasRect.left
  const y = t.clientY - scCanvasRect.top

  // 在涂层上擦除
  scCoatCtx.globalCompositeOperation = 'destination-out'
  scCoatCtx.beginPath()
  scCoatCtx.lineWidth = SC_BRUSH_RADIUS * 2
  scCoatCtx.lineCap = 'round'
  scCoatCtx.lineJoin = 'round'
  scCoatCtx.moveTo(scLastX, scLastY)
  scCoatCtx.lineTo(x, y)
  scCoatCtx.stroke()
  scCoatCtx.beginPath()
  scCoatCtx.arc(x, y, SC_BRUSH_RADIUS, 0, Math.PI * 2)
  scCoatCtx.fill()
  scCoatCtx.globalCompositeOperation = 'source-over'

  if (!scCoatCanvas && scCoatCtx.draw) scCoatCtx.draw(true)

  scLastX = x
  scLastY = y
  scMoveCount++
}

function scTouchEnd() {
  if (scDone.value) return
  if (scMoveCount < 10) return
  scCheckReveal()
}

function scCheckReveal() {
  if (!scCoatCanvas || !scCoatCtx || scDone.value) return

  try {
    const bw = scCssW * scDpr
    const bh = scCssH * scDpr
    const imgData = scCoatCtx.getImageData(0, 0, bw, bh)
    const pixels = imgData.data

    let total = 0
    let transparent = 0

    for (let y = 0; y < bh; y += 4) {
      for (let x = 0; x < bw; x += 4) {
        const idx = (y * bw + x) * 4 + 3
        total++
        if (pixels[idx] < 128) transparent++
      }
    }

    if (transparent / total >= 0.85) {
      scRevealAll()
    }
  } catch (e) {
    if (scMoveCount > 60) scRevealAll()
  }
}

function scRevealAll() {
  if (scDone.value) return
  scDone.value = true

  let totalWin = 0
  scCells.value.forEach(cell => {
    if (cell.num === scWinNum.value) totalWin += cell.amount
  })
  scWin.value = totalWin

  // 清除涂层
  setTimeout(() => {
    if (scCoatCtx) {
      if (scCoatCanvas && scCoatCtx.clearRect) {
        scCoatCtx.clearRect(0, 0, scCssW, scCssH)
      } else if (scCoatCtx.draw) {
        scCoatCtx.clearRect(0, 0, scCssW, scCssH)
        scCoatCtx.draw()
      }
    }
    // 重绘底层（高亮）
    if (scBgCtx) {
      if (scBgCanvas && scBgCtx.clearRect) scBgCtx.clearRect(0, 0, scCssW, scCssH)
      scDrawContent(scBgCtx, scCssW, scCssH, scCells.value, true)
      if (!scBgCanvas && scBgCtx.draw) scBgCtx.draw()
    }
  }, 100)

  uni.showToast({
    title: totalWin > 0 ? `中奖 ¥${totalWin}！` : '没有匹配的数字',
    icon: totalWin > 0 ? 'success' : 'none'
  })
}

onMounted(() => { scLoadSet(); setTimeout(() => scInitCanvas(), 100) })

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
    <view class="tab-content" v-show="activeTab === 'scratch'">
      <view class="sc-header">
        <text class="sc-title">刮刮卡</text>
        <text class="sc-gear" @tap="scShowSet = true">⚙️ 设置</text>
      </view>
      <view class="sc-wn">
        <text class="sc-wn-label">🎯 中奖号</text>
        <text class="sc-wn-num">{{ scWinNum }}</text>
        <text class="sc-wn-hint">刮到相同数字即中奖</text>
      </view>
      <view class="sc-card-wrap">
        <canvas id="scratchBgCanvas" canvas-id="scratchBgCanvas" type="2d" class="sc-canvas" />
        <canvas
          id="scratchCoatCanvas"
          canvas-id="scratchCoatCanvas"
          type="2d"
          class="sc-canvas sc-coat"
          @touchstart="scTouchStart"
          @touchmove.prevent="scTouchMove"
          @touchend="scTouchEnd"
        />
      </view>
      <view class="sc-res" v-if="scDone">
        <text v-if="scWin > 0" class="sc-res-t">🎉 赢了 ¥{{ scWin }}</text>
        <text v-else class="sc-res-t">😅 没有匹配的数字</text>
      </view>
      <view class="sc-res" v-else>
        <text class="sc-res-p">用手指刮开涂层</text>
      </view>
      <view class="sc-btn-r">
        <view class="sc-btn" :class="{ off: !scDone }" @tap="scGen">
          <text class="sc-btn-t">{{ scDone ? '🔄 再来一张' : '刮开后可重来' }}</text>
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
.sc-wn { display: flex; align-items: center; justify-content: center; gap: $space-md; padding: $space-sm 0 $space-md; }
.sc-wn-label { font-size: $text-sm; color: $text-secondary; }
.sc-wn-num { font-size: 44rpx; font-weight: 800; color: $error; }
.sc-wn-hint { font-size: 18rpx; color: $text-faint; }
.sc-card-wrap {
  margin: 0 $space-md;
  border-radius: $radius-lg;
  overflow: hidden;
  box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.12);
  position: relative;
}
.sc-canvas { width: 100%; height: 300px; display: block; }
.sc-coat { position: absolute; top: 0; left: 0; }
.sc-res { text-align: center; padding: $space-sm 0; display: flex; align-items: center; justify-content: center; }
.sc-res-t { font-size: 28rpx; color: $text; }
.sc-res-p { font-size: 24rpx; color: $text-faint; }
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
