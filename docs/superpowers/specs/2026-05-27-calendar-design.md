# 日历页面设计 — 替换任务页

## 目标

将"奶龙的家"小程序中的任务页面替换为日历页面。日历用于记录两人每天发生的事情，共享可见。

## 范围

- 新建日历页面（替换 pages/tasks）
- 新建 `diary_entries` 数据库集合 + 4 个云函数
- 删除所有任务相关代码（5 个云函数、页面、组件、常量）
- 适配 profile 页统计

## 页面设计

### 日历主页

- 顶部：年月文字 + 左右翻月箭头按钮
- 星期行：日 一 二 三 四 五 六
- 6x7 日历格子
  - 有记录的日期显示小圆点（橙色）
  - 今天日期高亮（橙色背景）
  - 非当月日期灰色
- 点击某天 → 下方展开当天记录列表（同页面内，不跳转）
- 再次点击同一天收起

### 当天记录区

- 标题行：日期 + "写点什么"按钮
- 记录列表，每条显示：
  - 时间（HH:mm）
  - 文字内容
  - 图片（如有，缩略图可点击预览）
  - 作者标识（区分谁写的）
- 左滑显示删除按钮（只能删自己的）
- 点击记录 → 弹出编辑弹窗（只能编辑自己的）

### 输入弹窗

- 弹窗形式（从底部弹起）
- 文字输入框（必填，textarea，max 500 字）
- 图片上传区（可选，最多 1 张，点击上传或拍照）
- 取消 / 保存 按钮
- 编辑模式复用同一弹窗，预填已有内容

## 数据库

### 集合：diary_entries

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 自动生成 |
| coupleId | string | 情侣空间 ID |
| authorId | string | 写的人的 openid |
| date | string | 日期 "2026-05-27" |
| content | string | 文字内容，max 500 |
| imageUrl | string | 图片链接，可为空 |
| createdAt | serverDate | 创建时间 |
| updatedAt | serverDate | 更新时间 |

索引：coupleId + date（按日期查询）

## 云函数

### createDiary

- 入参：coupleId, date, content, imageUrl?
- 逻辑：校验 coupleId 有效，写入 diary_entries
- 返回：{ success, entryId }

### getDiaries

- 入参：coupleId, year, month（如 2026, 5）
- 逻辑：查询该月所有记录，按 date desc + createdAt desc 排序
- 返回：{ success, entries[] }

### updateDiary

- 入参：entryId, content, imageUrl?
- 逻辑：校验当前用户是 authorId，更新内容
- 返回：{ success }

### deleteDiary

- 入参：entryId
- 逻辑：校验当前用户是 authorId，删除记录
- 返回：{ success }

## 需要删除的代码

### 云函数目录（5 个）

- cloudfunctions/createTask/
- cloudfunctions/getTasks/
- cloudfunctions/completeTask/
- cloudfunctions/approveTask/
- cloudfunctions/deleteTask/

### 页面

- pages/tasks/index.vue

### 组件

- components/task-card/index.vue

### 常量

- utils/constants.ts 中的 TASK_DIFFICULTY、TASK_TYPE

### 其他引用

- pages/profile/index.vue — 删除"累计任务"统计项（stats[0]）
- cloudfunctions/getProfileData/index.js — 删除 tasks.count() 查询
- cloudfunctions/getCoupleStats/index.js — 删除 tasks 统计
- cloudfunctions/initDB/index.js — COLS 中 tasks 改为 diary_entries

## 需要修改的文件

### pages.json

- 路由：pages/tasks/index → pages/calendar/index
- tabBar：文字 "任务" → "日历"，图标换成日历图标
- easycom：删除 task-card 注册

### TabBar 图标

- 复用现有 tasks 图标文件，只改 pages.json 中的文字为"日历"

## 不动的部分

- coinChange 云函数 — 通用币函数，与任务无关
- store/index.ts — 无 task 专属状态
- home 页面 — 当前无任务提醒逻辑
