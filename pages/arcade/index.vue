<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAppStore } from '@/store/index'

const store = useAppStore()
const activeArcade = ref<'gacha' | 'shop'>('shop')

const shopItems = ref<any[]>([])
const showCreateShop = ref(false)
const editingShopId = ref('')
const shopForm = ref({ type: 'service', name: '', description: '', price: 1, stock: 1 })
const shopSubmitting = ref(false)

// 扭蛋奖池
const gachaPool = ref<any[]>([])
const showCreatePool = ref(false)
const editingPoolId = ref('')
const poolForm = ref({ type: 'reward', label: '', icon: '🎁', weight: 10, description: '', coinValue: 1, fertilizerTier: 'basic', fragmentSeries: 'star' })
const poolSubmitting = ref(false)

function loadArcadeData() {
  if (!store.coupleId) return

  wx.cloud.callFunction({ name: 'getShopItems', data: { coupleId: store.coupleId } }).then(res => {
    if (res.result.success) shopItems.value = res.result.items || []
  }).catch(() => {})

  wx.cloud.callFunction({ name: 'getGachaPool', data: { coupleId: store.coupleId } }).then(res => {
    if (res.result.success) gachaPool.value = res.result.items || []
  }).catch(() => {})
}

async function onShopDelete(item: any) {
  const ok = await uni.showModal({ title: '确认删除', content: `确定删除「${item.name}」吗？` })
  if (!ok.confirm) return
  try {
    shopItems.value = shopItems.value.filter(i => i._id !== item._id)
    uni.showToast({ title: '已删除', icon: 'success' })
    const res = await wx.cloud.callFunction({ name: 'shopDelete', data: { itemId: item._id } })
    if (!res.result.success) {
      shopItems.value.push(item)
      uni.showToast({ title: '删除失败', icon: 'none' })
    } else {
      loadArcadeData()
    }
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
  } catch {
    uni.showToast({ title: '购买失败', icon: 'none' })
  }
}

function onShopEdit(item: any) {
  editingShopId.value = item._id
  shopForm.value = { type: item.type, name: item.name, description: item.description || '', price: item.price, stock: item.stock }
  showCreateShop.value = true
}

async function submitShopItem() {
  if (!shopForm.value.name.trim()) {
    uni.showToast({ title: '请输入商品名称', icon: 'none' })
    return
  }
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
      showCreateShop.value = false
      editingShopId.value = ''
      shopForm.value = { type: 'service', name: '', description: '', price: 1, stock: 1 }
      loadArcadeData()
    } else {
      uni.showToast({ title: res.result.error || (isEdit ? '更新失败' : '上架失败'), icon: 'none' })
    }
  } catch {
    uni.showToast({ title: isEdit ? '更新失败' : '上架失败', icon: 'none' })
  } finally {
    shopSubmitting.value = false
  }
}

function onPoolEdit(item: any) {
  editingPoolId.value = item._id
  poolForm.value = { type: item.type, label: item.label, icon: item.icon, weight: item.weight, description: item.description || '', coinValue: item.coinValue || 1, fertilizerTier: item.fertilizerTier || 'basic', fragmentSeries: item.fragmentSeries || 'star' }
  showCreatePool.value = true
}

async function submitPoolItem() {
  if (!poolForm.value.label.trim() || !poolForm.value.description.trim()) {
    uni.showToast({ title: '请填写标签和描述', icon: 'none' })
    return
  }
  if (!store.coupleId) return
  poolSubmitting.value = true
  const isEdit = !!editingPoolId.value
  try {
    const res = await wx.cloud.callFunction({
      name: isEdit ? 'gachaPoolUpdate' : 'gachaPoolCreate',
      data: isEdit
        ? { itemId: editingPoolId.value, type: poolForm.value.type, label: poolForm.value.label.trim(), icon: poolForm.value.icon, weight: poolForm.value.weight, description: poolForm.value.description.trim(), coinValue: poolForm.value.coinValue, fertilizerTier: poolForm.value.fertilizerTier, fragmentSeries: poolForm.value.fragmentSeries }
        : { coupleId: store.coupleId, type: poolForm.value.type, label: poolForm.value.label.trim(), icon: poolForm.value.icon, weight: poolForm.value.weight, description: poolForm.value.description.trim(), coinValue: poolForm.value.coinValue, fertilizerTier: poolForm.value.fertilizerTier, fragmentSeries: poolForm.value.fragmentSeries }
    })
    if (res.result.success) {
      uni.showToast({ title: isEdit ? '已更新' : '已添加', icon: 'success' })
      showCreatePool.value = false
      editingPoolId.value = ''
      poolForm.value = { type: 'reward', label: '', icon: '🎁', weight: 10, description: '', coinValue: 1, fertilizerTier: 'basic', fragmentSeries: 'star' }
      loadArcadeData()
    } else {
      uni.showToast({ title: res.result.error || (isEdit ? '更新失败' : '添加失败'), icon: 'none' })
    }
  } catch {
    uni.showToast({ title: isEdit ? '更新失败' : '添加失败', icon: 'none' })
  } finally {
    poolSubmitting.value = false
  }
}

