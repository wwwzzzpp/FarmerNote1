function buildError(code, message, originalError) {
  const error = new Error(message);
  error.code = code;
  error.originalError = originalError || null;
  error.statusCode =
    (originalError && originalError.statusCode) ||
    (originalError && originalError.originalError && originalError.originalError.statusCode) ||
    null;
  return error;
}

function normalizePayload(data) {
  if (!data) {
    return {};
  }

  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  return data;
}

function readErrorPayload(payload, statusCode) {
  const nestedError = payload && payload.error && typeof payload.error === 'object' ? payload.error : null;
  const code =
    (nestedError && nestedError.code) ||
    (payload && payload.code) ||
    'request_failed';
  const message =
    (nestedError && nestedError.message) ||
    (payload && payload.message) ||
    `请求失败（${statusCode}）`;

  return {
    code: String(code || 'request_failed'),
    message: String(message || `请求失败（${statusCode}）`),
  };
}

function requestJson(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: options.url,
      method: options.method || 'GET',
      data: options.data,
      header: options.header,
      timeout: options.timeout || 15000,
      success: ({ statusCode, data }) => {
        const payload = normalizePayload(data);
        if (statusCode < 200 || statusCode >= 300) {
          const errorPayload = readErrorPayload(payload, statusCode);
          reject(
            buildError(
              errorPayload.code,
              errorPayload.message,
              {
                statusCode,
                payload,
              }
            )
          );
          return;
        }

        resolve(payload);
      },
      fail: (error) => {
        reject(buildError('network_failed', '网络请求失败，请稍后再试。', error));
      },
    });
  });
}

function requestRaw(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: options.url,
      method: options.method || 'GET',
      data: options.data,
      header: options.header,
      responseType: options.responseType,
      timeout: options.timeout || 30000,
      success: (response) => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(
            buildError(
              'request_failed',
              `请求失败（${response.statusCode}）`,
              response
            )
          );
          return;
        }

        resolve(response);
      },
      fail: (error) => {
        reject(buildError('network_failed', '网络请求失败，请稍后再试。', error));
      },
    });
  });
}

function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: resolve,
      fail: (error) => {
        reject(buildError('wx_login_failed', '微信登录失败，请稍后再试。', error));
      },
    });
  });
}

function readFileBuffer(filePath) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath,
      success: ({ data }) => {
        resolve(data);
      },
      fail: (error) => {
        reject(buildError('read_file_failed', '读取本地图片失败。', error));
      },
    });
  });
}

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url,
      success: ({ statusCode, tempFilePath }) => {
        if (statusCode < 200 || statusCode >= 300 || !tempFilePath) {
          reject(buildError('download_failed', '下载云端图片失败。'));
          return;
        }
        resolve(tempFilePath);
      },
      fail: (error) => {
        reject(buildError('download_failed', '下载云端图片失败。', error));
      },
    });
  });
}

function saveFile(tempFilePath) {
  return new Promise((resolve, reject) => {
    wx.saveFile({
      tempFilePath,
      success: ({ savedFilePath }) => {
        if (!savedFilePath) {
          reject(buildError('save_file_failed', '缓存图片失败。'));
          return;
        }
        resolve(savedFilePath);
      },
      fail: (error) => {
        reject(buildError('save_file_failed', '缓存图片失败。', error));
      },
    });
  });
}

function fileExists(filePath) {
  return new Promise((resolve) => {
    if (!filePath) {
      resolve(false);
      return;
    }

    wx.getFileInfo({
      filePath,
      success: () => resolve(true),
      fail: () => resolve(false),
    });
  });
}

module.exports = {
  buildError,
  downloadFile,
  fileExists,
  readErrorPayload,
  readFileBuffer,
  requestJson,
  requestRaw,
  saveFile,
  wxLogin,
};
