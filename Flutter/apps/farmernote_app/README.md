# FarmerNote Flutter 工程说明

这个目录是 FarmerNote 的 Flutter 客户端工程，目标是把 `miniprogram/` 小程序里的核心能力 1:1 重写到 Flutter 中，并统一承载后续 Android、iOS、Web、Desktop 客户端。

如果你接下来想自己改 Flutter 源码，比如字体、布局、颜色、按钮、页面结构，请优先看：

[`EDITING_GUIDE.md`](./EDITING_GUIDE.md)

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

## 目录结构

```text
Flutter/apps/farmernote_app/
  lib/
    app/         应用入口与控制器
    features/    record / timeline / tasks 三个页面
    models/      数据模型
    services/    日历、媒体、本地存储
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
