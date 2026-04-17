# FarmerNote Flutter 工程说明

这个目录是 FarmerNote 的 Flutter 客户端工程，目标是把 `miniprogram/` 小程序里的核心能力 1:1 重写到 Flutter 中，并统一承载后续 Android、iOS、Web、Desktop 客户端。

如果你接下来想自己改 Flutter 源码，比如字体、布局、颜色、按钮、页面结构，请优先看：

[`EDITING_GUIDE.md`](./EDITING_GUIDE.md)

如果你想用 Android Studio 打开、配置并运行这个 Flutter 工程，请看：

[`ANDROID_STUDIO_RUN_GUIDE.md`](./ANDROID_STUDIO_RUN_GUIDE.md)

当前工程路径：

```text
Flutter/apps/farmernote_app
```

## 已实现功能

- 记录页
  - 两行文字输入
  - 智能识别提醒语义
  - 手动选择日期和时间
  - 拍照并随记录一起保存
  - 保存后自动生成待办
  - 尝试写入系统日历
- 时间线页
  - 按天分组展示记录
  - 展示纯记录 / 待办 / 已逾期 / 已完成状态
  - 支持打开关联待办
  - 支持删除记录
- 待办页
  - 分为即将到来 / 已逾期 / 已完成
  - 支持完成任务
  - 支持删除任务
  - 支持查看随记录保存的照片
- 工程校验
  - `flutter analyze` 已通过
  - `flutter test` 已通过

## 云端同步现状

当前仓库已经接入了 FarmerNote 的云同步主干：

- Flutter
  - 本地状态新增了 `authSession / pendingMutations / lastSyncedVersion / mediaCacheIndex`
  - 记录、待办、图片改成了本地优先，登录后自动走云同步队列
  - 图片改成 `photoObjectPath + localPhotoPath` 双层模型，不再以 base64 作为权威数据
- 小程序
  - 已新增 `utils/cloud-auth.js / cloud-sync.js / cloud-media.js`
  - 登录后会把新产生的记录、待办、图片同步到 Supabase
- 服务端
  - 已新增 [supabase/README.md](/Users/wzp/Documents/GitHub/FarmerNote1/supabase/README.md) 和对应 migration / Edge Functions

当前默认策略：

- 只有“登录后新产生的数据”会进入云同步
- 历史旧本地数据不会自动迁移到云端
- 系统日历仍然只属于当前设备，不参与跨端同步

## 目录结构

```text
Flutter/apps/farmernote_app/
  lib/
    app/         应用入口与控制器
    features/    record / timeline / tasks 三个页面
    models/      数据模型
    services/    日历、媒体、本地存储、云同步
    config/      云端配置
    theme/       主题与颜色
    utils/       日期工具、提醒语义解析
    widgets/     通用 UI 组件
  test/          基础 smoke test
  android/       Android 工程
  ios/           iOS 工程
  web/           Web 工程
  macos/         macOS 工程
  windows/       Windows 工程
  linux/         Linux 工程
```

## 快速开始

先进入工程目录：

```bash
cd /Users/wzp/Documents/GitHub/FarmerNote1/Flutter/apps/farmernote_app
```

首次运行：

```bash
flutter pub get
flutter analyze
flutter test
```

查看当前可运行设备：

```bash
flutter devices
```

## 云同步配置

### 1. 部署 Supabase 侧

先看：

[`/Users/wzp/Documents/GitHub/FarmerNote1/supabase/README.md`](/Users/wzp/Documents/GitHub/FarmerNote1/supabase/README.md)

至少需要先完成：

- 创建 Supabase 项目
- 执行 `supabase/migrations/202604130001_cloud_sync.sql`
- 部署 7 个 Edge Functions
- 配置 `entry-photos` 私有 bucket
- 写入微信和 Supabase 的服务端环境变量

### 2. 配置 Flutter 运行参数

Flutter 客户端通过 `dart-define` 读取云端参数，代码入口在：

[`cloud_config.dart`](/Users/wzp/Documents/GitHub/FarmerNote1/Flutter/apps/farmernote_app/lib/config/cloud_config.dart)

如果你当前只是准备先上架移动端，只需要先传云端地址，微信登录入口默认是关闭的：

```bash
--dart-define=FARMERNOTE_SUPABASE_FUNCTIONS_BASE_URL=https://<project-ref>.supabase.co/functions/v1
```

等应用上架完成、并且拿到微信开放平台移动应用资质后，再打开 Flutter 微信登录入口，并补这几个参数：

