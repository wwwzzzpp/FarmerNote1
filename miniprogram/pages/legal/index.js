const legalConfig = require('../../utils/legal-config');
const legalDocuments = require('../../utils/legal-documents');

Page({
  data: {
    document: legalDocuments.getLegalDocument('privacy'),
    supportContact: legalConfig.SUPPORT_CONTACT,
    supportHint: legalConfig.SUPPORT_HINT,
  },

  onLoad(options) {
    const type = String((options && options.type) || 'privacy');
    const document = legalDocuments.getLegalDocument(type);
    this.setData({
      document,
    });
    wx.setNavigationBarTitle({
      title: document.title,
    });
  },

  copyPublicUrl() {
    wx.setClipboardData({
      data: this.data.document.publicUrl,
    });
  },
});
