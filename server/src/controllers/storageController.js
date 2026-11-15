const supabase = require('../config/supabase');
const { sendSuccess, sendError } = require('../utils/response');

const getSignedUploadUrl = async (req, res) => {
  try {
    const { bucket = 'order-files', fileName } = req.body;

    if (!fileName) {
      return sendError(res, 'fileName is required', 400);
    }

    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${Date.now()}_${cleanFileName}`;

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
      publicUrl: publicData.publicUrl
    });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

module.exports = {
  getSignedUploadUrl
};
