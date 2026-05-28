<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'

const COLORS = ['#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF','#FF9F40',
  '#48BB78','#F6AD55','#63B3ED','#B794F4','#FC8181','#68D391','#FBD38D',
  '#FF6B6B','#C9CBCF','#E7E9ED']
const WHEEL_SIZE = 300

const wArrow = ref(0)
interface WItem { _id: string; label: string; weight: number }
const wheelItems = ref<WItem[]>([])
const wNewLabel = ref('')
const wNewWeight = ref(1)
const wSpinning = ref(false)
const wResult = ref('')
const wEditId = ref('')
const wEditWeight = ref(1)

const totalWt = computed(() => wheelItems.value.reduce((s, i) => s + (i.weight || 1), 0))

function loadWheelItems() {
  try {
    const saved = uni.getStorageSync('wheel_items')
    if (saved && Array.isArray(saved)) wheelItems.value = saved
  } catch {}
  nextTick(() => drawWheelOld())
}

function drawWheelOld() {
  const ctx = uni.createCanvasContext('pieCanvas')
  const n = wheelItems.value.length
  const cx = WHEEL_SIZE / 2; const cy = WHEEL_SIZE / 2; const r = cx - 6
  ctx.clearRect(0, 0, WHEEL_SIZE, WHEEL_SIZE)

  if (n === 0) {
    ctx.setFillStyle('#f8f8f8')
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
    ctx.setStrokeStyle('#e0e0e0'); ctx.setLineWidth(2)
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
    ctx.setStrokeStyle('#eee'); ctx.setLineWidth(1)
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2); ctx.stroke()
    ctx.draw(); return
  }

  const tw = totalWt.value
  let angle = -Math.PI / 2
  for (let i = 0; i < n; i++) {
    const seg = ((wheelItems.value[i].weight || 1) / tw) * Math.PI * 2
    const s = angle; const e = s + seg
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, s, e); ctx.closePath()
    ctx.setFillStyle(COLORS[i % COLORS.length])
    ctx.fill()
    const mid = s + seg / 2; const lr = r * 0.65
    ctx.save()
    ctx.translate(cx + Math.cos(mid) * lr, cy + Math.sin(mid) * lr); ctx.rotate(mid + Math.PI / 2)
    ctx.setFillStyle('#fff'); ctx.setFontSize(10)
    ctx.setTextAlign('center'); ctx.setTextBaseline('middle')
    ctx.fillText(wheelItems.value[i].label.length > 5 ? wheelItems.value[i].label.slice(0, 4) + '..' : wheelItems.value[i].label, 0, 0)
    ctx.restore()
    angle += seg
  }

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(wArrow.value * Math.PI / 180)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, -r + 6)
  ctx.setStrokeStyle('#F44336')
  ctx.setLineWidth(3)
  ctx.setLineCap('round')
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, 0, 6, 0, Math.PI * 2)
  ctx.setFillStyle('#F44336')
  ctx.fill()
  ctx.restore()

  ctx.draw()
}

function wSpin() {
  if (wSpinning.value || wheelItems.value.length === 0) return
  wSpinning.value = true; wResult.value = ''

  const tw = totalWt.value
  const rand = Math.random() * tw
  let sum = 0
  let wi = 0
  for (let i = 0; i < wheelItems.value.length; i++) {
    sum += (wheelItems.value[i].weight || 1)
    if (rand <= sum) { wi = i; break }
  }
  const label = wheelItems.value[wi].label

  let cumDeg = 0
  for (let i = 0; i < wi; i++) cumDeg += ((wheelItems.value[i].weight || 1) / tw) * 360
  const segDeg = ((wheelItems.value[wi].weight || 1) / tw) * 360
  const targetAngle = cumDeg + segDeg / 2

  const currentMod = ((wArrow.value % 360) + 360) % 360
  let diff = targetAngle - currentMod
  if (diff < 0) diff += 360
  const spins = 5 + Math.floor(Math.random() * 3)
  const totalTarget = wArrow.value + spins * 360 + diff

  const dur = 2500; const tick = 60; const s = Date.now()
  const startA = wArrow.value

  const timer = setInterval(() => {
    const p = Math.min((Date.now() - s) / dur, 1)
    const e = 1 - Math.pow(1 - p, 3)
    wArrow.value = startA + e * (totalTarget - startA)
    drawWheelOld()
    if (p >= 1) {
      clearInterval(timer)
      wArrow.value = totalTarget
      wResult.value = label
      wSpinning.value = false
      drawWheelOld()
    }
  }, tick)
}

function saveWheelStorage() {
  uni.setStorageSync('wheel_items', wheelItems.value)
}

function wAdd() {
  const label = wNewLabel.value.trim()
  if (!label) { uni.showToast({ title: '请输入选项', icon: 'none' }); return }
  const weight = Math.max(1, Math.floor(Number(wNewWeight.value)) || 1)
  if (wheelItems.value.length >= 20) { uni.showToast({ title: '最多20个选项', icon: 'none' }); return }
  wNewLabel.value = ''
  wNewWeight.value = 1
  wheelItems.value.push({ _id: '_' + Date.now(), label, weight })
  saveWheelStorage()
  nextTick(() => drawWheelOld())
}

async function wDelete(item: WItem) {
  const ok = await uni.showModal({ title: '确认删除', content: `删除「${item.label}」？` })
  if (!ok.confirm) return
  wheelItems.value = wheelItems.value.filter(i => i._id !== item._id)
  saveWheelStorage()
  nextTick(() => drawWheelOld())
}

async function wClear() {
  const ok = await uni.showModal({ title: '清空全部', content: '确定清空所有选项吗？' })
  if (!ok.confirm) return
  wheelItems.value = []
  saveWheelStorage()
  nextTick(() => drawWheelOld())
}

