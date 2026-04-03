# 巡田记

一个最小可用的农业巡田记录 App。

它做 4 件事：

- 随手记录文字观察
- 自动串成时间线
- 给单条记录挂一个未来时间
- 到点发手机提醒，并单向写入系统日历

第一版特意保持简单：

- 无登录
- 无云同步
- 无后台服务
- 数据只保存在本机

## 技术栈

- Expo SDK 55
- React Native + Expo Router
- TypeScript
- `expo-sqlite` 本地数据库
- `expo-notifications` 本地通知
- `expo-calendar` 系统日历同步
- `@react-native-community/datetimepicker` 时间选择

## 目录结构

- `app/`：3 个页面路由，分别是 `记录 / 时间线 / 待办`
- `src/db/`：SQLite 初始化和查询封装
- `src/services/`：通知与日历服务
- `src/context/`：全局数据读写与业务动作
- `src/types/`：核心类型定义
- `docs/`：产品、架构、移动端运行说明

## 本地启动

1. 安装依赖

```bash
npm install --cache .npm-cache
```

如果你的全局 `npm` 缓存没有权限，这个命令会直接把缓存放在项目目录里，避免安装失败。

2. 启动 Expo

```bash
npm run start
```

3. 在终端里选择运行方式

- `i`：iOS
- `a`：Android
- `w`：Web
- 或用 Expo Go 扫码

## 推荐验证路径

- 文字记录、时间线、待办分组：可先在 Web 或 Expo Go 看 UI 流程
- 本地通知、系统日历写入：优先在真机上验证
- iOS 权限文案、原生配置插件效果：建议用开发构建或正式原生构建确认

## 常用命令

```bash
npm run start
npm run android
npm run ios
npm run web
npm run typecheck
npx expo export --platform web
```

## 文档

- [产品说明](./docs/product.md)
- [架构说明](./docs/architecture.md)
- [移动端运行说明](./docs/setup-mobile.md)

## 官方参考

- [Create a project](https://docs.expo.dev/get-started/create-a-project/)
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo Calendar](https://docs.expo.dev/versions/latest/sdk/calendar/)
- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