async function deletePoolItem(item: any) {
  const ok = await uni.showModal({ title: '确认删除', content: `确定删除「${item.label}」吗？` })
  if (!ok.confirm) return
  try {
    gachaPool.value = gachaPool.value.filter(i => i._id !== item._id)
    uni.showToast({ title: '已删除', icon: 'success' })
    const res = await wx.cloud.callFunction({ name: 'gachaPoolDelete', data: { itemId: item._id } })
    if (!res.result.success) {
      gachaPool.value.push(item)
      uni.showToast({ title: '删除失败', icon: 'none' })
    } else {
      loadArcadeData()
    }
  } catch {
    gachaPool.value.push(item)
    uni.showToast({ title: '删除失败', icon: 'none' })
  }
}

function onGachaComplete(_res: any) {
  wx.cloud.callFunction({ name: 'getBalance', data: { coupleId: store.coupleId } }).then(res => {
    if (res.result.success) store.setBalance(res.result.balance)
  })
}

async function setBalance999() {
  if (!store.coupleId) return
  try {
    const res = await wx.cloud.callFunction({ name: 'setBalanceTest', data: {} })
    if (res.result.success) {
      store.setBalance(999)
      uni.showToast({ title: '余额已设为 999', icon: 'success' })
    }
  } catch { uni.showToast({ title: '失败', icon: 'none' }) }
}

const poolTypeCfg: Record<string, { label: string; color: string }> = {
  reward: { label: '小奖励', color: '#FF9800' },
  coins: { label: '互动币', color: '#FFB800' },
  fertilizer: { label: '肥料', color: '#4CAF50' },
  fragment: { label: '成就碎片', color: '#2196F3' },
  rare: { label: '限定卡', color: '#9C27B0' }
}

onShow(() => {
  loadArcadeData()
})
</script>

