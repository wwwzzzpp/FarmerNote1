# FarmerNote Flutter 源码修改指南

这份文档是面向当前 `FarmerNote` Flutter 工程的实操手册，重点回答 5 个问题：

1. 源码在哪里
2. 用什么工具修改
3. 改字体、布局、颜色时应该改哪个文件
4. 改完后如何运行和验证
5. 哪些情况要去改 Android / iOS 原生目录

当前工程目录：

```text
/Users/wzp/Documents/GitHub/FarmerNote1/Flutter/apps/farmernote_app
```

## 1. 你平时真正会改的源码在哪里

大多数功能和 UI 修改，都在 `lib/` 目录下完成：

```text
lib/
  main.dart                 程序入口
  app/
    farmernote_app.dart     App 外壳、底部导航、全局文本缩放
    farmernote_controller.dart  页面切换、状态管理、记录与待办操作
  features/
    record/
      record_screen.dart    记录页 UI
    timeline/
      timeline_screen.dart  时间线页 UI
    tasks/
      tasks_screen.dart     待办页 UI
  models/                   数据模型
  services/                 日历、拍照、本地存储
  theme/
    app_theme.dart          全局配色与主题
  utils/                    日期工具、提醒语义解析
  widgets/
    farmer_ui.dart          通用按钮、卡片、底部导航
    stored_photo.dart       照片展示组件
```

如果你想改 UI，优先看这几个文件：

- `lib/theme/app_theme.dart`
- `lib/widgets/farmer_ui.dart`
- `lib/features/record/record_screen.dart`
- `lib/features/timeline/timeline_screen.dart`
- `lib/features/tasks/tasks_screen.dart`

## 2. 推荐使用什么工具

最推荐的开发工具有两种：

### Android Studio

适合刚接触 Flutter 的情况，优点是：

- Flutter 工程识别完整
- Android 模拟器好用
- 运行、调试、查看日志方便
- Dart / Flutter 报错提示比较清楚

### VS Code / Cursor

适合更轻量、配合 AI 修改代码，优点是：

- 启动快
- 编辑体验轻量
- 适合边问 AI 边改代码

如果你用 VS Code / Cursor，记得安装插件：

- `Flutter`
- `Dart`

## 3. 如何打开这个工程

推荐直接打开这个目录：

```text
/Users/wzp/Documents/GitHub/FarmerNote1/Flutter/apps/farmernote_app
```

不要只打开 `lib/`，也不要只打开 `android/`。

因为 Flutter 工具运行、依赖管理、平台构建，都是基于整个工程目录完成的。

## 4. 第一次修改前，先跑这些命令

在终端进入工程目录：

```bash
cd /Users/wzp/Documents/GitHub/FarmerNote1/Flutter/apps/farmernote_app
flutter pub get
flutter analyze
flutter test
flutter devices
```

常用开发命令：

```bash
flutter run -d chrome
flutter run -d <device-id>
dart format lib test
flutter clean
```

## 5. 改完代码以后，怎么立刻看到效果

### Hot Reload

适合：

- 改字号
- 改颜色
- 改间距
- 改布局
- 改按钮文案

特点：

- 最快
- 页面状态基本保留

### Hot Restart

适合：

- 改了状态初始化逻辑
- 改了页面装配逻辑
- 改了部分全局变量

特点：

- 会重新启动 Dart 运行态

### 完全重启 App

适合：

- 改了插件逻辑
- 改了 Android / iOS 权限
- 改了包名、图标、原生配置
- 改了 `pubspec.yaml`

## 6. 想改字体大小，应该改哪里

### 改某个页面的标题字号

例如你想改“记录页”标题大小，就改：

```text
lib/features/record/record_screen.dart
```

你会看到类似这样的代码：

```dart
Text(
  '今天田里看到啥，先记下来。',
  style: TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.w700,
  ),
)
```

常见可改项：

- `fontSize`: 字号
- `fontWeight`: 粗细
- `height`: 行高
- `color`: 颜色

### 改按钮文字大小

去改：

