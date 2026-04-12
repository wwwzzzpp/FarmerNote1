# Android Studio 运行 Flutter 项目手册

这份文档专门讲一件事：

如何用 Android Studio 打开、配置、运行当前这个 Flutter 项目。

适用项目：

```text
/Users/wzp/Documents/GitHub/FarmerNote1/Flutter/apps/farmernote_app
```

当前这台机器已经确认过的 Flutter 信息：

- Flutter SDK 路径：`/Users/wzp/Documents/flutter`
- Flutter 版本：`3.38.4`
- Dart 版本：`3.10.3`

## 1. 你要打开的工程目录

在 Android Studio 里，你要打开的是整个 Flutter 工程目录：

```text
/Users/wzp/Documents/GitHub/FarmerNote1/Flutter/apps/farmernote_app
```

不要只打开：

- `lib/`
- `android/`
- `ios/`

原因是：

- Flutter 依赖管理是基于整个工程目录
- Android Studio 只有打开完整 Flutter 工程，才能正常识别运行入口、设备、插件和调试配置

## 2. 第一次使用前，需要安装什么

你至少需要这几样：

- Android Studio
- Flutter SDK
- Android Studio 的 `Flutter` 插件
- Android SDK
- Android 模拟器，或者一台开启 USB 调试的安卓真机

当前你的 Flutter SDK 路径已经是：

```text
/Users/wzp/Documents/flutter
```

## 3. 第一次打开 Android Studio 时的配置步骤

### 第一步：安装 Flutter 插件

打开 Android Studio 后：

1. 点击 `Settings` 或 `Preferences`
2. 进入 `Plugins`
3. 搜索 `Flutter`
4. 点击安装
5. 安装过程中如果提示安装 `Dart` 插件，也一起安装
6. 安装完成后重启 Android Studio

### 第二步：配置 Flutter SDK 路径

重启后：

1. 进入 `Settings / Preferences`
2. 找到 `Languages & Frameworks`
3. 点击 `Flutter`
4. 在 `Flutter SDK path` 中填入：

```text
/Users/wzp/Documents/flutter
```

5. 点击 `Apply`
6. 点击 `OK`

如果路径正确，Android Studio 会识别 Flutter 和 Dart 环境。

## 4. 如何打开当前 Flutter 项目

在 Android Studio 主页：

1. 点击 `Open`
2. 选择目录：

```text
/Users/wzp/Documents/GitHub/FarmerNote1/Flutter/apps/farmernote_app
```

3. 点击 `Open`

第一次打开后，Android Studio 通常会自动做这些事情：

- 读取 `pubspec.yaml`
- 同步 Flutter 依赖
- 同步 Android Gradle
- 建立索引

第一次会稍慢一点，这是正常的。

## 5. 工程打开后，你应该先确认什么

工程加载完成后，建议先检查这几个点：

### 1. 左侧目录结构正常

你应该能看到这些目录：

- `lib`
- `android`
- `ios`
- `web`
- `test`
- `pubspec.yaml`

### 2. `pubspec.yaml` 没报红

如果 `pubspec.yaml` 报错，通常说明：

- Flutter SDK 路径没配好
- 插件没装好
- 依赖还没下载完

### 3. 运行设备区域可见

Android Studio 顶部通常会有：

- 设备选择器
- Run 按钮
- Debug 按钮

如果没有，通常是 Flutter 插件没装好，或者工程没被识别成 Flutter 项目。

## 6. 运行前建议先执行一次的命令

虽然 Android Studio 会自动做一部分事情，但我仍然建议你先在终端里跑一次：

```bash
cd /Users/wzp/Documents/GitHub/FarmerNote1/Flutter/apps/farmernote_app
flutter pub get
flutter analyze
flutter test
flutter devices
```

这 4 个命令分别是：

- `flutter pub get`：下载依赖
- `flutter analyze`：检查静态错误
- `flutter test`：跑测试
- `flutter devices`：查看当前可运行设备

