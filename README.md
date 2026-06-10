一个情侣专属的小程序，记录日常、管理梦想、互动娱乐，让两个人的生活更有仪式感。

## ✨ 功能介绍

### 🏠 首页
- 情侣头像展示与更换
- 互动币余额显示
- 快捷入口：小卖部、转盘、记账
- 梦想完成进度

### 📝 记录
- **日记**：日历视图 + 每日记录，支持文字和图片
- **梦想**：共同制定梦想目标，标记完成进度

### 🎮 乐园
- **刮刮卡**：刮开格子赢取奖励
- **骰子**：1-6 颗骰子自由投掷
- **🎰 老虎机**：消耗互动币转轴，三连最高 30 倍奖励

### 🛒 小卖部
- 创建服务券/实物券/特权券
- 用互动币购买，余额不足自动补贴
- 券包管理与使用

### 💰 记账
- 极简记账：吃饭🍜、交通🚗、娱乐🎮、其他📦
- 支持"TA付"标记
- 按月统计与记录列表

### ⚙️ 更多
- 通知订阅管理
- 券包查看
- 互动币余额设置

## 🛠️ 技术栈

- **前端框架**：uni-app (Vue 3 + TypeScript)
- **状态管理**：Pinia
- **后端服务**：微信云开发（云函数 + 云数据库）
- **开发工具**：HBuilderX + 微信开发者工具

## 🚀 部署指南

### 环境准备

1. 安装 [HBuilderX](https://www.dcloud.io/hbuilderx.html)
2. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
3. 注册 [微信小程序账号](https://mp.weixin.qq.com/)，获取 AppID

### 克隆项目

```bash
git clone git@github.com:Y0UNG39/nailong_home.git
```

### 配置 AppID

1. 用微信开发者工具打开项目
2. 在 `project.config.json` 中填入你的 AppID

### 初始化云开发

1. 在微信开发者工具中开通云开发
2. 在云开发控制台创建以下集合：

| 集合名 | 用途 |
|--------|------|
| `users` | 用户信息 |
| `couples` | 情侣关系 |
| `diary_entries` | 日记记录 |
| `dreams` | 梦想目标 |
| `shop_items` | 小卖部商品 |
| `coupons` | 优惠券/服务券 |
| `expenses` | 记账记录 |
| `coin_logs` | 互动币流水 |
| `wheel_items` | 转盘选项（已改用本地存储） |

### 设置集合权限

将所有集合的权限改为 **「所有用户可读，仅创建者可读写」** 或 **「所有用户可读写」**（具体根据业务需要）。

对于 `expenses` 集合，需要添加复合索引：
- 字段：`coupleId`（升序）+ `date`（升序）

### 部署云函数

在微信开发者工具中，右键点击 `cloudfunctions` 目录下的每个云函数文件夹，选择 **「上传并部署：云端安装依赖」**。

需要部署的云函数：

- `login` - 用户登录
- `getProfileData` - 获取首页数据
- `getHomeData` - 获取首页数据
- `createCouple` - 创建情侣
- `joinCouple` - 加入情侣
- `getDiaries` / `createDiary` / `updateDiary` / `deleteDiary` - 日记 CRUD
- `getDreams` / `dreamCreate` / `dreamUpdate` / `dreamDelete` / `dreamComplete` / `likeDream` - 梦想管理
- `getShopItems` / `shopCreate` / `shopUpdate` / `shopDelete` / `shopPurchase` - 小卖部
- `addExpense` / `getExpenses` / `deleteExpense` - 记账
- `coinChange` - 互动币变更

### 前端构建

在 HBuilderX 中：
1. 点击菜单 **「运行」→「运行到小程序模拟器」→「微信开发者工具」**
2. 首次运行会自动安装 npm 依赖

正式发布时：
1. 点击 **「发行」→「小程序-微信（仅适用于uni-app）」**
2. 填入小程序 AppID
3. 在微信开发者工具中上传代码并提交审核

## 📁 项目结构

```
├── cloudfunctions/        # 云函数
├── pages/
│   ├── home/             # 首页
│   ├── record/           # 记录（日记 + 梦想）
│   ├── calendar/         # 日历（已合并到记录）
│   ├── future/           # 梦想（已合并到记录）
│   ├── arcade/           # 乐园（刮刮卡、骰子、老虎机）
│   ├── shop/             # 小卖部
│   ├── wheel/            # 转盘
│   ├── expense/          # 记账
│   ├── profile/          # 更多
│   └── setup/            # 初始化设置
├── store/                # Pinia 状态管理
├── components/           # 公共组件
├── static/               # 静态资源
└── utils/                # 工具函数
```

## 📄 License

[MIT](LICENSE)
