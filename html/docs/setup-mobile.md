# 移动端运行说明

## 当前项目状态

这个项目已经是一个可运行的 Expo 工程，依赖已安装完成。

本机当前环境已确认：

- 有 Node.js 和 npm
- 可以直接跑 Expo 开发服务器
- 目前还没有完整 Xcode 环境
- 当前也没有 `adb`

这意味着：

- Web 编译和 TypeScript 检查没有问题
- 真机验证推荐先走 Expo Go
- 想做 iOS 原生构建或 Android 本地构建时，需要后补原生工具链

## 最快跑起来

```bash
cd /Users/wzp/Documents/GitHub/FarmerNote1
npm install --cache .npm-cache
npm run start
```

然后：

- iPhone / Android 装 Expo Go
- 扫 Expo 终端给出的二维码

## 建议测试顺序

### 1. 先测基础流程

- 新建纯文字记录
- 看时间线是否出现
- 看重启后是否仍保留

### 2. 再测待办流程

- 新建带未来时间的记录
- 检查待办页是否出现
- 修改时间
- 完成任务
- 删除任务

### 3. 最后测系统能力

- 打开通知权限
- 打开系统日历权限
- 观察到点是否触发手机提醒
- 观察系统日历里是否写入事件

## 关于 Expo Go

根据 Expo 官方文档，`expo-notifications` 的本地通知在 Expo Go 里仍可用；系统推送不在本项目范围内。

这意味着 v1 里的这些能力可以优先在 Expo Go 验证：

- 页面流程
- SQLite 本地保存
- 单次本地通知
- 通知点击回到对应待办

## 什么时候需要原生构建

以下场景更适合用开发构建或原生构建确认：

- iOS 权限文案是否按 `app.json` 生效
- Android 通知 channel 的最终表现
- 日历、通知在正式包里的行为差异

## 常用命令

```bash
npm run start
npm run web
npm run typecheck
npx expo export --platform web
```