## 7. 如果你想用 Android 模拟器运行

### 方式一：在 Android Studio 里创建模拟器

1. 打开 Android Studio
2. 进入 `Tools`
3. 点击 `Device Manager`
4. 点击 `Create Device`
5. 选择一个设备，例如：
   - `Pixel 7`
   - `Pixel 8`
6. 选择系统镜像
   - 推荐选稳定版 Android 镜像
7. 下载镜像并完成创建
8. 在 `Device Manager` 里点击启动按钮

启动成功后，顶部设备列表里应该能看到这个模拟器。

### 方式二：用命令行启动

```bash
flutter emulators
flutter emulators --launch <emulator-id>
```

## 8. 如果你想用安卓真机运行

### 手机端需要做的事情

1. 打开手机 `开发者选项`
2. 打开 `USB 调试`
3. 用支持数据传输的 USB 线连接电脑
4. 手机上如果弹出“是否允许 USB 调试”，点击允许
5. 如果手机是小米、华为、OPPO、vivo 等品牌，有时还需要额外允许安装 / 调试权限

### 电脑端怎么确认识别成功

在终端执行：

```bash
flutter devices
```

如果识别成功，你会看到类似：

```text
Android device • <device-id> • android-arm64 • Android xx
```

如果没识别成功，再执行：

```bash
adb devices
```

如果 `adb devices` 都识别不到，问题通常不在 Flutter，而在：

- USB 调试没开
- 数据线不支持传输
- 手机没有授权这台电脑
- Android SDK Platform-Tools 没装好

## 9. 如何在 Android Studio 里运行项目

### 最标准的运行方式

1. 确认项目已打开
2. 确认模拟器或真机已启动并被识别
3. 在 Android Studio 顶部设备选择器里选中目标设备
4. 点击绿色 `Run` 按钮

Android Studio 会自动执行类似这些动作：

- `flutter pub get`
- 编译 Flutter 代码
- 构建 Android
- 安装到目标设备
- 启动 App

第一次运行通常较慢，后面会快很多。

## 10. Run 和 Debug 的区别

### Run

适合：

- 正常开发
- 看页面效果
- 快速验证 UI

### Debug

适合：

- 打断点
- 看变量
- 查逻辑问题
- 看调用链

你刚开始开发时，大多数时间用 `Run` 就够了。

## 11. 运行成功后，怎样实时看修改效果

### Hot Reload

适合改：

- 字体大小
- 颜色
- 按钮样式
- 布局间距
- 页面文案

Android Studio 里通常有一个带闪电的按钮，或者你也可以在 Run 窗口中使用 Hot Reload。

特点：

- 非常快
- 页面状态通常保留

### Hot Restart

适合改：

- 页面初始化逻辑
- 一些状态管理逻辑
- 顶层装配逻辑

特点：

- 会重建 Dart 状态
- 比 Hot Reload 慢一点

### 完全重启 App

下面这些改动，往往要完整重启：

- 改权限
- 改插件
- 改 `pubspec.yaml`
- 改 Android 原生配置

## 12. 你这个项目里最常看的源码目录

运行起来后，如果你想顺手改 UI，最常看的是：

- `lib/features/record/record_screen.dart`
- `lib/features/timeline/timeline_screen.dart`
- `lib/features/tasks/tasks_screen.dart`
- `lib/widgets/farmer_ui.dart`
- `lib/theme/app_theme.dart`

如果你要改业务逻辑，再看：

- `lib/app/farmernote_controller.dart`
- `lib/services/calendar_service.dart`
- `lib/services/app_storage_service.dart`

## 13. Android Studio 里常用的几个入口

### Device Manager

路径：

```text
Tools > Device Manager
```

作用：

- 创建模拟器
- 启动模拟器
- 删除模拟器

### SDK Manager

路径：

```text
Settings / Preferences > Languages & Frameworks > Android SDK
```

