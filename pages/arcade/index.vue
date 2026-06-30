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
// 刮开追踪（用一维数组记录每个格子是否被刮开）
const SC_GRID_SIZE = 20 // 20x20 网格
let scScratchGrid: boolean[] = []

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
  scScratchGrid = new Array(SC_GRID_SIZE * SC_GRID_SIZE).fill(false)
  if (scBgCtx && scCoatCtx) scDrawCard()
}

function scInitCanvas() {
  setTimeout(() => {
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

// 兼容手写圆角矩形（微信 Canvas 不支持 roundRect）
function ctxRoundRect(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2)
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function scDrawContent(ctx: any, w: number, h: number, cells: ScCell[], highlight: boolean = false) {
  // 炫酷金色渐变背景
  const grad = ctx.createLinearGradient(0, 0, w, h)
  grad.addColorStop(0, '#FFF8E1')
  grad.addColorStop(1, '#FFF3CD')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  const pad = 12, gap = 4
  const cw = (w - pad * 2 - gap * 3) / 4
  const ch = (h - pad * 2 - gap * 3) / 4

  for (let i = 0; i < 16; i++) {
    const r = Math.floor(i / 4), c = i % 4
    const x = pad + c * (cw + gap), y = pad + r * (ch + gap)
    const cell = cells[i]
    const match = highlight && cell.num === scWinNum.value

    // 单元格背景 - 金色渐变
    const cGrad = ctx.createLinearGradient(x, y, x + cw, y + ch)
    if (match) {
      cGrad.addColorStop(0, 'rgba(76,175,80,0.25)')
      cGrad.addColorStop(1, 'rgba(76,175,80,0.15)')
    } else {
      cGrad.addColorStop(0, 'rgba(255,215,0,0.12)')
      cGrad.addColorStop(1, 'rgba(255,193,7,0.08)')
    }
    ctx.fillStyle = cGrad
    ctx.beginPath()
    ctxRoundRect(ctx, x, y, cw, ch, 4)
    ctx.fill()

    if (match) {
      ctx.strokeStyle = '#4CAF50'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctxRoundRect(ctx, x, y, cw, ch, 4)
      ctx.stroke()
      // 绿色发光
      ctx.shadowColor = 'rgba(76,175,80,0.3)'
      ctx.shadowBlur = 8
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    ctx.fillStyle = match ? '#2E7D32' : '#333'
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
  if (scBgCanvas && scBgCtx.clearRect) scBgCtx.clearRect(0, 0, scCssW, scCssH)
  scDrawContent(scBgCtx, scCssW, scCssH, scCells.value, false)
  if (!scBgCanvas && scBgCtx.draw) scBgCtx.draw()

  // 炫酷涂层：渐变金色到灰色
  if (scCoatCanvas && scCoatCtx.clearRect) scCoatCtx.clearRect(0, 0, scCssW, scCssH)
  scCoatCtx.globalCompositeOperation = 'source-over'
  const coatGrad = scCoatCtx.createLinearGradient(0, 0, 0, scCssH)
  coatGrad.addColorStop(0, '#C0A050')
  coatGrad.addColorStop(0.5, '#A08030')
  coatGrad.addColorStop(1, '#B09040')
  scCoatCtx.fillStyle = coatGrad
  scCoatCtx.fillRect(0, 0, scCssW, scCssH)

  // 花纹
  scCoatCtx.fillStyle = 'rgba(255,215,0,0.1)'
  for (let i = 0; i < 20; i++) {
    scCoatCtx.beginPath()
    scCoatCtx.arc(
      Math.random() * scCssW,
      Math.random() * scCssH,
      3 + Math.random() * 8, 0, Math.PI * 2
    )
    scCoatCtx.fill()
  }

  scCoatCtx.fillStyle = '#FFD700'
  scCoatCtx.font = 'bold 20px sans-serif'
  scCoatCtx.textAlign = 'center'
  scCoatCtx.textBaseline = 'middle'
  scCoatCtx.shadowColor = 'rgba(255,215,0,0.4)'
  scCoatCtx.shadowBlur = 12
  scCoatCtx.fillText('✨ 刮开有惊喜 ✨', scCssW / 2, scCssH / 2 - 8)
  scCoatCtx.shadowBlur = 0
  scCoatCtx.fillStyle = 'rgba(255,255,255,0.4)'
  scCoatCtx.font = '11px sans-serif'
  scCoatCtx.fillText('用手指刮开涂层', scCssW / 2, scCssH / 2 + 20)
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
  const gridX = Math.floor(x / scCssW * SC_GRID_SIZE)
  const gridY = Math.floor(y / scCssH * SC_GRID_SIZE)
  const r = 2
  for (let gy = gridY - r; gy <= gridY + r; gy++) {
    for (let gx = gridX - r; gx <= gridX + r; gx++) {
      if (gx >= 0 && gx < SC_GRID_SIZE && gy >= 0 && gy < SC_GRID_SIZE) {
        scScratchGrid[gy * SC_GRID_SIZE + gx] = true
      }
    }
  }
  scLastX = x
  scLastY = y
  scMoveCount++
}

function scTouchEnd() {
  if (scDone.value) return
  const scratched = scScratchGrid.filter(Boolean).length
  const total = scScratchGrid.length
  if (total > 0 && scratched / total >= 0.9) {
    scRevealAll()
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
  setTimeout(() => {
    if (scCoatCtx) {
      if (scCoatCanvas && scCoatCtx.clearRect) {
        scCoatCtx.clearRect(0, 0, scCssW, scCssH)
      } else if (scCoatCtx.draw) {
        scCoatCtx.clearRect(0, 0, scCssW, scCssH)
        scCoatCtx.draw()
      }
    }
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
    <!-- 子标签切换（增强） -->
    <view class="sub-tabs stagger-enter">
      <view class="sub-tab" :class="{ active: activeTab === 'scratch' }" @tap="activeTab = 'scratch'">
        <text class="sub-tab-icon">💳</text>
        <text>刮刮卡</text>
      </view>
      <view class="sub-tab" :class="{ active: activeTab === 'dice' }" @tap="activeTab = 'dice'">
        <text class="sub-tab-icon">🎲</text>
        <text>骰子</text>
      </view>
      <view class="sub-tab" :class="{ active: activeTab === 'slot' }" @tap="activeTab = 'slot'">
        <text class="sub-tab-icon">🎰</text>
        <text>老虎机</text>
      </view>
    </view>

    <!-- 刮刮卡 -->
    <view class="tab-content stagger-enter" v-show="activeTab === 'scratch'">
      <view class="sc-header">
        <text class="sc-title">💳 刮刮卡</text>
        <text class="sc-gear" @tap="scShowSet = true">⚙️ 设置</text>
      </view>
      <view class="sc-wn">
        <text class="sc-wn-label">🎯 中奖号</text>
        <text class="sc-wn-num">{{ scWinNum }}</text>
        <text class="sc-wn-hint">刮到相同数字即中奖</text>
      </view>
      <view class="sc-card-wrap" v-show="!scShowSet">
        <view class="sc-card-glow" />
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
        <text v-if="scWin > 0" class="sc-res-t win">🎉 赢了 ¥{{ scWin }}！</text>
        <text v-else class="sc-res-t">😅 没有匹配的数字</text>
      </view>
      <view class="sc-res" v-else>
        <text class="sc-res-p">💡 用手指刮开涂层</text>
      </view>
      <view class="sc-btn-r">
        <view class="sc-btn" :class="{ off: !scDone }" @tap="scGen">
          <text class="sc-btn-t">{{ scDone ? '🔄 再来一张' : '刮开后可重来' }}</text>
        </view>
      </view>

    </view>

    <!-- 刮刮卡设置弹窗（在 page-layout 层级，canvas 已 v-show 隐藏，不会被挡住） -->
    <view class="sc-modal" v-if="scShowSet" @tap="scShowSet = false">
      <view class="sc-modal-b" @tap.stop>
        <text class="sc-modal-tl">⚙️ 刮刮卡设置</text>
        <view class="sc-fd">
          <text class="sc-lb">💰 奖金上限 ¥{{ scMax }}</text>
          <view class="sc-sl-r">
            <text class="sc-sl-v">10</text>
            <slider class="sc-sl" :min="10" :max="500" :step="10" :value="scMax" @change="(e: any) => scMax = e.detail.value" activeColor="#FF9800" backgroundColor="#E0E0E0" block-size="20" />
            <text class="sc-sl-v">500</text>
          </view>
        </view>
        <view class="sc-fd">
          <text class="sc-lb">🎯 难度：{{ scExp }}（越高越难中大奖）</text>
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

    <!-- 骰子 -->
    <view class="tab-content stagger-enter" v-if="activeTab === 'dice'">
      <view class="dc-wrap">
        <view class="dc-pick">
          <text class="dc-pick-l">🎲 骰子数量</text>
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
        <view class="dc-total" v-else><text class="dc-total-t rolling-text">摇动中...</text></view>
        <view class="dc-btn" @tap="rollDice">
          <text class="dc-btn-t">{{ diceRolling ? '🎲 摇动中...' : '🎲 掷骰子' }}</text>
        </view>
      </view>
    </view>

    <!-- 老虎机 -->
    <view class="tab-content stagger-enter" v-if="activeTab === 'slot'">
      <view class="slot-machine">
        <!-- 老虎机顶部装饰 -->
        <view class="slot-top-deco">
          <text class="slot-deco-text">🎰 老虎机</text>
        </view>

        <view class="slot-balance">
          <text class="slot-bal-label">🪙 余额</text>
          <text class="slot-bal-value">{{ store.balance }}</text>
        </view>

        <!-- 老虎机主体框架 -->
        <view class="slot-frame">
          <view class="slot-frame-glow" />
          <view class="slot-reels">
            <view v-for="(reel, i) in slotReels" :key="i" class="slot-reel" :class="{ spinning: slotSpinPhase[i] }">
              <text class="slot-symbol">{{ reel }}</text>
            </view>
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
          <text class="slot-spin-t">{{ slotSpinning ? '🎰 转动中...' : '🎰 转一下' }}</text>
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

/* ---- 子标签切换（增强） ---- */
.sub-tabs {
  @include sub-tabs;
  padding: $space-xs;
}
.sub-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  padding: 18rpx 0;
  font-size: 26rpx;
  color: $text-muted;
  border-radius: $radius-md;
  transition: all 0.25s $ease-out-quart;
  &:active { transform: scale(0.95); }
}
.sub-tab.active {
  @include sub-tab-active;
  box-shadow: 0 4rpx 12rpx rgba(255, 184, 0, 0.25);
}
.sub-tab-icon { font-size: 24rpx; }

.tab-content { padding-bottom: 140rpx; }

/* ---- 刮刮卡 ---- */
.sc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 $space-md 8rpx;
}
.sc-title {
  font-size: $text-base;
  font-weight: 700;
  @include text-glow($accent);
}
.sc-gear {
  font-size: $text-xs;
  color: $accent;
  padding: 8rpx $space-md;
  background: rgba(255, 152, 0, 0.08);
  border-radius: $radius-md;
  border: 1rpx solid rgba(255, 152, 0, 0.12);
  transition: all 0.2s $ease-out-quart;
  &:active { background: rgba(255, 152, 0, 0.15); }
}

.sc-wn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-md;
  padding: $space-sm 0 $space-md;
}
.sc-wn-label { font-size: $text-sm; color: $text-secondary; }
.sc-wn-num {
  font-size: 52rpx;
  font-weight: 900;
  color: $error;
  text-shadow: 0 0 12rpx rgba(244, 67, 54, 0.2);
  animation: breathe 2s $ease-out-quart infinite;
}
.sc-wn-hint { font-size: 18rpx; color: $text-faint; }

.sc-card-wrap {
  margin: 0 $space-md;
  border-radius: $radius-lg;
  overflow: hidden;
  box-shadow:
    0 8rpx 32rpx rgba(0, 0, 0, 0.12),
    0 0 0 1rpx rgba(255, 215, 0, 0.2);
  position: relative;
}
.sc-card-glow {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: $gradient-gold-text;
  opacity: 0.06;
  z-index: 0;
  animation: glowPulse 3s $ease-out-quart infinite;
  pointer-events: none;
}
.sc-canvas { width: 100%; height: 300px; display: block; position: relative; }
.sc-coat { position: absolute; top: 0; left: 0; z-index: 2; }

.sc-res { text-align: center; padding: $space-sm 0; display: flex; align-items: center; justify-content: center; }
.sc-res-t { font-size: 28rpx; color: $text; }
.sc-res-t.win {
  @include text-glow($success);
  font-weight: 700;
  font-size: 32rpx;
  animation: bounceIn 0.5s $ease-spring;
}
.sc-res-p { font-size: 24rpx; color: $text-faint; }

.sc-btn-r { display: flex; justify-content: center; padding: 4rpx 0 $space-md; }
.sc-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14rpx 44rpx;
  @include btn-glow;
}
.sc-btn.off { opacity: 0.35; }
.sc-btn-t { font-size: 26rpx; color: $white; font-weight: 700; }

.sc-modal { @include modal-mask; display: flex; align-items: center; justify-content: center; z-index: 1000; }
.sc-modal-b {
  width: 620rpx;
  background: $white;
  border-radius: $radius-lg;
  padding: 36rpx 32rpx;
  animation: fadeInScale 0.25s $ease-out-quart;
}
.sc-modal-tl { font-size: 32rpx; font-weight: 700; color: $text; display: block; margin-bottom: $space-lg; }
.sc-fd { margin-bottom: $space-lg; }
.sc-lb { font-size: $text-sm; color: $text-secondary; margin-bottom: 6rpx; display: block; }
.sc-sl-r { display: flex; align-items: center; gap: 10rpx; }
.sc-sl-v { font-size: 18rpx; color: $text-muted; flex-shrink: 0; width: 28rpx; text-align: center; }
.sc-sl { flex: 1; }
.sc-hint { font-size: 18rpx; color: $text-faint; margin-top: 4rpx; display: block; }
.sc-modal-bt { display: flex; gap: 14rpx; margin-top: 8rpx; }
.sc-mb { flex: 1; text-align: center; padding: 20rpx 0; border-radius: $radius-md; font-size: 26rpx; font-weight: 600; transition: all 0.15s; }
.sc-mb.cancel { background: $border-light; color: $text-secondary; }
.sc-mb.save { @include btn-primary; }

/* ---- 骰子 ---- */
.dc-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 0;
}
.dc-pick { margin-bottom: 40rpx; text-align: center; }
.dc-pick-l { font-size: $text-sm; color: $text-muted; display: block; margin-bottom: $space-sm; }
.dc-pick-row { display: flex; gap: $space-md; justify-content: center; }
.dc-pick-n {
  width: 64rpx; height: 64rpx; border-radius: 50%;
  border: 2rpx solid $border;
  display: flex; align-items: center; justify-content: center;
  font-size: 28rpx; font-weight: 600; color: $text-secondary;
  background: $white;
  transition: all 0.2s $ease-spring;
  &:active { transform: scale(0.9); }
}
.dc-pick-n.on {
  border-color: $accent;
  background: linear-gradient(135deg, #FFF3E0, #FFE0B2);
  color: $accent;
  box-shadow: 0 4rpx 12rpx rgba(255, 152, 0, 0.2);
}

.dc-dices {
  display: flex;
  flex-wrap: wrap;
  gap: $space-lg;
  justify-content: center;
  margin-bottom: $space-lg;
}
.dc-box {
  width: 140rpx;
  height: 140rpx;
  border-radius: $radius-lg;
  background: $white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6rpx 24rpx rgba(0, 0, 0, 0.1);
  border: 2rpx solid $border-light;
  transition: border-color 0.2s;
}
.dc-box.rolling {
  border-color: $accent;
  animation: dc-shake 0.06s linear infinite;
}
@keyframes dc-shake {
  0% { transform: rotate(0deg) scale(1); }
  25% { transform: rotate(8deg) scale(1.04); }
  50% { transform: rotate(0deg) scale(1); }
  75% { transform: rotate(-8deg) scale(1.04); }
  100% { transform: rotate(0deg) scale(1); }
}

.dc-face {
  width: 110rpx; height: 110rpx;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  padding: 8rpx;
}
.dc-dot { width: 24rpx; height: 24rpx; border-radius: 50%; align-self: center; justify-self: center; }
.dc-dot.on {
  background: linear-gradient(135deg, $error, #FF7961);
  box-shadow: 0 2rpx 6rpx rgba(244, 67, 54, 0.35);
}

.dc-total { display: flex; align-items: baseline; gap: 8rpx; margin-bottom: $space-lg; }
.dc-total-t { font-size: $text-sm; color: $text-muted; }
.dc-total-n {
  font-size: 60rpx;
  font-weight: 900;
  @include text-glow($accent);
  animation: bounceIn 0.4s $ease-spring;
}
.rolling-text {
  font-size: $text-sm;
  color: $accent;
  animation: breathe 0.5s $ease-out-quart infinite;
}

.dc-btn {
  @include btn-glow;
  padding: 20rpx 80rpx;
}
.dc-btn-t { font-size: $text-base; color: $white; font-weight: 700; }

/* ---- 老虎机 ---- */
.slot-machine {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $space-lg 0;
}

.slot-top-deco {
  margin-bottom: 28rpx;
  padding: 10rpx 40rpx;
  background: $gradient-accent;
  border-radius: $radius-full;
  box-shadow: 0 4rpx 16rpx rgba(255, 152, 0, 0.3);
}
.slot-deco-text {
  font-size: 28rpx;
  font-weight: 800;
  color: $white;
  letter-spacing: 2rpx;
}

.slot-balance {
  display: flex;
  align-items: baseline;
  gap: $space-sm;
  margin-bottom: 28rpx;
  padding: $space-md 36rpx;
  @include glass-card;
}
.slot-bal-label { font-size: $text-sm; color: $text-muted; }
.slot-bal-value {
  font-size: 48rpx;
  font-weight: 900;
  @include text-glow($accent);
}

/* 老虎机主体 */
.slot-frame {
  padding: $space-lg;
  background: linear-gradient(180deg, #1a1a2e, #16213e);
  border-radius: $radius-xl;
  box-shadow:
    0 12rpx 48rpx rgba(0, 0, 0, 0.2),
    0 0 1rpx rgba(255, 215, 0, 0.15),
    inset 0 0 30rpx rgba(255, 215, 0, 0.03);
  margin-bottom: 28rpx;
  position: relative;
  overflow: hidden;
}
.slot-frame-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 50%, rgba(255, 215, 0, 0.06), transparent 70%);
  pointer-events: none;
}

.slot-reels {
  display: flex;
  gap: $space-lg;
}
.slot-reel {
  width: 160rpx;
  height: 180rpx;
  border-radius: $radius-md;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s;
}
.slot-reel.spinning {
  border: 3rpx solid $gold;
  box-shadow: 0 0 20rpx rgba(255, 215, 0, 0.2), inset 0 0 10rpx rgba(255, 215, 0, 0.05);
  animation: slot-shake 0.05s linear infinite;
}
@keyframes slot-shake {
  0% { transform: translateY(0); }
  50% { transform: translateY(-8rpx); }
  100% { transform: translateY(0); }
}
.slot-symbol { font-size: 80rpx; }

/* 赔率表 */
.slot-paytable {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx 24rpx;
  justify-content: center;
  margin-bottom: 28rpx;
  padding: $space-md 24rpx;
  background: rgba(255, 255, 255, 0.6);
  border-radius: $radius-md;
  border: 1rpx solid rgba(255, 215, 0, 0.08);
}
.slot-pt-row { display: flex; align-items: center; gap: 8rpx; }
.slot-pt-sym { font-size: $text-xs; color: $text-secondary; }
.slot-pt-mult {
  font-size: $text-xs;
  font-weight: 700;
  color: $accent;
}

/* 下注按钮 */
.slot-bets {
  display: flex;
  gap: $space-md;
  margin-bottom: 28rpx;
}
.slot-bet-btn {
  padding: $space-md 36rpx;
  border-radius: 32rpx;
  background: $border-light;
  font-size: 26rpx;
  color: $text-muted;
  border: 2rpx solid transparent;
  transition: all 0.2s $ease-out-quart;
  &:active { transform: scale(0.92); }
}
.slot-bet-btn.on {
  background: linear-gradient(135deg, #FFF3E0, #FFE0B2);
  color: $accent;
  border-color: $accent;
  font-weight: 700;
  box-shadow: 0 2rpx 8rpx rgba(255, 152, 0, 0.2);
}

/* 旋转按钮 */
.slot-spin-btn {
  @include btn-glow;
  padding: 24rpx 80rpx;
  border-radius: 48rpx;
  font-size: 32rpx;
}
.slot-spin-btn.off { opacity: 0.5; pointer-events: none; }
.slot-spin-t { font-size: 32rpx; font-weight: 700; color: $white; }

/* 结果 */
.slot-result {
  margin-top: $space-lg;
  text-align: center;
  min-height: 48rpx;
}
.slot-res-text {
  font-size: 28rpx;
  color: $text-muted;
}
.slot-res-text.win {
  @include text-glow($accent);
  font-weight: 800;
  font-size: 34rpx;
  animation: bounceIn 0.5s $ease-spring;
}
</style>
