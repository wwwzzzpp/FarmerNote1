const legalConfig = require('./legal-config');

const DOCUMENTS = {
  privacy: {
    type: 'privacy',
    title: '隐私政策',
    summary:
      '本政策覆盖初芽巡田 FarmerNote 的 Android App、小程序与云同步服务，说明我们会处理哪些信息、在什么场景下使用权限，以及账号注销后的删除安排。',
    publicUrl: legalConfig.PRIVACY_POLICY_URL,
    sections: [
      {
        title: '我们会处理哪些信息',
        bullets: [
          '微信身份标识：仅在你主动选择微信登录或绑定微信时使用，用于识别同一个业务账号。',
          '手机号与短信验证码：仅在你主动选择手机号登录、绑定手机号或确认账号注销时使用。',
          '记录文本、提醒时间、待办状态与现场照片：仅在你主动保存记录时产生，用于时间线、待办和跨端同步。',
          '随机 deviceId：仅在你登录云端时生成，用于区分不同设备上的自定义 session。',
        ],
      },
      {
        title: '首次启动前的合规约束',
        note:
          '首次冷启动时，未点击“同意并继续”前，FarmerNote 不恢复业务本地状态，不触发云端登录流程，也不会请求摄像头或系统日历权限。',
      },
      {
        title: '权限使用说明',
        bullets: [
          '摄像头：只在你点击“拍照记录”时申请。',
          '相册/照片访问：仅在系统图片流程需要保存或展示照片时使用。',
          '系统日历：仅在你主动保存带提醒时间的记录，并选择写入日历时申请。',
        ],
      },
      {
        title: '第三方组件披露',
        bullets: [
          '微信开放能力：用于获取微信登录授权码与微信身份绑定。',
          '阿里云短信服务：用于手机号登录、绑定手机号和账号注销确认验证码发送。',
          'Supabase Edge Functions 与 Storage：用于账号鉴权、数据同步与云端图片存储。',
          '微信小程序本地存储：用于保存协议同意状态、本地记录和当前登录 session。',
        ],
      },
      {
        title: '删除规则',
        paragraphs: [
          '账号注销提交后，会立即退出登录并进入 15 天待删除窗口。冷静期结束后，云端账号、身份绑定、记录、待办和媒体对象会被彻底删除。',
        ],
      },
    ],
  },
  terms: {
    type: 'terms',
    title: '用户协议',
    summary:
      '本协议说明 FarmerNote 提供的服务范围、账号规则、内容责任、服务变更、知识产权与账号注销机制。',
    publicUrl: legalConfig.TERMS_URL,
    sections: [
      {
        title: '服务内容',
        paragraphs: [
          'FarmerNote 提供巡田记录、待办提醒、时间线回看、照片管理以及多端云同步服务。',
        ],
      },
      {
        title: '账号与登录',
        bullets: [
          '你可以使用微信登录或手机号验证码登录。',
          '微信身份与已验证手机号会绑定到同一个业务账号。',
          '你应妥善保管自己的登录方式与验证码，不得冒用他人身份登录或注销账号。',
        ],
      },
      {
        title: '你的使用责任',
        bullets: [
          '你应确保自己录入、上传或同步的内容具有合法来源。',
          '你不得利用 FarmerNote 上传违法、侵权或危害平台安全的内容。',
          '你不得恶意调用验证码、同步或媒体接口，或绕过限流与身份验证机制。',
        ],
      },
      {
        title: '账号注销',
        paragraphs: [
          '设置页提供直接的注销账号入口。提交注销后，账号会立即退出登录并进入 15 天待删除窗口，到期后彻底删除云端数据。',
        ],
      },
    ],
  },
  accountDeletion: {
    type: 'accountDeletion',
    title: '账号注销说明',
    summary:
      '只要你使用了登录能力，设置页就提供直接的“注销账号”入口。注销申请提交后，账号立即失效，进入 15 天待删除窗口。',
    publicUrl: legalConfig.ACCOUNT_DELETION_URL,
    sections: [
      {
        title: '注销确认方式',
        bullets: [
          '已绑定手机号：通过短信验证码确认注销。',
          '未绑定手机号但已绑定微信：通过微信再次授权确认注销。',
          '仅允许在当前有效登录态下发起。',
        ],
      },
      {
        title: '提交后会发生什么',
        bullets: [
          '当前会话立即失效，所有 session 会被清除。',
          '本地会清空登录态并回到未登录状态。',
          '账号进入 15 天待删除窗口。',
          '冷静期结束后，云端账号、身份绑定、记录、待办和媒体对象会被删除。',
        ],
      },
      {
        title: '彻底删除范围',
        bullets: [
          '账号主体信息 farmer_users',
          '身份绑定 farmer_user_identities',
          '登录会话 farmer_user_sessions',
          '巡田记录 entries',
          '待办数据 tasks',
          '云端图片对象 entry-photos',
        ],
      },
    ],
  },
};

function getLegalDocument(type) {
  const document = DOCUMENTS[type] || DOCUMENTS.privacy;
  return {
    type: document.type,
    title: document.title,
    summary: document.summary,
    publicUrl: document.publicUrl,
    sections: (document.sections || []).map((section) => ({
      title: section.title,
      paragraphs: Array.isArray(section.paragraphs) ? section.paragraphs : [],
      bullets: Array.isArray(section.bullets) ? section.bullets : [],
      note: String(section.note || ''),
    })),
  };
}

module.exports = {
  getLegalDocument,
};
