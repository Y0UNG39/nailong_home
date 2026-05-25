<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAppStore } from '@/store/index'

const store = useAppStore()
const activeTab = ref<'shop' | 'wheel'>('shop')

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
interface WItem { _id: string; label: string }
const wheelItems = ref<WItem[]>([])
const wNewLabel = ref('')
const wSpinning = ref(false)
const wResult = ref('')
const wBlink = ref(-1)
const wRotate = ref(0)

const radius = 210

// 扇区样式：每个选项建一个彩色条，旋转让中间对准圆心外侧
const wSlices = computed(() => {
  const n = wheelItems.value.length
  if (n === 0) return []
  const deg = 360 / n
  return wheelItems.value.map((_, i) => ({
    background: COLORS[i % COLORS.length],
    transform: `rotate(${i * deg + deg / 2}deg) translateY(-${radius}rpx)`,
    hl: wBlink.value === i
  }))
})

function loadWheelItems() {
  if (!store.coupleId) return
  wx.cloud.callFunction({ name: 'getWheelItems', data: { coupleId: store.coupleId } }).then(
    (res: any) => { if (res.result.success) wheelItems.value = res.result.items }
  ).catch(() => {})
}

function wSpin() {
  if (wSpinning.value || wheelItems.value.length === 0) return
  wSpinning.value = true; wResult.value = ''; wBlink.value = -1

  const n = wheelItems.value.length
  const wi = Math.floor(Math.random() * n)
  const dur = 3000; const tick = 70; const s = Date.now(); let fi = 0
  const timer = setInterval(() => {
    const p = Math.min((Date.now() - s) / dur, 1)
    const e = 1 - Math.pow(1 - p, 3)
    wRotate.value = e * 6 * 360
    fi = (fi + 1) % n; wBlink.value = fi
    if (p >= 1) {
      clearInterval(timer)
      wRotate.value = 0; wBlink.value = wi
      nextTick(() => { wResult.value = wheelItems.value[wi].label; wSpinning.value = false })
    }
  }, tick)
}

async function wAdd() {
  const label = wNewLabel.value.trim()
  if (!label) { uni.showToast({ title: '请输入选项', icon: 'none' }); return }
  if (!store.coupleId) return
  wNewLabel.value = ''
  try {
    const res: any = await wx.cloud.callFunction({ name: 'wheelItemCreate', data: { coupleId: store.coupleId, label } })
    if (res.result.success) { loadWheelItems(); nextTick(() => drawWheel()) }
    else { uni.showToast({ title: res.result.error || '添加失败', icon: 'none' }) }
  } catch { uni.showToast({ title: '添加失败', icon: 'none' }) }
}

async function wDelete(item: WItem) {
  const ok = await uni.showModal({ title: '确认删除', content: `删除「${item.label}」？` })
  if (!ok.confirm) return
  wheelItems.value = wheelItems.value.filter(i => i._id !== item._id)
    try {
    const res: any = await wx.cloud.callFunction({ name: 'wheelItemDelete', data: { itemId: item._id } })
    if (!res.result.success) { loadWheelItems(); uni.showToast({ title: '删除失败', icon: 'none' }) }
  } catch { loadWheelItems(); uni.showToast({ title: '删除失败', icon: 'none' }) }
}

async function wClear() {
  if (!store.coupleId) return
  const ok = await uni.showModal({ title: '清空全部', content: '确定清空所有选项吗？' })
  if (!ok.confirm) return
  wheelItems.value = []
    try {
    const res: any = await wx.cloud.callFunction({ name: 'wheelItemClearAll', data: { coupleId: store.coupleId } })
    if (!res.result.success) uni.showToast({ title: '清空失败', icon: 'none' })
  } catch { uni.showToast({ title: '清空失败', icon: 'none' }) }
}

// 切到转盘 tab 时加载数据
watch(activeTab, (v) => { if (v === 'wheel') loadWheelItems() })

onShow(() => { loadArcadeData() })

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

async function setBalance999() {
  if (!store.coupleId) return
  try {
    const res = await wx.cloud.callFunction({ name: 'setBalanceTest', data: {} })
    if (res.result.success) { store.setBalance(999); uni.showToast({ title: '余额已设为 999', icon: 'success' }) }
  } catch { uni.showToast({ title: '失败', icon: 'none' }) }
}

onShow(() => { loadArcadeData() })
</script>

