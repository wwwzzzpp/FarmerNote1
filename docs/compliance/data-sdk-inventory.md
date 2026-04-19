# FarmerNote 数据与 SDK 台账

最后更新：2026-04-19

这份台账作为 FarmerNote 合规文案的源头，用于对齐以下内容：

- Flutter App 首次启动隐私弹窗
- App 内《隐私政策》《用户协议》《账号注销说明》
- `website/` 官网公开页面
- 安卓应用市场上架资料

## 数据项台账

| 数据项 | 触发场景 | 处理目的 | 是否必选 | 存储位置 | 删除机制 |
| --- | --- | --- | --- | --- | --- |
| 微信 UnionID / OpenID | 用户主动选择微信登录或绑定微信 | 建立微信身份、完成跨端账号识别 | 否 | Supabase `farmer_user_identities` / `farmer_users` | 注销后随账号删除 |
| 手机号 | 用户主动选择手机号登录、绑定手机号、手机号注销确认 | 建立手机号身份、发送登录验证码、注销确认 | 否 | Supabase `farmer_user_identities` | 注销后随账号删除 |
| 短信验证码哈希 | 发送短信验证码 | 验证登录与注销确认 | 否 | Supabase `farmer_phone_verification_codes` | 过期或验证后失效 |
| 记录文本 | 用户保存巡田记录 | 形成记录、生成时间线和待办 | 否 | 本机 `SharedPreferences` / Supabase `entries` | 本机删除或账号注销后删除 |
| 提醒时间 | 用户保存带提醒的记录 | 生成待办、判断逾期与日历写入 | 否 | 本机 / Supabase `tasks` | 本机删除或账号注销后删除 |
| 现场照片 | 用户主动拍照 | 记录现场情况、跨端展示 | 否 | 本机文件目录 / Supabase Storage `entry-photos` | 本机删除或账号注销后删除 |
| 随机 deviceId | 进行云端登录 | 维护自定义 session、区分设备 | 登录所需 | 本机 `SharedPreferences` / Supabase `farmer_user_sessions` | 注销后会话清空 |
| 同步请求日志与速率限制记录 | 发送验证码、登录、同步、媒体票据 | 防刷、防滥用、排障 | 服务所需 | Supabase 数据库与函数日志 | 按环境日志策略轮转 |

## 权限台账

| 权限 | 使用位置 | 使用时机 | 目的 | 同意前是否触达 |
| --- | --- | --- | --- | --- |
| 摄像头 | Flutter App | 用户点击“拍照记录” | 拍摄现场照片 | 否 |
| 相册/照片读取 | Flutter App | 系统图片流程需要时 | 展示刚拍照片 | 否 |
| 日历读写 | Flutter App | 用户保存带提醒的记录并允许写入日历 | 创建系统日历提醒 | 否 |

## 第三方 SDK / 插件台账

| 组件 | 运营方 / 来源 | 用途 | 可能触达的数据 | 链接 |
| --- | --- | --- | --- | --- |
| fluwx | Flutter 社区插件，桥接微信开放平台 SDK | 微信登录、微信身份绑定 | 微信授权 code、UnionID / OpenID | [fluwx](https://pub.dev/packages/fluwx), [腾讯隐私政策](https://www.tencent.com/zh-cn/privacy-policy.html) |
| image_picker | Flutter 官方插件 | 调用系统拍照流程 | 用户主动拍摄的图片 | [image_picker](https://pub.dev/packages/image_picker) |
| device_calendar | Flutter 社区插件 | 调用系统日历 | 提醒标题、时间、日历权限状态 | [device_calendar](https://pub.dev/packages/device_calendar) |
| shared_preferences | Flutter 官方插件 | 业务状态、本地 session、随机 deviceId 持久化 | 本机偏好与缓存内容 | [shared_preferences](https://pub.dev/packages/shared_preferences) |

## 合规约束

- 首次冷启动未同意前，Flutter 不初始化第三方插件。
- 首次冷启动未同意前，不恢复业务本地状态。
- 首次冷启动未同意前，不请求摄像头、相册、日历权限。
- 账号注销窗口固定为 15 天。
- 微信与手机号统一挂到同一个业务账号 `farmer_users.id`。

## 待补充公开信息

- 公开支持邮箱
- 公开客服电话或客服微信
- 如启用自定义官网域名，对应的正式 URL
