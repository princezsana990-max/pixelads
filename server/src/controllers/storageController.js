const supabase = require('../config/supabase');
const r2Service = require('../services/r2Service');
const { sendSuccess, sendError } = require('../utils/response');
const env = require('../config/env');

const isR2Configured = () => {
  return Boolean(
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY &&
    (env.R2_ENDPOINT || env.R2_ACCOUNT_ID)
  );
};

const getSignedUploadUrl = async (req, res) => {
  try {
    const { bucket = 'order-files', fileName, contentType = 'application/octet-stream' } = req.body;

    if (!fileName) {
      return sendError(res, 'fileName is required', 400);
    }

    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const folder = bucket.replace(/[^a-zA-Z0-9_-]/g, '');
    const path = `${folder}/${Date.now()}_${cleanFileName}`;

    if (isR2Configured()) {
      try {
        const { signedUrl } = await r2Service.createUploadUrl({
          key: path,
          contentType: contentType,
          expiresIn: 3600
        });

        // Generate read URL
        const readUrl = await r2Service.getFileUrl({
          key: path,
          expiresIn: 604800 // 7 days default
        });

        return sendSuccess(res, {
          path,
          token: 'r2',
          signedUrl,
          publicUrl: readUrl,
          provider: 'r2'
        });
      } catch (r2Err) {
        console.error('R2 generic signed url failed, falling back to Supabase:', r2Err);
      }
    }

    // Fallback to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path);

    if (error) {
      throw new Error(error.message);
    }

    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return sendSuccess(res, {
      path,
      token: data.token,
      signedUrl: data.signedUrl,
      publicUrl: publicData.publicUrl,
      provider: 'supabase'
    });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

/**
 * Endpoint to get a fresh read/download URL for any stored file key
 */
const getSignedReadUrl = async (req, res) => {
  try {
    const { key, download = false, fileName } = req.query;
    if (!key) {
      return sendError(res, 'key is required', 400);
    }

    if (key.startsWith('http://') || key.startsWith('https://')) {
      return sendSuccess(res, { url: key });
    }

    if (isR2Configured()) {
      try {
        const contentDisposition = download
          ? `attachment; filename="${(fileName || key.split('/').pop() || 'file').replace(/"/g, '')}"`
          : undefined;

        const url = await r2Service.getFileUrl({
          key,
          expiresIn: 3600,
          contentDisposition
        });

        return sendSuccess(res, { url, provider: 'r2' });
      } catch (err) {
        console.warn('R2 read url error, trying Supabase:', err);
      }
    }

    // Fallback to Supabase
    const bucket = key.startsWith('videos/') ? 'order-videos' : 'order-files';
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(key, 3600);

    if (error) {
      throw new Error(error.message);
    }

    return sendSuccess(res, { url: data.signedUrl, provider: 'supabase' });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

module.exports = {
  getSignedUploadUrl,
  getSignedReadUrl
};