```text
lib/widgets/farmer_ui.dart
```

里面有 `FarmerButton`，你会看到类似：

```dart
textStyle: TextStyle(
  fontSize: 14,
  fontWeight: FontWeight.w700,
),
```

### 改整个 App 的文字缩放策略

去改：

```text
lib/app/farmernote_app.dart
```

这里当前做了全局文本缩放限制，防止安卓系统字体过大把布局撑坏。

## 7. 想改布局和间距，应该改哪里

Flutter 里布局最常见的几个组件是：

- `Row`: 横向排列
- `Column`: 纵向排列
- `Expanded`: 自动占满剩余空间
- `SizedBox`: 控制间距和固定宽高
- `Container`: 控制背景、边框、padding、margin
- `Wrap`: 多行换行布局

### 改页面内边距

例如页面整体边距：

```dart
padding: const EdgeInsets.fromLTRB(16, 16, 16, 120)
```

你可以改成：

```dart
padding: const EdgeInsets.fromLTRB(12, 12, 12, 104)
```

### 改卡片内边距

通用卡片在：

```text
lib/widgets/farmer_ui.dart
```

里面 `ScreenSectionCard` 会控制：

- 卡片宽度
- padding
- 圆角
- 边框
- 阴影

例如：

```dart
padding: EdgeInsets.all(18)
```

### 改组件之间的距离

通常改：

```dart
SizedBox(height: 12)
SizedBox(width: 12)
```

## 8. 想改按钮样式，应该改哪里

统一按钮在：

```text
lib/widgets/farmer_ui.dart
```

当前项目按钮组件叫：

- `FarmerButton`
- `BottomPillNavigation`
- `StatusChip`

你可以在这里统一修改：

- 按钮高度
- 按钮圆角
- 背景色
- 边框颜色
- 字号
- 底部导航尺寸

比如你想把所有小按钮再缩一点，就改：

```dart
height: small ? 40 : 48
```

## 9. 想改页面结构，应该改哪里

### 记录页

文件：

```text
lib/features/record/record_screen.dart
```

这里负责：

- 顶部统计区
- 输入框
- 拍照按钮
- 保存按钮
- 提醒开关
- 日期时间选择
- 保存反馈提示

适合改：

- 首页布局
- 输入框大小
- 顶部统计卡片大小
- 拍照与保存按钮排列

### 时间线页

文件：

```text
lib/features/timeline/timeline_screen.dart
```

这里负责：

- 顶部 Hero 卡片
- 按天分组
- 单条时间线卡片
- 打开待办按钮
- 删除记录按钮

适合改：

- 顶部标题区
- 时间线列表样式
- 每条卡片的按钮布局

### 待办页

文件：

```text
lib/features/tasks/tasks_screen.dart
```

这里负责：

- 顶部 Hero 卡片
- 即将到来 / 已逾期 / 已完成分组
- 任务卡片
- 完成 / 删除按钮

适合改：

- 顶部标题区
- 卡片大小
- 任务按钮排列

## 10. 想改颜色和主题，应该改哪里

文件：

```text
lib/theme/app_theme.dart
```

里面有 `AppColors`，这是当前项目的颜色中心。

例如：

```dart
static const Color primary = Color(0xFF6F7751);
static const Color hero = Color(0xFFD9D1B8);
static const Color surface = Color(0xFFF8F4EA);
```

如果你想统一调整视觉风格，优先改这里，而不是在页面里到处写死颜色。

## 11. 想改业务逻辑，不只是 UI，应该看哪里

### 页面状态与操作

文件：

```text
lib/app/farmernote_controller.dart
```

这里控制：

- 创建记录
- 创建待办
- 删除记录
- 完成任务
- 页面跳转

### 本地存储

文件：

```text
lib/services/app_storage_service.dart
```

这里负责把记录和待办保存到本地。

### 日历写入

文件：

```text
lib/services/calendar_service.dart
```

这里负责：

- 权限检查
- 选择系统日历
- Android 本地日历兜底创建
- 写入事件

### 拍照

文件：

