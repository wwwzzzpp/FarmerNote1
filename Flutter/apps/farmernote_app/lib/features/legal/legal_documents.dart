import '../../config/legal_config.dart';

enum LegalDocumentType { privacy, terms, accountDeletion }

class LegalDocumentSection {
  const LegalDocumentSection({
    required this.title,
    this.paragraphs = const <String>[],
    this.bullets = const <String>[],
    this.note = '',
  });

  final String title;
  final List<String> paragraphs;
  final List<String> bullets;
  final String note;
}

class LegalDocumentContent {
  const LegalDocumentContent({
    required this.title,
    required this.summary,
    required this.publicUrl,
    required this.sections,
  });

  final String title;
  final String summary;
  final String publicUrl;
  final List<LegalDocumentSection> sections;
}

LegalDocumentContent legalDocumentFor(LegalDocumentType type) {
  switch (type) {
    case LegalDocumentType.privacy:
      return LegalDocumentContent(
        title: '隐私政策',
        summary:
            '本政策覆盖初芽巡田 FarmerNote 的 Android App、小程序与云同步服务，说明我们会处理哪些信息、在什么场景下使用权限，以及账号注销后的删除安排。',
        publicUrl: LegalConfig.privacyPolicyUrl,
        sections: const <LegalDocumentSection>[
          LegalDocumentSection(
            title: '我们会处理哪些信息',
            bullets: <String>[
              '微信身份标识：仅在你主动选择微信登录或绑定微信时使用，用于识别同一个业务账号。',
              '手机号与短信验证码：仅在你主动选择手机号登录、绑定手机号或确认账号注销时使用。',
              '记录文本、提醒时间、待办状态与现场照片：仅在你主动保存记录时产生，用于时间线、待办和跨端同步。',
              '随机 deviceId：仅在你登录云端时生成，用于区分不同设备上的自定义 session。',
            ],
          ),
          LegalDocumentSection(
            title: '首次启动前的合规约束',
            note:
                '首次冷启动时，未点击“同意并继续”前，Flutter 不初始化第三方插件，不恢复业务本地状态，不触发微信 SDK，不请求摄像头或系统日历权限。',
          ),
          LegalDocumentSection(
            title: '权限使用说明',
            bullets: <String>[
              '摄像头：只在你点击“拍照记录”时申请。',
              '相册/照片访问：仅在系统图片流程需要保存或展示照片时使用。',
              '系统日历：仅在你主动保存带提醒时间的记录，并选择写入日历时申请。',
            ],
          ),
          LegalDocumentSection(
            title: '第三方组件披露',
            bullets: <String>[
              'fluwx：用于桥接微信开放平台登录。',
              'image_picker：用于相机拍照与图片返回。',
              'device_calendar：用于写入系统日历提醒。',
              'shared_preferences：用于本地业务状态、session 与随机 deviceId 持久化。',
            ],
          ),
          LegalDocumentSection(
            title: '删除规则',
            paragraphs: <String>[
              '账号注销提交后，会立即退出登录并进入 15 天待删除窗口。冷静期结束后，云端账号、身份绑定、记录、待办和媒体对象会被彻底删除。',
            ],
          ),
        ],
      );
    case LegalDocumentType.terms:
      return LegalDocumentContent(
        title: '用户协议',
        summary: '本协议说明 FarmerNote 提供的服务范围、账号规则、内容责任、服务变更、知识产权与账号注销机制。',
        publicUrl: LegalConfig.termsUrl,
        sections: const <LegalDocumentSection>[
          LegalDocumentSection(
            title: '服务内容',
            paragraphs: <String>['FarmerNote 提供巡田记录、待办提醒、时间线回看、照片管理以及多端云同步服务。'],
          ),
          LegalDocumentSection(
            title: '账号与登录',
            bullets: <String>[
              '你可以使用微信登录或手机号验证码登录。',
              '微信身份与已验证手机号会绑定到同一个业务账号。',
              '你应妥善保管自己的登录方式与验证码，不得冒用他人身份登录或注销账号。',
            ],
          ),
          LegalDocumentSection(
            title: '你的使用责任',
            bullets: <String>[
              '你应确保自己录入、上传或同步的内容具有合法来源。',
              '你不得利用 FarmerNote 上传违法、侵权或危害平台安全的内容。',
              '你不得恶意调用验证码、同步或媒体接口，或绕过限流与身份验证机制。',
            ],
          ),
          LegalDocumentSection(
            title: '账号注销',
            paragraphs: <String>[
              'App 设置页提供直接的注销账号入口。提交注销后，账号会立即退出登录并进入 15 天待删除窗口，到期后彻底删除云端数据。',
            ],
          ),
        ],
      );
    case LegalDocumentType.accountDeletion:
      return LegalDocumentContent(
        title: '账号注销说明',
        summary:
            '只要你使用了登录能力，App 设置页就提供直接的“注销账号”入口。注销申请提交后，账号立即失效，进入 15 天待删除窗口。',
        publicUrl: LegalConfig.accountDeletionUrl,
        sections: const <LegalDocumentSection>[
          LegalDocumentSection(
            title: '注销确认方式',
            bullets: <String>[
              '已绑定手机号：通过短信验证码确认注销。',
              '未绑定手机号但已绑定微信：通过微信再次授权确认注销。',
              '仅允许在当前有效登录态下发起。',
            ],
          ),
          LegalDocumentSection(
            title: '提交后会发生什么',
            bullets: <String>[
              '当前会话立即失效，所有 session 会被清除。',
              'App 本地会清空登录态并回到未登录状态。',
              '账号进入 15 天待删除窗口。',
              '冷静期结束后，云端账号、身份绑定、记录、待办和媒体对象会被删除。',
            ],
          ),
          LegalDocumentSection(
            title: '彻底删除范围',
            bullets: <String>[
              '账号主体信息 farmer_users',
              '身份绑定 farmer_user_identities',
              '登录会话 farmer_user_sessions',
              '巡田记录 entries',
              '待办数据 tasks',
              '云端图片对象 entry-photos',
            ],
          ),
        ],
      );
  }
}
