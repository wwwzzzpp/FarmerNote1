# FarmerNote 云同步真实接入手册

这份文档面向当前仓库里的 3 个部分：

- 小程序：`/Users/wzp/Documents/GitHub/FarmerNote1/miniprogram`
- Flutter：`/Users/wzp/Documents/GitHub/FarmerNote1/Flutter/apps/farmernote_app`
- 服务端：`/Users/wzp/Documents/GitHub/FarmerNote1/supabase`

目标是把“代码已经写好”推进到“真机可以登录、同步和恢复数据”。

## 1. 先准备账号

你需要先确认这 4 个前提：

1. 小程序 `AppID` 已可正常使用。
2. Flutter 要用的微信开放平台 `AppID` 已申请好。
3. 小程序和移动端 `AppID` 都归在同一开放平台主体下，可以拿到同一个 `unionid`。
4. iOS 的 `Universal Link` 域名已经能由你控制。

如果第 3 条做不到，这套方案里的“同一微信账号跨端统一用户”就会卡住，后面要改成手机号桥接或扫码绑定。

## 2. 配置 Supabase

### 本机工具

当前这台机器还没有：

- `supabase` CLI
- `deno`

建议先安装：

```bash
brew install supabase/tap/supabase
brew install deno
```

安装后在仓库根目录执行：

```bash
cd /Users/wzp/Documents/GitHub/FarmerNote1
cp supabase/.env.local.example supabase/.env.local
```

把 [supabase/.env.local.example](/Users/wzp/Documents/GitHub/FarmerNote1/supabase/.env.local.example) 里的占位值替换成真实值。

如果你在真机上调试本地 Supabase，记得把：

```text
FARMERNOTE_PUBLIC_SUPABASE_URL=http://你的电脑局域网IP:54321
```

也一起写进去。这样图片上传票据就不会错误地回到 `127.0.0.1`。

如果你还在等微信公众平台或开放平台认证，可以先打开临时联调登录：

```text
FARMERNOTE_ENABLE_DEV_LOGIN=true
FARMERNOTE_DEV_LOGIN_KEY=farmernote-local-shared-user
```

这会启用一个仅用于开发联调的 `auth-dev-login`。小程序和 Flutter 只要使用同一个 `debug key`，就会同步到同一个 Supabase 测试用户。

如果你要调整接口防刷阈值，也可以在这里改：

```text
FARMERNOTE_USER_RATE_LIMIT_PER_MINUTE=30
FARMERNOTE_IP_RATE_LIMIT_PER_MINUTE=30
```

当前默认策略是：

- 已登录接口：按用户限流
- 登录/刷新接口：按 IP 限流
- 每分钟每个接口默认最多 30 次请求

### 本地启动

```bash
supabase start
supabase db reset
supabase functions serve --env-file supabase/.env.local
```

### 正式项目部署

```bash
supabase link --project-ref <your-project-ref>
supabase db push
supabase functions deploy auth-wechat-login --no-verify-jwt
supabase functions deploy auth-dev-login --no-verify-jwt
supabase functions deploy auth-refresh --no-verify-jwt
supabase functions deploy sync-push --no-verify-jwt
supabase functions deploy sync-pull --no-verify-jwt
supabase functions deploy media-upload-ticket --no-verify-jwt
supabase functions deploy media-download-ticket --no-verify-jwt
```

然后去 Supabase 后台确认：

- `entry-photos` bucket 已存在且为私有
- Edge Function 环境变量已写入
- 数据库 migration 已执行成功

## 3. 配置 Flutter

### 运行参数

先复制模板：

```bash
cp /Users/wzp/Documents/GitHub/FarmerNote1/Flutter/apps/farmernote_app/dart_defines.example.json \
   /Users/wzp/Documents/GitHub/FarmerNote1/Flutter/apps/farmernote_app/dart_defines.local.json
```

把里面 3 个值改成真实值：

- `FARMERNOTE_SUPABASE_FUNCTIONS_BASE_URL`
- `FARMERNOTE_FLUTTER_WECHAT_APP_ID`
- `FARMERNOTE_FLUTTER_WECHAT_UNIVERSAL_LINK`

