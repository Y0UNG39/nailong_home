<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAppStore } from '@/store/index'

const store = useAppStore()
const activeTab = ref<'shop' | 'wheel' | 'scratch' | 'dice'>('shop')

// ---- 小卖部 ----
const shopItems = ref<any[]>([])
const showCreateShop = ref(false)
const editingShopId = ref('')
const shopForm = ref({ type: 'service', name: '', description: '', price: 1, stock: 1 })
const shopSubmitting = ref(false)

function loadArcadeData() {
  if (!store.coupleId) return
  wx.cloud.callFunction({ name: 'getShopItems', data: { coupleId: store.coupleId } }).then(res => {
    if (res.result.success) shopItems.value = res.result.items || []
  }).catch(() => {})
}

// ---- 转盘 ----
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

  // 指针：圆心到边缘的细线
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
  // 圆心小圆
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

  // 加权随机
  const tw = totalWt.value
  const rand = Math.random() * tw
  let sum = 0
  let wi = 0
  for (let i = 0; i < wheelItems.value.length; i++) {
    sum += (wheelItems.value[i].weight || 1)
    if (rand <= sum) { wi = i; break }
  }
  const label = wheelItems.value[wi].label

  // 计算扇区 wi 的角度范围（从12点钟顺时针，单位度）
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

// 切到转盘/刮刮卡 tab 时加载数据
watch(activeTab, (v) => { if (v === 'wheel') loadWheelItems() })
onMounted(() => { scLoadSet(); scGen() })

onShow(() => {
  loadArcadeData(); loadWheelItems()
  const tab = uni.getStorageSync('arcade_tab')
  if (tab && ['shop', 'wheel', 'scratch', 'dice'].includes(tab)) {
    activeTab.value = tab
    uni.removeStorageSync('arcade_tab')
  }
})

async function onShopDelete(item: any) {
  const ok = await uni.showModal({ title: '确认删除', content: `确定删除「${item.name}」吗？` })
  if (!ok.confirm) return
  try {
    shopItems.value = shopItems.value.filter(i => i._id !== item._id)
    uni.showToast({ title: '已删除', icon: 'success' })
    const res = await wx.cloud.callFunction({ name: 'shopDelete', data: { itemId: item._id } })
    if (!res.result.success) { shopItems.value.push(item); uni.showToast({ title: '删除失败', icon: 'none' }) }
  } catch { shopItems.value.push(item); uni.showToast({ title: '删除失败', icon: 'none' }) }
}

async function onShopPurchase(item: any) {
  if (!store.coupleId) return
  try {
    const res = await wx.cloud.callFunction({ name: 'shopPurchase', data: { coupleId: store.coupleId, itemId: item._id } })
    if (res.result.success) {
      uni.showToast({ title: '已购买「' + item.name + '」', icon: 'success' })
      loadArcadeData()
    } else {
      uni.showToast({ title: res.result.error || '购买失败', icon: 'none' })
    }
  } catch { uni.showToast({ title: '购买失败', icon: 'none' }) }
}

function onShopEdit(item: any) {
  editingShopId.value = item._id
  shopForm.value = { type: item.type, name: item.name, description: item.description || '', price: item.price, stock: item.stock }
  showCreateShop.value = true
}

async function submitShopItem() {
  if (!shopForm.value.name.trim()) { uni.showToast({ title: '请输入商品名称', icon: 'none' }); return }
  if (!store.coupleId) return
  shopSubmitting.value = true
  const isEdit = !!editingShopId.value
  try {
    const res = await wx.cloud.callFunction({
      name: isEdit ? 'shopUpdate' : 'shopCreate',
      data: isEdit
        ? { itemId: editingShopId.value, name: shopForm.value.name.trim(), description: shopForm.value.description.trim(), price: shopForm.value.price, stock: shopForm.value.stock }
        : { coupleId: store.coupleId, type: shopForm.value.type, name: shopForm.value.name.trim(), description: shopForm.value.description.trim(), price: shopForm.value.price, stock: shopForm.value.stock }
    })
    if (res.result.success) {
      uni.showToast({ title: isEdit ? '已更新' : '已上架', icon: 'success' })
      showCreateShop.value = false; editingShopId.value = ''
      shopForm.value = { type: 'service', name: '', description: '', price: 1, stock: 1 }
      loadArcadeData()
    } else { uni.showToast({ title: res.result.error || (isEdit ? '更新失败' : '上架失败'), icon: 'none' }) }
  } catch { uni.showToast({ title: isEdit ? '更新失败' : '上架失败', icon: 'none' }) } finally {
    shopSubmitting.value = false
  }
}

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

</script>

