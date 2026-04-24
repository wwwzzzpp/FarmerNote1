window.FARMERNOTE_SITE = {
  productName: '初芽巡田',
  productShortName: 'FarmerNote',
  websiteUrl: 'https://web-t.chuya.wang/',
  androidDownloadPageUrl: 'https://web-t.chuya.wang/download/android/',
  androidApkUrl: 'https://web-t.chuya.wang/download/android/FarmerNote-latest.apk',
  androidVersion: 'v1.0.6 正式版 Android APK',
  androidApkSize: '52.2 MB',
  androidUpdatedAt: '2026-04-22 23:44',
  androidPackageName: 'com.farmernote.farmernote_app',
  androidApkSha256: 'f964d36ec9ac28612cc4763d66d63a0aab7094bc57e5c218b77f49e21a0faf4b',
  supportText: '待补充公开联系方式',
  supportHint: '正式上架前，请把这里替换成公开邮箱、客服电话或客服微信。',
  supportEmail: '待补充公开邮箱',
  supportPhone: '待补充公开电话',
  deletionWindowDays: 15,
};

(function bootstrapSite() {
  const config = window.FARMERNOTE_SITE;
  const year = new Date().getFullYear();

  document.querySelectorAll('[data-site-year]').forEach((node) => {
    node.textContent = String(year);
  });

  document.querySelectorAll('[data-support-text]').forEach((node) => {
    node.textContent = config.supportText;
  });

  document.querySelectorAll('[data-support-hint]').forEach((node) => {
    node.textContent = config.supportHint;
  });

  document.querySelectorAll('[data-website-url]').forEach((node) => {
    node.textContent = config.websiteUrl;
    if (node.tagName.toLowerCase() === 'a') {
      node.setAttribute('href', config.websiteUrl);
    }
  });

  document.querySelectorAll('[data-deletion-days]').forEach((node) => {
    node.textContent = String(config.deletionWindowDays);
  });

  document.querySelectorAll('[data-android-download-page-url]').forEach((node) => {
    const url = config.androidDownloadPageUrl;
    if (!url) {
      return;
    }
    if (!node.hasAttribute('data-keep-label')) {
      node.textContent = url;
    }
    if (node.tagName.toLowerCase() === 'a') {
      node.setAttribute('href', url);
    }
  });

  document.querySelectorAll('[data-android-apk-url]').forEach((node) => {
    const url = config.androidApkUrl;
    if (!url) {
      return;
    }
    if (!node.hasAttribute('data-keep-label')) {
      node.textContent = url;
    }
    if (node.tagName.toLowerCase() === 'a') {
      node.setAttribute('href', url);
    }
  });

  document.querySelectorAll('[data-android-version]').forEach((node) => {
    node.textContent = config.androidVersion;
  });

  document.querySelectorAll('[data-android-apk-size]').forEach((node) => {
    node.textContent = config.androidApkSize;
  });

  document.querySelectorAll('[data-android-updated-at]').forEach((node) => {
    node.textContent = config.androidUpdatedAt;
  });

  document.querySelectorAll('[data-android-package-name]').forEach((node) => {
    node.textContent = config.androidPackageName;
  });

  document.querySelectorAll('[data-android-apk-sha256]').forEach((node) => {
    node.textContent = config.androidApkSha256;
  });

  const isWeChat = /MicroMessenger/i.test(window.navigator.userAgent || '');
  document.documentElement.classList.toggle('is-wechat', isWeChat);
  document.querySelectorAll('[data-wechat-download-hint]').forEach((node) => {
    node.hidden = !isWeChat;
  });

  document.querySelectorAll('[data-copy-value]').forEach((node) => {
    node.addEventListener('click', async () => {
      const key = node.getAttribute('data-copy-value');
      const value = key ? config[key] : '';
      if (!value) {
        return;
      }

      const originalText = node.textContent;
      try {
        await navigator.clipboard.writeText(value);
        node.textContent = '已复制链接';
      } catch (_) {
        node.textContent = '复制失败，请手动长按链接';
      }

      window.setTimeout(() => {
        node.textContent = originalText;
      }, 1800);
    });
  });

  // Download section tabs logic
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const header = e.currentTarget.closest('.tabs-header');
      header.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      
      const panel = e.currentTarget.closest('.download-panel');
      panel.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      
      const targetId = e.currentTarget.getAttribute('data-target');
      const targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.classList.add('active');
      }
    });
  });
})();