<template>
  <page-layout>
    <!-- 乐园子Tab -->
    <view class="sub-tabs">
      <view class="sub-tab" :class="{ active: activeArcade === 'shop' }" @tap="activeArcade = 'shop'">🛒 小卖部</view>
      <view class="sub-tab" :class="{ active: activeArcade === 'gacha' }" @tap="activeArcade = 'gacha'">🎰 扭蛋机</view>
    </view>

    <!-- 内测：一键设余额 -->
    <view class="test-btn" @tap="setBalance999"><text>🔧 余额设为999</text></view>

    <!-- 小卖部 -->
    <view class="tab-content" v-if="activeArcade === 'shop'">
      <view class="shop-grid">
        <view class="shop-col" v-for="item in shopItems" :key="item._id">
          <shop-item :item="item" showDelete @purchase="onShopPurchase" @delete="onShopDelete" @edit="onShopEdit" />
        </view>
      </view>
      <empty-state v-if="shopItems.length === 0" icon="🛒" text="货架空空，快来上架第一个商品吧" />
      <view class="fab" @tap="showCreateShop = true">
        <text class="fab-icon">+</text><text>上架商品</text>
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
    </view>

    <!-- 扭蛋机 -->
    <view class="tab-content" v-if="activeArcade === 'gacha'">
      <gacha-machine :coupleId="store.coupleId" @drawComplete="onGachaComplete" />

      <!-- 奖池管理 -->
      <view class="pool-section">
        <view class="section-header">
          <text class="section-title">🎯 奖池配置</text>
          <text class="section-hint">{{ gachaPool.length }} 个奖励 | 总权重 {{ gachaPool.reduce((s: number, x: any) => s + x.weight, 0) }}</text>
        </view>
        <view class="pool-list" v-if="gachaPool.length > 0">
          <view class="pool-item" v-for="item in gachaPool" :key="item._id">
            <view class="pool-tag" :style="{ background: (poolTypeCfg[item.type] || poolTypeCfg.reward).color }">
              <text>{{ (poolTypeCfg[item.type] || poolTypeCfg.reward).label }}</text>
            </view>
            <text class="pool-icon">{{ item.icon }}</text>
            <view class="pool-info">
              <text class="pool-label">{{ item.label }}</text>
              <text class="pool-desc">{{ item.description }}</text>
            </view>
            <text class="pool-weight">权重 {{ item.weight }}</text>
            <view class="pool-edit" @tap="onPoolEdit(item)"><text>✎</text></view>
            <view class="pool-del" @tap="deletePoolItem(item)"><text>🗑️</text></view>
          </view>
        </view>
        <empty-state v-else icon="🎰" text="奖池为空，添加奖励后扭蛋机才能用" />
      </view>

      <view class="fab" @tap="showCreatePool = true">
        <text class="fab-icon">+</text><text>添加奖励</text>
      </view>

      <!-- 添加奖池弹窗 -->
      <view v-if="showCreatePool" class="modal-mask" @tap="showCreatePool = false; editingPoolId = ''">
        <view class="modal-sheet" @tap.stop>
          <view class="modal-header">
            <text class="modal-title">{{ editingPoolId ? '编辑扭蛋奖励' : '添加扭蛋奖励' }}</text>
            <text class="modal-close" @tap="showCreatePool = false; editingPoolId = ''">✕</text>
          </view>
          <scroll-view class="modal-body" scroll-y>
            <view class="form-group">
              <text class="form-label"><text class="required">*</text> 奖励类型</text>
              <view class="seg-group">
                <view v-for="t in [
                  {k:'reward',v:'小奖励'},{k:'coins',v:'互动币'},{k:'fertilizer',v:'肥料'},{k:'fragment',v:'成就碎片'},{k:'rare',v:'限定卡'}
                ]" :key="t.k" class="seg" :class="{ sel: poolForm.type === t.k }" @tap="poolForm.type = t.k">{{ t.v }}</view>
              </view>
            </view>
            <view class="form-group">
              <text class="form-label"><text class="required">*</text> 图标 emoji</text>
              <input class="form-input" v-model="poolForm.icon" placeholder="例如 🎁" maxlength="5" />
            </view>
            <view class="form-group">
              <text class="form-label"><text class="required">*</text> 标签</text>
              <input class="form-input" v-model="poolForm.label" placeholder="例如：神秘小礼物" maxlength="20" />
            </view>
            <view class="form-group">
              <text class="form-label"><text class="required">*</text> 描述文字</text>
              <input class="form-input" v-model="poolForm.description" placeholder="例如：对方为你做一件事" maxlength="50" />
            </view>
            <view class="form-row">
              <view class="form-group half">
                <text class="form-label"><text class="required">*</text> 权重(概率)</text>
                <input class="form-input" v-model.number="poolForm.weight" type="number" placeholder="10" />
              </view>
              <view class="form-group half" v-if="poolForm.type === 'coins'">
                <text class="form-label"><text class="required">*</text> 金币数量</text>
                <input class="form-input" v-model.number="poolForm.coinValue" type="number" placeholder="1" />
              </view>
              <view class="form-group half" v-if="poolForm.type === 'fertilizer'">
                <text class="form-label">肥料等级</text>
                <picker mode="selector" :range="['basic','premium','super']" :value="['basic','premium','super'].indexOf(poolForm.fertilizerTier)" @change="(e: any) => poolForm.fertilizerTier = ['basic','premium','super'][e.detail.value]">
                  <text class="form-input picker-val">{{ poolForm.fertilizerTier }}</text>
                </picker>
              </view>
              <view class="form-group half" v-if="poolForm.type === 'fragment'">
                <text class="form-label">碎片系列</text>
                <picker mode="selector" :range="['star','moon','flower']" :value="['star','moon','flower'].indexOf(poolForm.fragmentSeries)" @change="(e: any) => poolForm.fragmentSeries = ['star','moon','flower'][e.detail.value]">
                  <text class="form-input picker-val">{{ poolForm.fragmentSeries }}</text>
                </picker>
              </view>
            </view>
          </scroll-view>
          <view class="modal-footer">
            <view class="submit-btn" :class="{ disabled: poolSubmitting }" @tap="!poolSubmitting && submitPoolItem()">
              <text>{{ poolSubmitting ? '保存中...' : editingPoolId ? '保存修改' : '添加奖励' }}</text>
            </view>
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

/* 奖池管理 */
.pool-section {
  background: rgba(255,255,255,0.85); backdrop-filter: blur(16rpx);
  border-radius: 24rpx; padding: 20rpx 0; margin-top: 24rpx;
  box-shadow: 0 6rpx 28rpx rgba(255,184,0,0.06);
  border: 1rpx solid rgba(255,255,255,0.5);
}
.section-header { padding: 0 28rpx 16rpx; border-bottom: 1rpx solid rgba(255,184,0,0.06); display: flex; align-items: baseline; justify-content: space-between; }
.section-title { font-size: 28rpx; font-weight: 700; color: #333; }
.section-hint { font-size: 22rpx; color: #bbb; }
.pool-list { padding: 0 28rpx; }
.pool-item { display: flex; align-items: center; padding: 18rpx 0; border-bottom: 1rpx solid rgba(255,184,0,0.04); }
.pool-item:last-child { border-bottom: none; }
.pool-tag { padding: 4rpx 12rpx; border-radius: 10rpx; font-size: 20rpx; color: #fff; font-weight: 600; margin-right: 12rpx; flex-shrink: 0; }
.pool-icon { font-size: 32rpx; margin-right: 12rpx; }
.pool-info { flex: 1; min-width: 0; }
.pool-label { font-size: 26rpx; font-weight: 600; color: #333; display: block; }
.pool-desc { font-size: 22rpx; color: #999; margin-top: 2rpx; }
.pool-weight { font-size: 22rpx; color: #bbb; margin-right: 10rpx; flex-shrink: 0; }
.pool-del { padding: 8rpx; font-size: 28rpx; }
.pool-edit { padding: 8rpx; font-size: 28rpx; color: #2196F3; }

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
.picker-val { display:flex; align-items:center; color:#333; }
</style>
