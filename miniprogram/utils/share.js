const SHARE_SCENES = {
  record: {
    title: '初芽巡田｜把田里看到的、想到的、要处理的，先稳稳记下来',
    path: '/pages/record/index',
    query: 'from=share_timeline&page=record',
  },
  timeline: {
    title: '初芽巡田｜时间线里回看每一次巡田记录和待办处理',
    path: '/pages/timeline/index',
    query: 'from=share_timeline&page=timeline',
  },
  plan: {
    title: '初芽巡田｜按作物生命周期查看农事计划与关键动作',
    path: '/pages/plan/index',
    query: 'from=share_timeline&page=plan',
  },
};

function getSceneConfig(sceneKey) {
  return SHARE_SCENES[sceneKey] || SHARE_SCENES.record;
}

function enablePageShareMenus() {
  if (typeof wx === 'undefined' || typeof wx.showShareMenu !== 'function') {
    return;
  }

  try {
    wx.showShareMenu({
      menus: ['shareAppMessage', 'shareTimeline'],
    });
  } catch (_) {
    try {
      wx.showShareMenu();
    } catch (__unused) {
      // Ignore unsupported clients.
    }
  }
}

function buildShareAppMessage(sceneKey) {
  const scene = getSceneConfig(sceneKey);
  return {
    title: scene.title,
    path: scene.path,
  };
}

function buildShareTimeline(sceneKey) {
  const scene = getSceneConfig(sceneKey);
  return {
    title: scene.title,
    query: scene.query,
  };
}

module.exports = {
  buildShareAppMessage,
  buildShareTimeline,
  enablePageShareMenus,
};