<template>
  <page-layout>
    <!-- 乐园子Tab -->
    <view class="sub-tabs">
      <view class="sub-tab" :class="{ active: activeTab === 'shop' }" @tap="activeTab = 'shop'">🛒 小卖部</view>
      <view class="sub-tab" :class="{ active: activeTab === 'wheel' }" @tap="activeTab = 'wheel'">🎡 转盘</view>
    </view>

    <!-- 内测：一键设余额 -->
    <view class="test-btn" @tap="setBalance999"><text>🔧 余额设为999</text></view>

    <!-- 小卖部 -->
    <view class="tab-content" v-if="activeTab === 'shop'">
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

      <!-- CSS 旋转圆盘（始终显示） -->
      <view class="wh-stage">
        <view class="wh-wheel" :style="{ transform: 'rotate(' + wRotate + 'deg)' }">
          <view
            v-for="(s, i) in wSlices" :key="wheelItems[i]._id"
            class="wh-slice"
            :class="{ hl: s.hl }"
            :style="{ background: s.background, transform: s.transform }"
          >
            <text class="whs-label">{{ wheelItems[i].label }}</text>
          </view>
          <view class="wh-empty-inner" v-if="wheelItems.length === 0">
            <text class="whei-icon">🎡</text>
            <text class="whei-text">添加选项</text>
          </view>
        </view>
        <view class="wh-ptr"></view>
        <view class="wh-btn" :class="{ off: wSpinning || wheelItems.length === 0 }" @tap="wSpin">
          <text class="wh-btn-t">抽奖</text>
        </view>
      </view>

      <view class="wh-result" v-if="wResult">
        <text class="whr-text">🎉 中了：<text class="whr-label">{{ wResult }}</text></text>
      </view>

      <view class="wh-mgmt">
        <view class="wh-add">
          <input class="wha-inp" v-model="wNewLabel" placeholder="选项名称" maxlength="20" @confirm="wAdd" />
          <view class="wha-btn" @tap="wAdd"><text class="wha-btn-t">+ 添加</text></view>
        </view>
        <view class="wh-list" v-if="wheelItems.length > 0">
          <view class="wh-chip" v-for="item in wheelItems" :key="item._id">
            <view class="whc-dot" :style="{ background: COLORS[wheelItems.indexOf(item) % COLORS.length] }"></view>
            <text class="whc-label">{{ item.label }}</text>
            <text class="whc-del" @tap="wDelete(item)">✕</text>
          </view>
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
  position:relative; display:flex; align-items:center; justify-content:center;
  width:600rpx; height:600rpx; margin:0 auto 16rpx;
}
.wh-wheel {
  position:relative; width:520rpx; height:520rpx; border-radius:50%;
  border:6rpx solid #eee; background:#fafafa;
  transition: none;
}
.wh-slice {
  position:absolute; top:50%; left:50%;
  width:160rpx; height:48rpx; margin-left:-80rpx; margin-top:-24rpx;
  transform-origin:center center; border-radius:10rpx;
  display:flex; align-items:center; justify-content:center;
  border:3rpx solid transparent; transition:border-color 0.1s;
}
.wh-slice.hl { border-color:#FFD700; box-shadow:0 0 16rpx rgba(255,215,0,0.7); }
.whs-label { font-size:20rpx; color:#fff; font-weight:600; white-space:nowrap; overflow:hidden; max-width:130rpx; }
.wh-ptr {
  position:absolute; top:2rpx; left:50%; transform:translateX(-50%);
  width:0; height:0;
  border-left:22rpx solid transparent;
  border-right:22rpx solid transparent;
  border-top:36rpx solid #F44336;
  z-index:2;
}
.wh-btn {
  position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
  width:100rpx; height:100rpx; border-radius:50%;
  background:linear-gradient(135deg,#FF9800,#FFB74D);
  display:flex; align-items:center; justify-content:center;
  box-shadow:0 4rpx 20rpx rgba(255,152,0,0.45); z-index:2;
}
.wh-btn.off { opacity:0.5; pointer-events:none; }
.wh-btn-t { font-size:26rpx; color:#fff; font-weight:700; }

.wh-empty-inner {
  position:absolute; inset:0; display:flex; flex-direction:column;
  align-items:center; justify-content:center; z-index:1;
}
.whei-icon { font-size:56rpx; display:block; margin-bottom:12rpx; }
.whei-text { font-size:26rpx; color:#bbb; }

.wh-result { text-align:center; padding:12rpx; }
.whr-text { font-size:28rpx; color:#FF9800; }
.whr-label { font-size:34rpx; font-weight:800; color:#F44336; }

.wh-mgmt { margin-top:12rpx; }
.wh-add { display:flex; gap:8rpx; margin-bottom:16rpx; }
.wha-inp { flex:2; height:72rpx; border:2rpx solid #F0F0F0; border-radius:16rpx; padding:0 16rpx; font-size:26rpx; background:#FAFAFA; }
.wha-btn { height:72rpx; line-height:72rpx; padding:0 24rpx; background:linear-gradient(135deg,#FF9800,#FFB74D); border-radius:16rpx; flex-shrink:0; }
.wha-btn-t { font-size:26rpx; color:#fff; font-weight:600; }
.wh-list { display:flex; flex-wrap:wrap; gap:12rpx; }
.wh-chip { display:flex; align-items:center; gap:8rpx; background:#F5F5F5; border-radius:20rpx; padding:10rpx 14rpx; }
.whc-dot { width:14rpx; height:14rpx; border-radius:50%; flex-shrink:0; }
.whc-label { font-size:24rpx; color:#333; }
.whc-del { font-size:24rpx; color:#bbb; padding:4rpx; }
</style>
