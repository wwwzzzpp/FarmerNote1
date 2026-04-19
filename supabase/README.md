# FarmerNote Supabase 服务端说明

这个目录承载 FarmerNote 的云端同步后端脚手架，目标是给：

- `miniprogram/`
- `Flutter/apps/farmernote_app/`

提供统一的账号、双通道登录绑定、数据同步、图片对象存储能力。

## 目录结构

```text
supabase/
  config.toml
  migrations/
  functions/
    _shared/
    auth-dev-login/
    auth-wechat-login/
    auth-phone-send-code/
    auth-phone-login/
    auth-link-phone/
    auth-link-wechat/
    auth-refresh/
    account-request-deletion/
    account-deletion-status/
    account-purge-due/
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
FARMERNOTE_ACCOUNT_DELETION_WINDOW_DAYS
FARMERNOTE_ACCOUNT_PURGE_TOKEN
FARMERNOTE_USER_RATE_LIMIT_PER_MINUTE
FARMERNOTE_IP_RATE_LIMIT_PER_MINUTE
FARMERNOTE_ENABLE_DEV_LOGIN
FARMERNOTE_DEV_LOGIN_KEY
FARMERNOTE_PHONE_CODE_SECRET
FARMERNOTE_PHONE_OTP_LENGTH
FARMERNOTE_PHONE_OTP_TTL_SECONDS
FARMERNOTE_PHONE_OTP_RESEND_COOLDOWN_SECONDS
FARMERNOTE_PHONE_OTP_MAX_ATTEMPTS
ALIYUN_SMS_ACCESS_KEY_ID
ALIYUN_SMS_ACCESS_KEY_SECRET
ALIYUN_SMS_SIGN_NAME
ALIYUN_SMS_TEMPLATE_CODE
ALIYUN_SMS_ENDPOINT
```

推荐默认值：

```text
FARMERNOTE_ACCESS_TOKEN_TTL_SECONDS=86400
FARMERNOTE_REFRESH_TOKEN_TTL_SECONDS=2592000
FARMERNOTE_ACCOUNT_DELETION_WINDOW_DAYS=15
FARMERNOTE_USER_RATE_LIMIT_PER_MINUTE=30
FARMERNOTE_IP_RATE_LIMIT_PER_MINUTE=30
FARMERNOTE_ENABLE_DEV_LOGIN=false
FARMERNOTE_DEV_LOGIN_KEY=farmernote-local-shared-user
```

本地模板文件已经放好：

[`/Users/wzp/Documents/GitHub/FarmerNote1/supabase/.env.local.example`](/Users/wzp/Documents/GitHub/FarmerNote1/supabase/.env.local.example)

正式环境模板：

[`/Users/wzp/Documents/GitHub/FarmerNote1/supabase/.env.production.example`](/Users/wzp/Documents/GitHub/FarmerNote1/supabase/.env.production.example)

## 本地初始化

这次新增的手机号验证码链路已经改成服务端自管验证码，并通过阿里云短信发送。开始联调前，记得先在 `.env.local` 或生产 secrets 中补齐下面这些变量：

- `FARMERNOTE_PHONE_CODE_SECRET`
- `FARMERNOTE_ACCOUNT_PURGE_TOKEN`
- `ALIYUN_SMS_ACCESS_KEY_ID`
- `ALIYUN_SMS_ACCESS_KEY_SECRET`
- `ALIYUN_SMS_SIGN_NAME`
- `ALIYUN_SMS_TEMPLATE_CODE`

缺少这些配置时：

- `auth-phone-send-code`
- `auth-phone-login`
- `auth-link-phone`
- `account-request-deletion`

都会因为短信能力未就绪而失败。

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

如果你已经配好了本地微信环境和阿里云短信环境，本地联调默认不会自动切到临时登录，而是继续走和线上一致的微信 + 手机号双通道登录。

## 限流防护

服务端当前已经内置接口限流：

- 已登录接口：按“用户 + 接口”限流
- 登录/刷新接口：按“IP + 接口”限流
- 默认阈值：每分钟每个接口最多 `30` 次请求

命中限制时，服务端会返回：

- HTTP `429`
- `Retry-After`
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`

## 部署步骤

1. 在 Supabase 控制台创建项目
2. 配置 Storage bucket：`entry-photos`
3. 复制生产模板并填写真实值
4. 写入上述环境变量
5. 执行 migration
6. 部署 Edge Functions
7. 把函数基础地址配置到小程序和 Flutter 客户端

推荐使用仓库脚本：

```bash
cp /Users/wzp/Documents/GitHub/FarmerNote1/supabase/.env.production.example \
   /Users/wzp/Documents/GitHub/FarmerNote1/supabase/.env.production

cd /Users/wzp/Documents/GitHub/FarmerNote1
./scripts/deploy_supabase_prod.sh <your-project-ref> supabase/.env.production
```

这个脚本默认不会把 `auth-dev-login` 部署到正式环境。

如果你坚持手动执行，流程是：

```bash
supabase link --project-ref <your-project-ref>
supabase secrets set --env-file supabase/.env.production
supabase db push
supabase functions deploy auth-wechat-login --no-verify-jwt
supabase functions deploy auth-phone-send-code --no-verify-jwt
supabase functions deploy auth-phone-login --no-verify-jwt
supabase functions deploy auth-link-phone --no-verify-jwt
supabase functions deploy auth-link-wechat --no-verify-jwt
supabase functions deploy auth-refresh --no-verify-jwt
supabase functions deploy account-request-deletion --no-verify-jwt
supabase functions deploy account-deletion-status --no-verify-jwt
supabase functions deploy account-purge-due --no-verify-jwt
supabase functions deploy sync-push --no-verify-jwt
supabase functions deploy sync-pull --no-verify-jwt
supabase functions deploy media-upload-ticket --no-verify-jwt
supabase functions deploy media-download-ticket --no-verify-jwt
```

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

- 微信登录：`auth-wechat-login`
- 发送手机验证码：`auth-phone-send-code`
- 手机号登录：`auth-phone-login`
- 绑定手机号：`auth-link-phone`
- 绑定微信：`auth-link-wechat`
- 发起账号注销：`account-request-deletion`
- 查看注销状态：`account-deletion-status`
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
- 手机号验证码现在由 Edge Functions 自己校验并通过阿里云短信发送
- 账号注销当前采用 15 天待删除窗口，最终清理由 `account-purge-due` 配合 GitHub Actions 定时执行
