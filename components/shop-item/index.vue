<script setup lang="ts">
import { computed } from 'vue'

const typeCfg: Record<string, { label: string; color: string; icon: string }> = {
  service: { label: '服务券', color: '#2196F3', icon: '🛎️' },
  physical: { label: '实物券', color: '#FF9800', icon: '🎁' },
  privilege: { label: '特权券', color: '#9C27B0', icon: '👑' }
}

interface Item {
  _id: string; type: 'service' | 'physical' | 'privilege'
  name: string; description: string; price: number
  image?: string; stock: number; sold_out?: boolean
  creatorNickname?: string
}

interface Props { item: Item; showPurchase?: boolean; showDelete?: boolean }
const props = withDefaults(defineProps<Props>(), { showPurchase: true, showDelete: false })
const emit = defineEmits<{ purchase: [item: Item]; delete: [item: Item]; edit: [item: Item] }>()

const cfg = computed(() => typeCfg[props.item.type] || typeCfg.service)
const soldOut = computed(() => props.item.sold_out || props.item.stock <= 0)

function onPurchase() { emit('purchase', props.item) }
function onDelete() { emit('delete', props.item) }
function onEdit() { emit('edit', props.item) }
</script>

<template>
  <view class="card" :class="{ soldout: soldOut }">
    <view class="img-area">
      <text class="img-icon">{{ cfg.icon }}</text>
      <view class="type-tag" :style="{ background: cfg.color }">
        <text>{{ cfg.label }}</text>
      </view>
      <view class="del-btn" v-if="showDelete" @tap.stop="onEdit"><text>✎</text></view>
      <view class="del-btn edit" v-if="showDelete" @tap.stop="onDelete"><text>✕</text></view>
    </view>
    <view class="body">
      <text class="name">{{ item.name }}</text>
      <text class="desc" v-if="item.description">{{ item.description }}</text>
      <view class="bottom">
        <view class="price">
          <text class="p-icon">🪙</text>
          <text class="p-value">{{ item.price }}</text>
        </view>
        <text class="stock" v-if="!soldOut">库存 {{ item.stock }}</text>
        <text class="stock sold" v-else>已售罄</text>
      </view>
      <view class="buy-btn" v-if="showPurchase && !soldOut" @tap="onPurchase">
        <text>立即购买</text>
      </view>
    </view>
    <view class="sold-overlay" v-if="soldOut"><text>已售罄</text></view>
  </view>
</template>

<style lang="scss" scoped>
.card {
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(16rpx);
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 6rpx 28rpx rgba(255,184,0,0.06);
  border: 1rpx solid rgba(255,255,255,0.5);
  position: relative;
  transition: transform 0.2s;
  &:active { transform: scale(0.98); }
}
.card.soldout { opacity: 0.6; }
.img-area {
  height: 160rpx; background: linear-gradient(135deg, #FFF8E1, #FFE082);
  display: flex; align-items: center; justify-content: center; position: relative;
}
.img-icon { font-size: 56rpx; }
.type-tag {
  position: absolute; top: 14rpx; left: 14rpx;
  padding: 4rpx 14rpx; border-radius: 14rpx; font-size: 20rpx; color: #fff; font-weight: 600;
}
.del-btn {
  position: absolute; top: 10rpx; right: 10rpx;
  width: 40rpx; height: 40rpx; border-radius: 50%;
  background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;
  font-size: 22rpx; color: #fff;
}
.del-btn.edit { right: 58rpx; background: rgba(33,150,243,0.7); }
.body { padding: 18rpx 20rpx; }
.name { font-size: 30rpx; font-weight: 700; color: #333; }
.desc { font-size: 24rpx; color: #999; margin-top: 6rpx; display: block; }
.bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 14rpx; }
.price { display: flex; align-items: center; }
.p-icon { font-size: 26rpx; margin-right: 4rpx; }
.p-value { font-size: 32rpx; font-weight: 800; color: #FFB800; }
.stock { font-size: 22rpx; color: #bbb; }
.stock.sold { color: #F44336; font-weight: 600; }
.buy-btn {
  margin-top: 16rpx; padding: 14rpx 0; text-align: center;
  background: linear-gradient(135deg, #FFB800, #FFCC00);
  border-radius: 24rpx; font-size: 26rpx; font-weight: 700; color: #fff;
  box-shadow: 0 4rpx 14rpx rgba(255,184,0,0.25);
}
.sold-overlay {
  position: absolute; inset: 0;
  background: rgba(255,255,255,0.4); backdrop-filter: blur(2rpx);
  display: flex; align-items: center; justify-content: center;
  font-size: 40rpx; font-weight: 900; color: #FFB800;
}
</style>