如果要先用临时联调登录，再补这 3 个值：

- `FARMERNOTE_ENABLE_DEV_LOGIN=true`
- `FARMERNOTE_DEV_LOGIN_KEY=farmernote-local-shared-user`
- `FARMERNOTE_DEV_LOGIN_DISPLAY_NAME=FarmerNote 临时联调`

运行 Android：

```bash
cd /Users/wzp/Documents/GitHub/FarmerNote1/Flutter/apps/farmernote_app
flutter run -d <device-id> --dart-define-from-file=dart_defines.local.json
```

### 微信原生配置

Flutter 工程已经加了 `fluwx` 依赖，代码侧登录入口在：

- [auth_service.dart](/Users/wzp/Documents/GitHub/FarmerNote1/Flutter/apps/farmernote_app/lib/services/auth_service.dart)
- [cloud_config.dart](/Users/wzp/Documents/GitHub/FarmerNote1/Flutter/apps/farmernote_app/lib/config/cloud_config.dart)

还需要你确认这几项：

- Android 包名与微信开放平台里登记的一致
- Android 调试签名和发布签名都在微信开放平台登记过
- iOS Bundle ID 与开放平台里登记的一致
- iOS `Universal Link` 已在开放平台配置

当前项目已经补上的原生点：

- iOS 日历/相机权限
- iOS 微信查询白名单
- `fluwx` 的 `pubspec` 配置占位项

## 4. 配置小程序

编辑：

- [cloud-config.js](/Users/wzp/Documents/GitHub/FarmerNote1/miniprogram/utils/cloud-config.js)

把：

```js
const SUPABASE_FUNCTIONS_BASE_URL = '';
```

替换成真实地址，例如：

```js
const SUPABASE_FUNCTIONS_BASE_URL = 'https://your-project-ref.supabase.co/functions/v1';
```

然后去微信公众平台后台配置合法域名：

- `request`
- `uploadFile`
- `downloadFile`

至少要包含：

```text
https://your-project-ref.supabase.co
```

## 5. 第一轮真机验收

建议按这个顺序测：

1. 小程序登录微信，创建一条“文字 + 图片 + 待办”的新记录。
2. 看 Supabase 数据库里是否出现 `entries` / `tasks` 数据。
3. 看 Storage 的 `entry-photos` 里是否出现图片对象。
4. Flutter 用同一微信账号登录。
5. Flutter 下拉刷新后，确认记录、图片、待办都出现。
6. Flutter 完成待办，再回到小程序下拉刷新，确认状态变成“已完成”。
7. Flutter 删除记录，再回到小程序下拉刷新，确认时间线和待办一起消失。

如果你现在还不能走真实微信登录，就改成这组本地验证：

1. 启动 `supabase start`
2. 执行 `supabase db reset`
3. 启动 `supabase functions serve --env-file supabase/.env.local`
4. 小程序点击“临时登录”，创建一条“文字 + 图片 + 待办”的新记录
5. Flutter 用同一个 `dart_defines.local.json` 点击“临时登录”
6. Flutter 下拉刷新，确认记录、图片、待办都同步过来

## 6. 这次接入里最容易卡住的点

- 小程序和 Flutter 不是同一开放平台主体，拿不到同一 `unionid`
- Android 签名没在微信开放平台登记
- iOS `Universal Link` 配错
- 小程序后台没配合法域名
- Supabase Functions 地址填成了项目根域名，而不是 `functions/v1`
- 服务端环境变量没写全，尤其是 `WECHAT_*` 和 `SUPABASE_SERVICE_ROLE_KEY`

## 7. 你现在最适合的下一步

先把 4 个真实值准备好：

- `WECHAT_MINI_APP_ID`
- `WECHAT_OPEN_APP_ID`
- `FARMERNOTE_SUPABASE_FUNCTIONS_BASE_URL`
- iOS `Universal Link`

这些有了之后，就可以开始真机联调。
