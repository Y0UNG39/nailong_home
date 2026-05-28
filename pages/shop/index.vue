<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAppStore } from '@/store/index'

const store = useAppStore()

const shopItems = ref<any[]>([])
const showCreateShop = ref(false)
const editingShopId = ref('')
const shopForm = ref({ type: 'service', name: '', description: '', price: 1, stock: 1 })
const shopSubmitting = ref(false)

function loadShopData() {
  if (!store.coupleId) return
  wx.cloud.callFunction({ name: 'getShopItems', data: { coupleId: store.coupleId } }).then(res => {
    if (res.result.success) shopItems.value = res.result.items || []
  }).catch(() => {})
}

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
      const msg = res.result.bailout ? `已补贴${res.result.bailout}币，购买成功` : '已购买「' + item.name + '」'
      uni.showToast({ title: msg, icon: 'success' })
      loadShopData()
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
      loadShopData()
    } else { uni.showToast({ title: res.result.error || (isEdit ? '更新失败' : '上架失败'), icon: 'none' }) }
  } catch { uni.showToast({ title: isEdit ? '更新失败' : '上架失败', icon: 'none' }) } finally {
    shopSubmitting.value = false
  }
}

onShow(() => loadShopData())
</script>

<template>
  <page-layout>
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
  </page-layout>
</template>

<style lang="scss" scoped>
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
</style>
