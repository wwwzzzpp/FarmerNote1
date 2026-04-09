function buildError(code, message, originalError) {
  const error = new Error(message);
  error.code = code;
  error.originalError = originalError || null;
  return error;
}

function isCancelError(error, fallbackKeyword) {
  const errMsg = String((error && error.errMsg) || '');
  return errMsg.includes('cancel') || (fallbackKeyword && errMsg.includes(fallbackKeyword));
}

function chooseCameraPhoto() {
  return new Promise((resolve, reject) => {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera'],
      success: ({ tempFilePaths }) => {
        const tempFilePath = Array.isArray(tempFilePaths) ? tempFilePaths[0] : '';

        if (!tempFilePath) {
          reject(buildError('empty_result', '没有拿到照片，请重试。'));
          return;
        }

        resolve(tempFilePath);
      },
      fail: (error) => {
        if (isCancelError(error, 'chooseImage')) {
          reject(buildError('cancel', '已取消拍照。', error));
          return;
        }

        reject(buildError('choose_failed', '拍照失败，请稍后再试。', error));
      },
    });
  });
}

function persistPhoto(tempFilePath) {
  return new Promise((resolve, reject) => {
    if (!tempFilePath) {
      reject(buildError('missing_file', '没有可保存的照片。'));
      return;
    }

    wx.saveFile({
      tempFilePath,
      success: ({ savedFilePath }) => {
        if (!savedFilePath) {
          reject(buildError('empty_saved_path', '照片保存失败，请重试。'));
          return;
        }

        resolve(savedFilePath);
      },
      fail: (error) => {
        reject(buildError('save_failed', '照片保存失败，请稍后再试。', error));
      },
    });
  });
}

function removeSavedPhoto(filePath) {
  return new Promise((resolve) => {
    if (!filePath) {
      resolve();
      return;
    }

    wx.removeSavedFile({
      filePath,
      complete: () => {
        resolve();
      },
    });
  });
}

function previewPhoto(filePath) {
  if (!filePath) {
    return;
  }

  wx.previewImage({
    current: filePath,
    urls: [filePath],
  });
}

module.exports = {
  chooseCameraPhoto,
  persistPhoto,
  previewPhoto,
  removeSavedPhoto,
};