<template>
  <page-layout>
    <!-- 乐园子Tab -->
    <view class="sub-tabs">
      <view class="sub-tab" :class="{ active: activeTab === 'shop' }" @tap="activeTab = 'shop'">🛒 小卖部</view>
      <view class="sub-tab" :class="{ active: activeTab === 'wheel' }" @tap="activeTab = 'wheel'">🎡 转盘</view>
      <view class="sub-tab" :class="{ active: activeTab === 'scratch' }" @tap="activeTab = 'scratch'">💳 刮刮卡</view>
      <view class="sub-tab" :class="{ active: activeTab === 'dice' }" @tap="activeTab = 'dice'">🎲 骰子</view>
    </view>

    <!-- 小卖部 -->
    <view class="tab-content" v-if="activeTab === 'shop'">
      <view class="test-btn" @tap="setBalance999"><text>🔧 余额设为999</text></view>
      <view class="shop-grid">
        <view class="shop-col" v-for="item in shopItems" :key="item._id">
          <shop-item :item="item" showDelete @purchase="onShopPurchase" @delete="onShopDelete" @edit="onShopEdit" />
        </view>
      </view>
      <empty-state v-if="shopItems.length === 0" icon="🛒" text="货架空空，快来上架第一个商品吧" />
      <view class="fab" @tap="showCreateShop = true">
        <text class="fab-icon">+</text><text>上架商品</text>
      </view>
    </view>

    <!-- 转盘 -->
    <view class="tab-content" v-if="activeTab === 'wheel'">
      <view class="wh-top">
        <text class="wh-hint">{{ wheelItems.length }} 个选项</text>
        <text v-if="wheelItems.length > 0" class="wh-clear" @tap="wClear">🗑️ 清空</text>
      </view>

      <!-- Canvas 饼图转盘 -->
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

      <!-- 设置弹窗 -->
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

    <!-- 上架商品弹窗 -->
    <view v-if="showCreateShop" class="modal-mask" @tap="showCreateShop = false; editingShopId = ''">
      <view class="modal-sheet" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">{{ editingShopId ? '编辑商品' : '上架新商品' }}</text>
          <text class="modal-close" @tap="showCreateShop = false; editingShopId = ''">✕</text>
        </view>
        <scroll-view class="modal-body" scroll-y>
          <view class="form-group">
            <text class="form-label"><text class="required">*</text> 商品类型</text>
            <view class="seg-group">
              <view v-for="t in [{k:'service',v:'服务券'},{k:'physical',v:'实物券'},{k:'privilege',v:'特权券'}]" :key="t.k" class="seg" :class="{ sel: shopForm.type === t.k }" @tap="shopForm.type = t.k">{{ t.v }}</view>
            </view>
          </view>
          <view class="form-group">
            <text class="form-label"><text class="required">*</text> 商品名称</text>
            <input class="form-input" v-model="shopForm.name" placeholder="例如：免费按摩5分钟" maxlength="50" />
          </view>
          <view class="form-group">
            <text class="form-label">描述</text>
            <textarea class="form-textarea" v-model="shopForm.description" placeholder="补充说明..." maxlength="200" />
          </view>
          <view class="form-row">
            <view class="form-group half">
              <text class="form-label"><text class="required">*</text> 价格(币)</text>
              <input class="form-input" v-model.number="shopForm.price" type="number" placeholder="1" />
            </view>
            <view class="form-group half">
              <text class="form-label"><text class="required">*</text> 库存</text>
              <input class="form-input" v-model.number="shopForm.stock" type="number" placeholder="1" />
            </view>
          </view>
        </scroll-view>
        <view class="modal-footer">
          <view class="submit-btn" :class="{ disabled: shopSubmitting }" @tap="!shopSubmitting && submitShopItem()">
            <text>{{ shopSubmitting ? '保存中...' : editingShopId ? '保存修改' : '上架商品' }}</text>
          </view>
        </view>
      </view>
    </view>
  </page-layout>
</template>