作用：

- 安装 Android SDK
- 安装 Platform Tools
- 安装系统镜像

### Logcat

作用：

- 看 Android 运行日志
- 查闪退
- 查权限问题

### Terminal

作用：

- 直接执行 Flutter 命令
- 查设备
- 运行 analyze / test / build

## 14. 如果 Android Studio 顶部没有设备列表怎么办

先按顺序检查：

1. Flutter 插件是否安装
2. Dart 插件是否安装
3. Flutter SDK 路径是否正确
4. 是否打开了完整 Flutter 工程目录
5. 模拟器或真机是否已经启动
6. Android Studio 是否仍在 Gradle / Indexing 中

如果还不行，在终端执行：

```bash
flutter doctor
flutter devices
```

## 15. 如果项目打开后一直报错，怎么排查

先在项目根目录执行：

```bash
cd /Users/wzp/Documents/GitHub/FarmerNote1/Flutter/apps/farmernote_app
flutter clean
flutter pub get
flutter analyze
```

如果还是不行，再检查：

- Flutter SDK 路径是否正确
- Android SDK 是否安装
- 网络是否导致依赖没下全
- Android Studio 插件是否装好

## 16. 如果真机运行失败，怎么排查

### 现象 1：`flutter devices` 里没有手机

优先检查：

- USB 调试是否开启
- 数据线是否支持传输
- 手机是否点击了“允许调试”

### 现象 2：能识别手机，但点 Run 安装失败

优先检查：

- 手机上是否允许安装调试应用
- 手机存储空间是否够
- 旧版本应用是否签名冲突

### 现象 3：能安装，但一打开就闪退

优先看：

- Android Studio 的 `Logcat`
- Flutter Run 控制台输出

## 17. 如何在 Android Studio 里查看 Flutter 报错

你主要看 3 个地方：

- `Run` 窗口
- `Debug` 窗口
- `Logcat`

一般来说：

- Dart 代码报错：更多出现在 `Run` / `Debug`
- Android 原生报错：更多出现在 `Logcat`

## 18. 如何打包 APK

### 方式一：终端打包，最稳

在工程目录执行：

```bash
cd /Users/wzp/Documents/GitHub/FarmerNote1/Flutter/apps/farmernote_app
flutter build apk --release
```

生成目录：

```text
build/app/outputs/flutter-apk/app-release.apk
```

### 方式二：在 Android Studio 里用终端执行

Android Studio 自带 Terminal，你也可以直接在底部 Terminal 里执行：

```bash
flutter build apk --release
```

## 19. 如何打包 AAB 上架包

```bash
flutter build appbundle --release
```

输出目录：

```text
build/app/outputs/bundle/release/app-release.aab
```

## 20. 建议你的实际使用流程

建议你以后每次都按这个顺序做：

1. 打开 Android Studio
2. 打开项目目录：

```text
/Users/wzp/Documents/GitHub/FarmerNote1/Flutter/apps/farmernote_app
```

3. 启动安卓模拟器或连接真机
4. 顶部选择设备
5. 点击 `Run`
6. 改一小处代码
7. 用 `Hot Reload` 看效果
8. 改完后执行：

```bash
flutter analyze
flutter test
```

## 21. 这个项目里，和 Android Studio 配合最重要的两个文档

如果你想自己继续改代码，建议一起看：

- `README.md`
- `EDITING_GUIDE.md`

## 22. 一句话总结

你以后在 Android Studio 里开发这个项目，最关键就是记住 3 件事：

1. 打开整个工程目录，而不是只开 `lib/`
2. Flutter SDK 路径填 `/Users/wzp/Documents/flutter`
3. 真机或模拟器识别成功后，直接点顶部 `Run`

如果后面你愿意，我下一步可以继续帮你写第二份配套文档：

- “Android Studio 真机调试手册”
- 或者 “Android Studio 打包 APK / AAB 手册”
