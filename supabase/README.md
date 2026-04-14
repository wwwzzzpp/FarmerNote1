# FarmerNote Supabase 服务端说明

这个目录承载 FarmerNote 的云端同步后端脚手架，目标是给：

- `miniprogram/`
- `Flutter/apps/farmernote_app/`

提供统一的账号、数据同步、图片对象存储能力。

## 目录结构

```text
supabase/
  config.toml
  migrations/
  functions/
    _shared/
    auth-dev-login/
    auth-wechat-login/
    auth-refresh/
    sync-push/
    sync-pull/
    media-upload-ticket/
    media-download-ticket/
```

## 依赖的环境变量

这些变量用于 Edge Functions：

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
WECHAT_MINI_APP_ID
WECHAT_MINI_APP_SECRET
WECHAT_OPEN_APP_ID
WECHAT_OPEN_APP_SECRET
FARMERNOTE_ACCESS_TOKEN_TTL_SECONDS
FARMERNOTE_REFRESH_TOKEN_TTL_SECONDS
FARMERNOTE_ENABLE_DEV_LOGIN
FARMERNOTE_DEV_LOGIN_KEY
```

推荐默认值：

```text
FARMERNOTE_ACCESS_TOKEN_TTL_SECONDS=86400
FARMERNOTE_REFRESH_TOKEN_TTL_SECONDS=2592000
FARMERNOTE_ENABLE_DEV_LOGIN=false
FARMERNOTE_DEV_LOGIN_KEY=farmernote-local-shared-user
```

本地模板文件已经放好：

[`/Users/wzp/Documents/GitHub/FarmerNote1/supabase/.env.local.example`](/Users/wzp/Documents/GitHub/FarmerNote1/supabase/.env.local.example)

## 本地初始化

如果本机已安装 Supabase CLI，可以在仓库根目录执行：

```bash
supabase start
supabase db reset
supabase functions serve --env-file supabase/.env.local
```

如果你还在等微信认证，可以临时打开本地联调登录：

```text
FARMERNOTE_ENABLE_DEV_LOGIN=true
FARMERNOTE_DEV_LOGIN_KEY=farmernote-local-shared-user
```

这样小程序和 Flutter 只要使用同一个 `debug key`，就会落到同一个 Supabase 测试账号上。

## 部署步骤

1. 在 Supabase 控制台创建项目
2. 配置 Storage bucket：`entry-photos`
3. 写入上述环境变量
4. 执行 migration
5. 部署 Edge Functions
6. 把函数基础地址配置到小程序和 Flutter 客户端

### Flutter 客户端

运行 Flutter 时，需要通过 `dart-define` 注入：

```text
FARMERNOTE_SUPABASE_FUNCTIONS_BASE_URL
FARMERNOTE_FLUTTER_WECHAT_APP_ID
FARMERNOTE_FLUTTER_WECHAT_UNIVERSAL_LINK
```

### 小程序客户端

把下面这个文件里的地址填上：

[`/Users/wzp/Documents/GitHub/FarmerNote1/miniprogram/utils/cloud-config.js`](/Users/wzp/Documents/GitHub/FarmerNote1/miniprogram/utils/cloud-config.js)

同时去微信公众平台后台配置合法域名：

- `request`
- `uploadFile`
- `downloadFile`

域名至少要覆盖你的 Supabase 项目域名，例如：

```text
https://<project-ref>.supabase.co
```

## 鉴权说明

客户端不会直连数据库。所有请求都走 Edge Functions。

- 登录：`auth-wechat-login`
- 临时联调登录：`auth-dev-login`
- 刷新令牌：`auth-refresh`
- 数据 push：`sync-push`
- 数据 pull：`sync-pull`
- 图片上传票据：`media-upload-ticket`
- 图片下载票据：`media-download-ticket`

客户端请求时使用：

```text
Authorization: Bearer <accessToken>
```

## 当前约束

- 同步只针对新版本产生的新数据
- 历史本地旧数据不会自动迁移到云端
- 系统日历仍然是设备本地副作用，不参与云同步
