# 巡田记 v1 架构说明

## 技术选型

- Expo Router：文件路由和底部 Tab
- SQLite：本地持久化
- Notifications：单次本地通知
- Calendar：单向写入系统日历
- Context Provider：统一封装“创建记录 / 完成待办 / 改时间 / 重试同步”这些业务动作

## 页面结构

- `app/index.tsx`：记录页
- `app/timeline.tsx`：时间线页
- `app/tasks.tsx`：待办页
- `app/_layout.tsx`：SQLite Provider、数据 Provider、通知跳转监听、底部 Tab

## 数据模型

### entries

- `id`
- `noteText`
- `createdAt`
- `updatedAt`

### tasks

- `id`
- `entryId`
- `dueAt`
- `status`
- `completedAt`
- `notificationId`
- `calendarEventId`
- `calendarSyncStatus`

规则：

- 一条 `entry` 最多关联一条 `task`
- `status` 只允许 `pending / overdue / completed`
- `calendarSyncStatus` 用来区分 `synced / permission_denied / failed / unsupported / skipped / removed`

## 业务流

### 创建记录

1. 先写入 `entries`
2. 如果没有提醒时间，到此结束
3. 如果有提醒时间：
4. 判断时间是否已过
5. 未来时间：安排本地通知 + 尝试写入系统日历
6. 最后把结果写入 `tasks`

### 刷新状态

1. App 启动或回到前台时刷新
2. 把已过期但仍是 `pending` 的任务改成 `overdue`
3. 再读取时间线和待办列表

### 修改待办时间

1. 取消旧通知
2. 未来任务：重新建通知并更新/重建日历事件
3. 过去时间：直接改成逾期，并移除未来日历事件

### 提前完成

1. 取消通知
2. 如果是未来任务，删除未来日历事件
3. 更新任务状态为 `completed`

## 权限策略

### 通知

- 第一次真正创建未来任务时再申请
- 拒绝权限也不阻止记录入库
- 待办页可对未成功安排的任务执行“重试提醒”

### 日历

- 同样在需要写入时才申请
- iOS 使用默认日历
- Android 优先用第一本可写日历；没有就创建 `FarmerNote` 本地日历
- 失败后记录状态，待办页可以重试

## 当前验证方式

- `npm run typecheck`
- `npx expo export --platform web`

后续真机验证重点：

- 本地通知到点触发
- 点通知进入对应待办
- iOS/Android 系统日历事件创建与更新