function startEdit(item: WItem) { wEditId.value = item._id; wEditWeight.value = item.weight || 1 }
function saveWeight(item: WItem) {
  if (wEditWeight.value === (item.weight || 1)) { wEditId.value = ''; return }
  const val = Math.max(1, Math.floor(Number(wEditWeight.value)) || 1)
  item.weight = val
  wEditId.value = ''
  saveWheelStorage()
  drawWheelOld()
}

onMounted(() => loadWheelItems())
</script>

<template>
  <page-layout>
    <view class="wh-top">
      <text class="wh-hint">{{ wheelItems.length }} 个选项</text>
      <text v-if="wheelItems.length > 0" class="wh-clear" @tap="wClear">🗑️ 清空</text>
    </view>

    <view class="wh-stage">
      <view class="wh-wheel">
        <canvas canvas-id="pieCanvas" class="pie-canvas"></canvas>
      </view>
      <view class="wh-btn" :class="{ off: wSpinning || wheelItems.length === 0 }" @tap="wSpin">
        <text class="wh-btn-t">抽奖</text>
      </view>
    </view>

    <view class="wh-result">
      <text class="whr-text" v-if="wResult">🎉 中了 <text class="whr-label">{{ wResult }}</text></text>
    </view>

    <view class="wh-mgmt">
      <view class="wh-add">
        <input class="wha-inp" v-model="wNewLabel" placeholder="选项名称" maxlength="20" @confirm="wAdd" />
        <input class="wha-wt" v-model.number="wNewWeight" type="number" placeholder="权重" />
        <view class="wha-btn" @tap="wAdd"><text class="wha-btn-t">+ 添加</text></view>
      </view>
      <view class="wh-list" v-if="wheelItems.length > 0">
        <view class="wh-chip" v-for="item in wheelItems" :key="item._id">
          <view class="whc-dot" :style="{ background: COLORS[wheelItems.indexOf(item) % COLORS.length] }"></view>
          <text class="whc-label">{{ item.label }}</text>
          <template v-if="wEditId === item._id">
            <input class="whc-edt" v-model.number="wEditWeight" type="number" />
            <text class="whc-ok" @tap="saveWeight(item)">✓</text>
          </template>
          <text v-else class="whc-wt" @tap="startEdit(item)">{{ ((item.weight || 1) / totalWt * 100).toFixed(0) }}%</text>
          <text class="whc-del" @tap="wDelete(item)">✕</text>
        </view>
      </view>
    </view>
  </page-layout>
</template>

<style lang="scss" scoped>
.wh-top { display:flex; align-items:center; justify-content:space-between; padding-bottom:12rpx; }
.wh-hint { font-size:22rpx; color:#bbb; }
.wh-clear { font-size:22rpx; color:#F44336; padding:4rpx 12rpx; border-radius:12rpx; background:rgba(244,67,54,0.08); }

.wh-stage {
  position:relative; display:flex; flex-direction:column; align-items:center;
  width:600rpx; margin:0 auto 16rpx;
}
.wh-wheel { position:relative; width:600rpx; height:600rpx; }
.pie-canvas { width:600rpx; height:600rpx; }
.wh-btn { text-align:center; margin-top:20rpx; width:100%; }
.wh-btn.off { opacity:0.5; pointer-events:none; }
.wh-btn-t {
  display:inline-block;
  background:linear-gradient(135deg,#FF9800,#FFB74D);
  border-radius:44rpx; padding:16rpx 64rpx;
  font-size:30rpx; color:#fff; font-weight:700;
  box-shadow:0 4rpx 20rpx rgba(255,152,0,0.4);
}

.wh-result { text-align:center; height:56rpx; display:flex; align-items:center; justify-content:center; }
.whr-text { font-size:28rpx; color:#FF9800; }
.whr-label { font-size:34rpx; font-weight:800; color:#F44336; }

.wh-mgmt { margin-top:12rpx; }
.wh-add { display:flex; gap:8rpx; margin-bottom:16rpx; }
.wha-inp { flex:2; height:72rpx; border:2rpx solid #F0F0F0; border-radius:16rpx; padding:0 16rpx; font-size:26rpx; background:#FAFAFA; }
.wha-wt { width:90rpx; height:72rpx; border:2rpx solid #F0F0F0; border-radius:16rpx; padding:0 8rpx; font-size:26rpx; text-align:center; background:#FAFAFA; flex-shrink:0; }
.wha-btn { height:72rpx; line-height:72rpx; padding:0 24rpx; background:linear-gradient(135deg,#FF9800,#FFB74D); border-radius:16rpx; flex-shrink:0; }
.wha-btn-t { font-size:26rpx; color:#fff; font-weight:600; }
.wh-list { display:flex; flex-wrap:wrap; gap:12rpx; }
.wh-chip { display:flex; align-items:center; gap:8rpx; background:#F5F5F5; border-radius:20rpx; padding:10rpx 14rpx; }
.whc-dot { width:14rpx; height:14rpx; border-radius:50%; flex-shrink:0; }
.whc-label { font-size:24rpx; color:#333; }
.whc-wt { font-size:20rpx; color:#999; padding:4rpx 8rpx; background:rgba(0,0,0,0.04); border-radius:8rpx; }
.whc-edt { width:64rpx; height:40rpx; border:1rpx solid #FFB800; border-radius:8rpx; font-size:20rpx; text-align:center; }
.whc-ok { font-size:22rpx; color:#4CAF50; padding:4rpx; font-weight:700; }
.whc-del { font-size:24rpx; color:#bbb; padding:4rpx; }
</style>
