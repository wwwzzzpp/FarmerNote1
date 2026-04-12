const cloudConfig = require('./cloud-config');
const mediaUtils = require('./media');
const requestUtils = require('./cloud-request');

function inferExtension(filePath) {
  const match = String(filePath || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  const extension = match ? match[1] : '';
  if (extension === 'png' || extension === 'webp' || extension === 'jpg') {
    return extension;
  }
  if (extension === 'jpeg') {
    return 'jpg';
  }
  return 'jpg';
}

function inferContentType(filePath) {
  const extension = inferExtension(filePath);
  if (extension === 'png') {
    return 'image/png';
  }
  if (extension === 'webp') {
    return 'image/webp';
  }
  return 'image/jpeg';
}

async function uploadPhoto(session, localPhotoPath) {
  if (!localPhotoPath) {
    return '';
  }

  const contentType = inferContentType(localPhotoPath);
  const fileExtension = inferExtension(localPhotoPath);
  const ticket = await requestUtils.requestJson({
    url: cloudConfig.getFunctionUrl('media-upload-ticket'),
    method: 'POST',
    data: {
      contentType,
      fileExtension,
    },
    header: {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const fileBuffer = await requestUtils.readFileBuffer(localPhotoPath);
  await requestUtils.requestRaw({
    url: String(ticket.uploadUrl || ''),
    method: 'PUT',
    data: fileBuffer,
    header: {
      'Content-Type': contentType,
    },
  });

  return String(ticket.objectPath || '');
}

async function ensureDownloadedPhoto(session, objectPath) {
  if (!objectPath) {
    return '';
  }

  const ticket = await requestUtils.requestJson({
    url: cloudConfig.getFunctionUrl('media-download-ticket'),
    method: 'POST',
    data: {
      objectPath,
    },
    header: {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const rawDownloadUrl = String(ticket.downloadUrl || '');
  const downloadUrl =
    rawDownloadUrl.indexOf('http') === 0
      ? rawDownloadUrl
      : `${cloudConfig.getStorageOrigin()}${rawDownloadUrl}`;
  const tempFilePath = await requestUtils.downloadFile(downloadUrl);
  return requestUtils.saveFile(tempFilePath);
}

function hasUsableLocalPhoto(filePath) {
  return requestUtils.fileExists(filePath);
}

function removeLocalPhoto(filePath) {
  return mediaUtils.removeSavedPhoto(filePath);
}

module.exports = {
  ensureDownloadedPhoto,
  hasUsableLocalPhoto,
  removeLocalPhoto,
  uploadPhoto,
};