```text
lib/services/media_service.dart
```

### 智能提醒识别

文件：

```text
lib/utils/reminder_intent_parser.dart
```

### 日期处理

文件：

```text
lib/utils/date_utils.dart
```

## 12. 哪些情况要去改 Android / iOS 原生目录

只有下面这些情况，才需要改 `android/` 或 `ios/`：

- 改权限
- 改应用名称
- 改图标
- 改包名 / Bundle ID
- 改签名
- 插件集成有原生兼容问题

常见原生文件位置：

### Android

- `android/app/src/main/AndroidManifest.xml`
- `android/app/build.gradle.kts` 或同级 Gradle 配置

### iOS

- `ios/Runner/Info.plist`
- `ios/Runner.xcodeproj`
- `ios/Runner.xcworkspace`

如果只是改 Flutter 界面，不要先去改原生目录。

## 13. 这个项目最常见的修改任务，对应改哪里

### 任务 1：把首页标题变小

改：

- `lib/features/record/record_screen.dart`

### 任务 2：把时间线卡片里的按钮变窄

改：

- `lib/features/timeline/timeline_screen.dart`
- 或统一改 `lib/widgets/farmer_ui.dart`

### 任务 3：把底部导航高度变小

改：

- `lib/widgets/farmer_ui.dart`

### 任务 4：把整个应用主色改掉

改：

- `lib/theme/app_theme.dart`

### 任务 5：调整安卓真机上字体过大的问题

改：

- `lib/app/farmernote_app.dart`

### 任务 6：修日历写入问题

改：

- `lib/services/calendar_service.dart`

## 14. 你最应该掌握的 Flutter 修改套路

推荐你以后按这个顺序做：

1. 先确认你要改的是 UI 还是逻辑
2. UI 优先去 `lib/features/` 或 `lib/widgets/`
3. 统一样式优先去 `lib/theme/` 和 `lib/widgets/`
4. 改完立刻 `Hot Reload`
5. 功能改完跑：

```bash
flutter analyze
flutter test
```

6. 真机再点一遍关键路径

## 15. 常见坑

### 坑 1：只改了 Android 目录，Flutter 页面没变化

原因：

- 你改的是原生配置，不是 Flutter UI 源码

### 坑 2：改了代码但真机没变化

先试：

- `Hot Reload`
- `Hot Restart`
- 完全关闭 App 重开

如果还不行，再试：

```bash
flutter clean
flutter pub get
flutter run -d <device-id>
```

### 坑 3：Android 真机识别不到

先检查：

- 手机是否打开开发者模式
- 是否打开 USB 调试
- 数据线是否支持传输
- 终端执行：

```bash
flutter devices
adb devices
```

### 坑 4：改了动态值却还写着 `const`

例如：

```dart
const TextStyle(fontSize: isCompact ? 15 : 16)
```

这是不对的，因为 `isCompact` 是运行时值。

应该去掉 `const`：

```dart
TextStyle(fontSize: isCompact ? 15 : 16)
```

### 坑 5：改了权限或插件，Hot Reload 不生效

这类修改通常需要：

- 完全重启 App
- 有时需要重新构建

## 16. 推荐你的实际工作方式

如果你自己动手改，我建议这样做：

1. 用 `Android Studio` 或 `Cursor` 打开整个工程目录
2. 先运行一次真机：

```bash
flutter run -d <device-id>
```

3. 想改哪个页面，就先打开对应的 `*_screen.dart`
4. 改一小处就 `Hot Reload`
5. 一次只改一个目标，比如“先把标题缩小”
6. 改完后跑 `flutter analyze`
7. 确认没问题，再做下一项

## 17. 如果你想让我继续帮你

你后面可以直接这样说：

- “帮我把首页标题和按钮都缩小一点”
- “帮我把时间线卡片改成更紧凑”
- “帮我把主色改成偏绿色”
- “帮我把底部导航重新设计一下”
- “帮我给这套 Flutter 工程做一个统一设计系统”

我会直接告诉你该改哪些文件，或者直接帮你改好。
