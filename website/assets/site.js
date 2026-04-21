window.FARMERNOTE_SITE = {
  productName: '初芽巡田',
  productShortName: 'FarmerNote',
  websiteUrl: 'https://web-t.chuya.wang/',
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
})();
