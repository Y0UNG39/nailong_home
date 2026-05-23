<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '@/store/index'

const store = useAppStore()
const activeTab = ref<'dreams' | 'places' | 'next'>('dreams')

// Mock
const dreams = ref([
  { _id:'1', title:'去冰岛看极光', category:'travel', status:'dreaming' as const, likes:['a','b'] },
  { _id:'2', title:'一起买一个投影仪', category:'home', status:'dreaming' as const, likes:['a'] },
  { _id:'3', title:'打卡100家火锅店', category:'food', status:'dreaming' as const, likes:['a','b'] },
  { _id:'4', title:'一起去潜水', category:'experience', status:'completed' as const, likes:['a','b'] },
])

const places = ref([
  { _id:'1', name:'海底捞(万达店)', category:'restaurant', source:'want_to_go' as const, matched: true },
  { _id:'2', name:'迪士尼乐园', category:'spot', source:'want_to_go' as const, matched: false },
  { _id:'3', name:'想看的电影《xxx》', category:'cinema', source:'next_time' as const, matched: false },
])

const myOpenid = ref(store.openid || '')
const shakenResult = ref<any>(null)

function onShake() {
  const pool = places.value.filter(p => p.source === 'next_time')
  if (pool.length === 0) {
    uni.showToast({ title: '还没添加呢', icon: 'none' })
    return
  }
  shakenResult.value = pool[Math.floor(Math.random() * pool.length)]
  uni.showToast({ title: '摇到了「' + shakenResult.value.name + '」', icon: 'none' })
}

function onDreamLike(dream: any) { dream.likes.push(store.openid || '') }
</script>

<template>
  <page-layout>
    <view class="sub-tabs">
      <view class="sub-tab" :class="{ active: activeTab === 'dreams' }" @tap="activeTab = 'dreams'">⭐ 梦想板</view>
      <view class="sub-tab" :class="{ active: activeTab === 'places' }" @tap="activeTab = 'places'">📍 想去清单</view>
      <view class="sub-tab" :class="{ active: activeTab === 'next' }" @tap="activeTab = 'next'">🎲 下次一定</view>
    </view>

    <!-- 梦想板 -->
    <view v-if="activeTab === 'dreams'" class="dream-grid">
      <view class="dream-col" v-for="d in dreams" :key="d._id">
        <dream-card :dream="d" :myOpenid="myOpenid" @like="onDreamLike" />
      </view>
    </view>

    <!-- 想去清单 -->
    <view v-if="activeTab === 'places'">
      <place-item
        v-for="p in places.filter(x => x.source === 'want_to_go')" :key="p._id"
        :place="p" :matched="p.matched"
        myStatus="want"
        @addToDream="() => dreams.push({ _id:Date.now()+'', title:p.name, category:p.category, status:'dreaming', likes:[] })"
      />
    </view>

    <!-- 下次一定 -->
    <view v-if="activeTab === 'next'">
      <place-item shaker @shakeNext="onShake" />
      <place-item
        v-for="p in places.filter(x => x.source === 'next_time')" :key="p._id"
        :place="p" myStatus="want"
      />
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
.dream-grid { display: flex; flex-wrap: wrap; }
.dream-col { width: 50%; }
.dream-col:nth-child(odd) { padding-right: 10rpx; }
.dream-col:nth-child(even) { padding-left: 10rpx; }
</style>