```bash
--dart-define=FARMERNOTE_ENABLE_FLUTTER_WECHAT_LOGIN=true
--dart-define=FARMERNOTE_FLUTTER_WECHAT_APP_ID=你的开放平台AppID
--dart-define=FARMERNOTE_FLUTTER_WECHAT_UNIVERSAL_LINK=https://你的-universal-link/
```

Android 真机调试示例：

```bash
flutter run -d <device-id> \
  --dart-define=FARMERNOTE_SUPABASE_FUNCTIONS_BASE_URL=https://<project-ref>.supabase.co/functions/v1 \
  --dart-define=FARMERNOTE_ENABLE_FLUTTER_WECHAT_LOGIN=true \
  --dart-define=FARMERNOTE_FLUTTER_WECHAT_APP_ID=wx1234567890abcdef \
  --dart-define=FARMERNOTE_FLUTTER_WECHAT_UNIVERSAL_LINK=https://your.domain.com/app/
```

也可以直接使用模板文件：

```bash
cp dart_defines.example.json dart_defines.local.json
flutter run -d <device-id> --dart-define-from-file=dart_defines.local.json
```

如果你现在只是要先验证 Supabase 同步，不等微信认证，也可以先打开临时联调登录：

```bash
flutter run -d <device-id> --dart-define-from-file=dart_defines.local.json
```

其中 `dart_defines.local.json` 至少要包含：

```json
{
  "FARMERNOTE_SUPABASE_FUNCTIONS_BASE_URL": "http://你的电脑局域网IP:54321/functions/v1",
  "FARMERNOTE_ENABLE_DEV_LOGIN": "true",
  "FARMERNOTE_DEV_LOGIN_KEY": "farmernote-local-shared-user",
  "FARMERNOTE_DEV_LOGIN_DISPLAY_NAME": "FarmerNote 临时联调"
}
```

这样首页云端卡片会显示“临时登录”，点一下就能接到同一个 Supabase 测试用户。

### 3. 配置小程序

小程序端的云地址在：

[`cloud-config.js`](/Users/wzp/Documents/GitHub/FarmerNote1/miniprogram/utils/cloud-config.js)

把这里的：

```js
const SUPABASE_FUNCTIONS_BASE_URL = '';
```

改成你的实际函数地址，例如：

```js
const SUPABASE_FUNCTIONS_BASE_URL = 'https://<project-ref>.supabase.co/functions/v1';
```

如果你当前走的是本地联调，可以先保留本机局域网地址，并让 `ENABLE_DEV_LOGIN` 打开。只要小程序和 Flutter 用的是同一个 `DEV_LOGIN_KEY`，两端就会同步到同一个临时测试账号。

然后去微信公众平台后台补上合法域名：

- `request` 合法域名
- `uploadFile` 合法域名
- `downloadFile` 合法域名

至少要包含你的 Supabase 项目域名，例如：

```text
https://<project-ref>.supabase.co
```

当前 [project.config.json](/Users/wzp/Documents/GitHub/FarmerNote1/miniprogram/project.config.json) 里 `urlCheck` 是关闭的，只方便本地调试；真机和正式版依然要去微信后台配域名。

如果你现在要做真实联调，请直接看：

[`/Users/wzp/Documents/GitHub/FarmerNote1/CLOUD_SYNC_SETUP.md`](/Users/wzp/Documents/GitHub/FarmerNote1/CLOUD_SYNC_SETUP.md)

## 本机当前环境状态

以下信息基于本机检查，时间是 2026-04-10：

- Flutter: `3.38.4`
- Dart: `3.10.3`
- Android SDK: 已安装，可构建 Android
- Chrome: 已可用于 Web 调试
- 当前已识别设备:
  - `macOS (desktop)`
  - `Chrome (web)`
- 当前缺失:
  - Xcode 完整安装
  - CocoaPods

这意味着：

- Android: 可以构建，但你需要启动模拟器或连接真机后再 `flutter run`
- Web: 可以直接运行和构建
- macOS: 代码已生成，但当前机器因为 Xcode 不完整，先不要指望稳定构建
- iOS: 当前机器还不能正常构建，先补全 Xcode 和 CocoaPods
- Windows / Linux: 工程已生成，但不能在当前 macOS 主机上直接产出对应安装包，需到对应系统或 CI 上构建

## 常用开发命令

在工程目录下执行：

```bash
flutter pub get
flutter analyze
flutter test
flutter clean
```

