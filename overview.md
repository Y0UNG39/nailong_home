# 🎨 奶龙的家 — 炫酷界面改造总结

## 改造目标
保留原有的温暖金色情侣氛围，大幅提升视觉冲击力和交互趣味性。

## 改动文件一览

### 🎯 设计系统（根基）
- **`uni.scss`** — 全面升级设计令牌
  - 新增炫酷扩展色（$gold, $warm-pink, $sunset, 多级发光色）
  - 新增高级渐变（$gradient-sunset, $gradient-aurora, $gradient-ember, $gradient-warm-glow）
  - 新增缓动函数（$ease-out-quart/quint/expo, $ease-spring）
  - 新增 Mixins（glass-card-glow, card-glow, btn-glow, text-glow, text-gradient-gold, pulse-border 等）
  - 新增 15+ 关键帧动画（fadeInUp, fadeInScale, float, glowPulse, shimmer, bounceIn, twinkle, particleFall, particleRise, auroraBg 等）

### 🌌 全局氛围
- **`App.vue`** — 新增全局粒子背景
  - 10 个浮动 emoji 粒子（✨💛🌟⭐）从底部缓慢上升
  - 全局 `stagger-enter` CSS 类，支持子元素交错入场

### 📐 布局组件
- **`components/page-layout/index.vue`** — 新增页面进入动画（fade + slide up）

### 🏠 首页（最大改动）
- **`pages/home/index.vue`**
  - 头部：动态光晕背景（aurora 呼吸效果），浮动 sparkle 粒子
  - 头像：glow 发光脉冲边框
  - 爱心：增强心跳动画 + 发光滤镜 + 环绕微型粒子
  - 天数数字：超大 96rpx 字号，发光呼吸动画
  - 互动币卡片：旋转金色光晕环 + 呼吸脉冲发光
  - 快捷入口：线性渐变图标背景 + 弹性点击回馈
  - 梦想进度条：流光渐变 + 高光扫过动画 + 发光阴影
  - 所有卡片增加 `stagger-enter` 交错入场

### 🚪 启动页
- **`pages/setup/index.vue`**
  - 动态光晕背景 + Logo 浮动 + 旋转光环
  - 按钮：日落渐变 + 发光阴影
  - 表单/邀请码卡片：顶部流光条 + 弹性点击反馈

### ⚙️ 更多页
- **`pages/profile/index.vue`**
  - 所有菜单卡片：毛玻璃光晕版 + 顶部金色流光条
  - Badge：渐变背景 + 发光阴影
  - 券包卡片：渐变背景 + 微光效
  - 按钮交互：统一弹性缓动

### 🎮 乐园页
- **`pages/arcade/index.vue`**
  - 子 Tab：emoji 图标 + 弹性切换
  - 刮刮卡：金色渐变背景 + 涂层添加金粉/花纹 + 发光边框
  - 骰子：选中数量编号发光阴影 + 摇动边框变色
  - 老虎机：深色暗夜主题机框 + 发光文字标题
  - 结果文字：弹性弹入动画

### 📅 日历 & 记录页
- **`pages/calendar/index.vue`** — 风格对齐：玻璃光晕版卡片 + 渐变按钮 + 优化过渡
- **`pages/record/index.vue`** — 同上，风格统一

## 核心技术亮点

| 技术 | 用法 |
|------|------|
| `cubic-bezier(0.25, 1, 0.5, 1)` ease-out-quart | 所有过渡动画的默认缓动，平滑自然 |
| `cubic-bezier(0.34, 1.56, 0.64, 1)` spring | 按钮弹性点击、弹入动画 |
| `backdrop-filter: blur()` | 毛玻璃效果 |
| `text-shadow` 发光 | 关键数字/文字的视觉突出 |
| `@keyframes` 粒子动画 | 全局氛围漂浮 |
| `stagger-enter` 交错类 | 子元素依次入场的视差层次感 |

## 下一步可继续优化的方向
- 给 shop、wheel、expense 页面也应用同样的炫酷设计风格
- 添加更丰富的动效（如页面切换过渡）
- 引入 Lottie 动画做节日/成就庆祝效果