<style lang="scss" scoped>
.sub-tabs {
  display: flex; background: rgba(255,255,255,0.8); backdrop-filter: blur(12rpx);
  border-radius: 20rpx; padding: 8rpx; margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(255,184,0,0.06);
}
.sub-tab { flex:1; text-align:center; padding:18rpx 0; font-size:26rpx; color:#999; border-radius:16rpx; transition:all 0.2s; }
.sub-tab.active { background:#FFB800; color:#fff; font-weight:700; box-shadow:0 4rpx 12rpx rgba(255,184,0,0.25); }
.tab-content { padding-bottom: 140rpx; }

.test-btn {
  background: rgba(255,255,255,0.6); border: 2rpx dashed #FFB800; border-radius: 16rpx;
  padding: 16rpx 0; text-align: center; font-size: 24rpx; color: #FFB800; margin-bottom: 20rpx;
}
.shop-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.shop-col { width: calc(50% - 8rpx); box-sizing: border-box; }
.fab { position:fixed; bottom:40rpx; right:40rpx; z-index:100; display:flex; align-items:center; background:linear-gradient(135deg,#FF9800,#FFB74D); padding:18rpx 32rpx; border-radius:48rpx; box-shadow:0 8rpx 24rpx rgba(255,152,0,0.35); font-size:26rpx; color:#fff; font-weight:600; }
.fab-icon { font-size:36rpx; margin-right:6rpx; }

.modal-mask { position:fixed; inset:0; background:rgba(0,0,0,0.4); backdrop-filter:blur(4rpx); z-index:200; }
.modal-sheet { position:fixed; left:0; right:0; bottom:0; z-index:201; background:#fff; border-radius:32rpx 32rpx 0 0; display:flex; flex-direction:column; animation:slideUp 0.3s ease-out; }
@keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
.modal-header { display:flex; align-items:center; justify-content:space-between; padding:32rpx 32rpx 20rpx; border-bottom:1rpx solid #F0F0F0; }
.modal-title { font-size:34rpx; font-weight:700; color:#333; }
.modal-close { font-size:36rpx; color:#bbb; padding:8rpx; }
.modal-body { padding:24rpx 32rpx; max-height:55vh; }
.form-group { margin-bottom:24rpx; }
.form-label { font-size:28rpx; font-weight:600; color:#333; margin-bottom:12rpx; display:block; }
.required { color:#FFB800; }
.form-input { width:100%; height:80rpx; border:2rpx solid #F0F0F0; border-radius:16rpx; padding:0 20rpx; font-size:28rpx; background:#FAFAFA; box-sizing:border-box; }
.form-textarea { width:100%; min-height:100rpx; border:2rpx solid #F0F0F0; border-radius:16rpx; padding:16rpx 20rpx; font-size:26rpx; background:#FAFAFA; box-sizing:border-box; }
.form-row { display:flex; gap:20rpx; }
.form-group.half { flex:1; }
.seg-group { display:flex; gap:8rpx; flex-wrap: wrap; }
.seg { flex:1; min-width: 80rpx; text-align:center; font-size:22rpx; color:#999; padding:14rpx 4rpx; border:2rpx solid #F0F0F0; border-radius:16rpx; background:#FAFAFA; }
.seg.sel { color:#FF9800; border-color:#FF9800; background:#FFF3E0; font-weight:700; }
.modal-footer { padding:16rpx 32rpx 32rpx; padding-bottom:calc(32rpx + env(safe-area-inset-bottom)); border-top:1rpx solid #F0F0F0; }
.submit-btn { width:100%; height:88rpx; line-height:88rpx; text-align:center; background:linear-gradient(135deg,#FF9800,#FFB74D); border-radius:44rpx; font-size:32rpx; font-weight:700; color:#fff; }
.submit-btn.disabled { opacity:0.5; pointer-events:none; }

/* ---- 转盘 ---- */
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

/* ---- 刮刮卡 ---- */
.sc-header { display:flex; justify-content:space-between; align-items:center; padding:0 16rpx 8rpx; }
.sc-title { font-size:30rpx; font-weight:700; color:#333; }
.sc-gear { font-size:22rpx; color:#FF9800; padding:8rpx 16rpx; background:rgba(255,152,0,0.08); border-radius:16rpx; }
.sc-wn { display:flex; align-items:center; justify-content:center; gap:16rpx; padding:8rpx 0 12rpx; }
.sc-wn-label { font-size:24rpx; color:#666; }
.sc-wn-num { font-size:44rpx; font-weight:800; color:#E53935; }
.sc-wn-hint { font-size:18rpx; color:#bbb; }
.sc-grid { padding:0 16rpx; }
.sc-row { display:flex; gap:10rpx; margin-bottom:10rpx; }
.sc-cell { flex:1; aspect-ratio:1; }
.sc-inner { width:100%; height:100%; border-radius:14rpx; background:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:0 2rpx 10rpx rgba(0,0,0,0.06); position:relative; }
.sc-top { flex:1; display:flex; align-items:flex-end; padding-bottom:2rpx; }
.sc-amount { font-size:18rpx; color:#795548; }
.sc-bot { flex:1; display:flex; align-items:flex-start; }
.sc-bot.win { background:rgba(76,175,80,0.08); border-radius:0 0 14rpx 14rpx; width:100%; justify-content:center; }
.sc-num { font-size:26rpx; font-weight:700; color:#333; }
.sc-tick { position:absolute; top:4rpx; right:8rpx; font-size:16rpx; color:#4CAF50; font-weight:700; }
.sc-coat { width:100%; height:100%; border-radius:14rpx; background:linear-gradient(135deg,#BDBDBD 20%,#9E9E9E 80%); display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:0 2rpx 8rpx rgba(0,0,0,0.12); }
.sc-coat-q { font-size:34rpx; color:#fff; font-weight:700; text-shadow:0 2rpx 4rpx rgba(0,0,0,0.2); }
.sc-coat-h { font-size:14rpx; color:rgba(255,255,255,0.65); margin-top:2rpx; }
.sc-res { text-align:center; padding:12rpx 0; height:48rpx; display:flex; align-items:center; justify-content:center; }
.sc-res-t { font-size:28rpx; color:#333; }
.sc-res-p { font-size:20rpx; color:#ccc; }
.sc-btn-r { display:flex; justify-content:center; padding:4rpx 0 16rpx; }
.sc-btn { display:inline-flex; align-items:center; justify-content:center; padding:14rpx 44rpx; background:linear-gradient(135deg,#FF9800,#FFB74D); border-radius:44rpx; }
.sc-btn.off { opacity:0.35; }
.sc-btn-t { font-size:26rpx; color:#fff; font-weight:700; }
.sc-modal { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.45); z-index:100; display:flex; align-items:center; justify-content:center; }
.sc-modal-b { width:620rpx; background:#fff; border-radius:24rpx; padding:36rpx 32rpx; }
.sc-modal-tl { font-size:32rpx; font-weight:700; color:#333; display:block; margin-bottom:24rpx; }
.sc-fd { margin-bottom:20rpx; }
.sc-lb { font-size:24rpx; color:#666; margin-bottom:6rpx; display:block; }
.sc-sl-r { display:flex; align-items:center; gap:10rpx; }
.sc-sl-v { font-size:18rpx; color:#999; flex-shrink:0; width:28rpx; text-align:center; }
.sc-sl { flex:1; }
.sc-hint { font-size:18rpx; color:#bbb; margin-top:4rpx; display:block; }
.sc-modal-bt { display:flex; gap:14rpx; margin-top:8rpx; }
.sc-mb { flex:1; text-align:center; padding:20rpx 0; border-radius:16rpx; font-size:26rpx; font-weight:600; }
.sc-mb.cancel { background:#F5F5F5; color:#666; }
.sc-mb.save { background:linear-gradient(135deg,#FF9800,#FFB74D); color:#fff; }

/* ---- 骰子 ---- */
.dc-wrap { display:flex; flex-direction:column; align-items:center; padding:40rpx 0; }
.dc-pick { margin-bottom:40rpx; text-align:center; }
.dc-pick-l { font-size:24rpx; color:#999; display:block; margin-bottom:12rpx; }
.dc-pick-row { display:flex; gap:16rpx; justify-content:center; }
.dc-pick-n {
  width:64rpx; height:64rpx; border-radius:50%; border:2rpx solid #E0E0E0;
  display:flex; align-items:center; justify-content:center;
  font-size:28rpx; font-weight:600; color:#666; background:#fff;
}
.dc-pick-n.on { border-color:#FF9800; background:#FFF3E0; color:#FF9800; }
.dc-dices { display:flex; flex-wrap:wrap; gap:20rpx; justify-content:center; margin-bottom:24rpx; }
.dc-box {
  width:140rpx; height:140rpx; border-radius:20rpx; background:#fff;
  box-shadow:0 6rpx 24rpx rgba(0,0,0,0.1); display:flex; align-items:center; justify-content:center;
}
.dc-box.rolling { animation:dc-shake 0.06s linear infinite; }
@keyframes dc-shake {
  0% { transform:rotate(0deg); }
  25% { transform:rotate(10deg) scale(1.05); }
  50% { transform:rotate(0deg); }
  75% { transform:rotate(-10deg) scale(1.05); }
  100% { transform:rotate(0deg); }
}
.dc-face {
  width:110rpx; height:110rpx; display:grid; grid-template-columns:repeat(3,1fr); grid-template-rows:repeat(3,1fr);
  padding:8rpx;
}
.dc-dot {
  width:24rpx; height:24rpx; border-radius:50%; align-self:center; justify-self:center;
}
.dc-dot.on { background:#F44336; box-shadow:0 2rpx 4rpx rgba(244,67,54,0.3); }
.dc-total { display:flex; align-items:baseline; gap:8rpx; margin-bottom:24rpx; }
.dc-total-t { font-size:24rpx; color:#999; }
.dc-total-n { font-size:56rpx; font-weight:800; color:#FF9800; }
.dc-btn {
  display:inline-flex; align-items:center; justify-content:center;
  padding:20rpx 80rpx; background:linear-gradient(135deg,#FF9800,#FFB74D);
  border-radius:44rpx; box-shadow:0 4rpx 20rpx rgba(255,152,0,0.4);
}
.dc-btn-t { font-size:30rpx; color:#fff; font-weight:700; }
</style>