格式化代码：

```bash
dart format lib test
```

## 运行应用

### 1. Web

直接在 Chrome 启动：

```bash
flutter run -d chrome
```

### 2. Android

先查看模拟器：

```bash
flutter emulators
```

启动某个模拟器：

```bash
flutter emulators --launch <emulator-id>
```

然后运行：

```bash
flutter run -d android
```

如果你接了真机，也可以先看设备列表：

```bash
flutter devices
```

再按设备 id 运行：

```bash
flutter run -d <device-id>
```

### 3. iOS

前提：必须先补齐 Xcode 和 CocoaPods。

补齐后常用命令：

```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch
sudo gem install cocoapods
cd ios && pod install && cd ..
flutter run -d ios
```

如果要打开 Xcode：

```bash
open ios/Runner.xcworkspace
```

### 4. macOS

如果本机 Xcode 环境已经补齐，可以直接：

```bash
flutter run -d macos
```

### 5. Windows

不能在当前 macOS 主机直接产出 Windows 安装包。

要构建 Windows，请把仓库拉到 Windows 机器上执行：

```bash
flutter pub get
flutter build windows
```

### 6. Linux

不能在当前 macOS 主机直接产出 Linux 安装包。

要构建 Linux，请把仓库拉到 Linux 机器上执行：

```bash
flutter pub get
flutter build linux
```

## 构建发布包

### Android APK

```bash
flutter build apk --release
```

输出目录：

```text
build/app/outputs/flutter-apk/app-release.apk
```

### Android App Bundle

用于应用商店上架：

```bash
flutter build appbundle --release
```

输出目录：

```text
build/app/outputs/bundle/release/app-release.aab
```

### iOS

前提：Xcode、签名、CocoaPods 都已配置完成。

常用方式一：

```bash
flutter build ios --release
```

常用方式二：

```bash
flutter build ipa --release
```

常见产物目录：

```text
build/ios/iphoneos/
build/ios/ipa/
```

### Web

```bash
flutter build web --release
```

输出目录：

```text
build/web/
```

### macOS

```bash
flutter build macos --release
```

常见产物目录：

```text
build/macos/Build/Products/Release/
```

### Windows

需要在 Windows 主机上执行：

```bash
flutter build windows --release
```

常见产物目录：

```text
build/windows/x64/runner/Release/
```

### Linux

需要在 Linux 主机上执行：

```bash
flutter build linux --release
```

常见产物目录：

```text
build/linux/x64/release/bundle/
```

## 重要说明

### 1. 当前 iOS / macOS 工具链未配完

当前 `flutter doctor -v` 明确提示：

- Xcode installation is incomplete
- CocoaPods not installed

在这两个问题解决之前：

- `flutter analyze`
- `flutter test`

可以正常执行，但 iOS / macOS 真机构建不要当作已经 ready。

### 2. 权限声明现状

当前工程已经补上 Android 和 iOS 的核心权限声明，覆盖了：

- Android 日历读写权限
- iOS 相机权限文案
- iOS 日历权限文案
- iOS 17+ 日历完全访问权限文案
- iOS 照片库使用说明

相关文件：

- `android/app/src/main/AndroidManifest.xml`
- `ios/Runner/Info.plist`

当前还需要注意：

- `macos/Runner/Info.plist` 还没有补桌面端照片或日历权限
- 当前 Flutter 代码的拍照流程主要面向 Android / iOS
- Web / Desktop 如果要做“真正拍照”体验，还需要额外适配

所以目前最适合优先验证的是：

- Android 真机 / 模拟器
- iPhone 真机

### 3. 当前时区

工程入口里先把 Flutter 的本地日历时区初始化成了：

```text
Asia/Shanghai
```

如果后续你要让应用自动跟随设备时区，需要再调整这部分初始化逻辑。

## 推荐开发顺序

建议你后面按这个顺序工作：

1. 先跑 `flutter analyze`
2. 再跑 `flutter test`
3. 先用 `flutter run -d chrome` 快速看页面
4. 再用 Android 模拟器或真机验证拍照和日历
5. 最后补齐 iOS 工具链和权限配置

## 一组最常用命令

如果你只想快速记住最重要的一组：

```bash
cd /Users/wzp/Documents/GitHub/FarmerNote1/Flutter/apps/farmernote_app
flutter pub get
flutter analyze
flutter test
flutter run -d chrome
flutter build apk --release
flutter build appbundle --release
flutter build web --release
```
