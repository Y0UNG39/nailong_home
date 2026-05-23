<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '@/store/index'
import { ACHIEVEMENTS } from '@/utils/constants'
import { callFunction } from '@/utils/auth'
import { success, error } from '@/utils/notify'

const store = useAppStore()
const activeArcade = ref<'gacha' | 'shop' | 'achievement'>('gacha')

// 小卖部商品 mock
const shopItems = ref([
  { _id:'1', type:'service' as const, name:'免费按摩5分钟', description:'什么姿势都可以', price:5, stock:1, creatorNickname:'TA' },
  { _id:'2', type:'physical' as const, name:'一杯奶茶', description:'你最喜欢的口味', price:3, stock:2, creatorNickname:'TA' },
  { _id:'3', type:'privilege' as const, name:'免生气券', description:'下次生气立刻失效', price:8, stock:1, creatorNickname:'你' },
  { _id:'4', type:'service' as const, name:'陪逛街不限时', description:'逛到关门都可以', price:10, stock:1, creatorNickname:'你' },
])

// 成就 mock
const unlockedAchs = ref(new Set(['sign7', 'task50', 'complete100', 'day100']))

function onShopPurchase(item: any) {
  success('已购买「' + item.name + '」')
}

function onGachaComplete(res: any) {
  store.addBalance(res?.type === 'coins' ? 2 : -2)
}
</script>

<template>
  <page-layout>
    <!-- 乐园子Tab -->
    <view class="sub-tabs">
      <view class="sub-tab" :class="{ active: activeArcade === 'gacha' }" @tap="activeArcade = 'gacha'">🎰 扭蛋机</view>
      <view class="sub-tab" :class="{ active: activeArcade === 'shop' }" @tap="activeArcade = 'shop'">🛒 小卖部</view>
      <view class="sub-tab" :class="{ active: activeArcade === 'achievement' }" @tap="activeArcade = 'achievement'">🏆 成就树</view>
    </view>

    <!-- 扭蛋机 -->
    <view v-if="activeArcade === 'gacha'">
      <gacha-machine :coupleId="store.coupleId" @drawComplete="onGachaComplete" />
    </view>

    <!-- 小卖部 -->
    <view v-if="activeArcade === 'shop'">
      <view class="shop-grid">
        <view class="shop-col" v-for="item in shopItems" :key="item._id">
          <shop-item :item="item" @purchase="onShopPurchase" />
        </view>
      </view>
    </view>

    <!-- 成就树 -->
    <view v-if="activeArcade === 'achievement'">
      <view class="achieve-grid">
        <achievement-node
          v-for="a in ACHIEVEMENTS" :key="a.id"
          :achievement="{ achievementId: a.id, category: a.category, name: a.name, description: a.desc, icon: a.icon, color: a.color }"
          :unlocked="unlockedAchs.has(a.id)"
        />
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
.shop-grid { display: flex; flex-wrap: wrap; }
.shop-col { width: 50%; }
.shop-col:nth-child(odd) { padding-right: 10rpx; }
.shop-col:nth-child(even) { padding-left: 10rpx; }
.achieve-grid { display: flex; flex-wrap: wrap; justify-content: space-around; }
</style>
