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
      <view class="action-btn" v-if="showDelete" @tap.stop="onEdit"><text>✎</text></view>
      <view class="action-btn del" v-if="showDelete" @tap.stop="onDelete"><text>✕</text></view>
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
@import '@/uni.scss';

.card {
  @include glass-card;
  overflow: hidden;
  position: relative;
  transition: transform 0.2s;
  &:active { transform: scale(0.98); }
}
.card.soldout { opacity: 0.6; }
.img-area {
  height: 160rpx;
  background: linear-gradient(135deg, $primary-bg, $primary-light);
  display: flex; align-items: center; justify-content: center;
  position: relative;
}
.img-icon { font-size: 56rpx; }
.type-tag {
  position: absolute; top: 14rpx; left: 14rpx;
  padding: 4rpx 14rpx; border-radius: 14rpx;
  font-size: $text-xs; color: $white; font-weight: 600;
}
.action-btn {
  position: absolute; top: 10rpx; right: 10rpx;
  width: 56rpx; height: 56rpx; border-radius: 50%;
  background: rgba(0,0,0,0.35);
  display: flex; align-items: center; justify-content: center;
  font-size: 24rpx; color: $white; z-index: 1;
}
.action-btn.del { right: 72rpx; background: rgba(33,150,243,0.7); }
.body { padding: 18rpx 20rpx; }
.name { font-size: $text-base; font-weight: 700; color: $text; }
.desc { font-size: $text-sm; color: $text-muted; margin-top: 6rpx; display: block; }
.bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 14rpx; }
.price { display: flex; align-items: center; }
.p-icon { font-size: 26rpx; margin-right: 4rpx; }
.p-value { font-size: $text-lg; font-weight: 800; color: $primary; }
.stock { font-size: $text-xs; color: $text-faint; }
.stock.sold { color: $error; font-weight: 600; }
.buy-btn {
  margin-top: 16rpx; padding: 16rpx 0; text-align: center;
  @include btn-primary;
}
.sold-overlay {
  position: absolute; inset: 0;
  background: rgba(255,255,255,0.4); backdrop-filter: blur(2rpx);
  display: flex; align-items: center; justify-content: center;
  font-size: 40rpx; font-weight: 900; color: $primary;
}
</style>
