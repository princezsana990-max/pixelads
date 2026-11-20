const env = require('../config/env');

let awsSdkS3 = null;
let awsSdkPresigner = null;

const loadAwsSdk = () => {
  if (!awsSdkS3) {
    try {
      awsSdkS3 = require('@aws-sdk/client-s3');
      awsSdkPresigner = require('@aws-sdk/s3-request-presigner');
    } catch (err) {
      // Package not installed locally yet (e.g. before npm install or on environments without AWS SDK)
      return null;
    }
  }
  return { ...awsSdkS3, ...awsSdkPresigner };
};

let s3ClientInstance = null;

const getS3Client = () => {
  const sdk = loadAwsSdk();
  if (!sdk) {
    throw new Error('@aws-sdk/client-s3 package is not installed. Please run: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner');
  }

  if (!s3ClientInstance) {
    const endpoint = env.R2_ENDPOINT || (env.R2_ACCOUNT_ID ? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '');
    
    if (!endpoint || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
      console.warn('Cloudflare R2 credentials or endpoint not fully set in environment.');
    }

    s3ClientInstance = new sdk.S3Client({
      region: 'auto',
      endpoint: endpoint,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY
      }
    });
  }
  return s3ClientInstance;
};

const getBucketName = () => {
  return env.R2_BUCKET_NAME || 'my-software-media';
};

/**
 * Direct server-side upload of a file/buffer to R2
 */
const uploadFile = async ({ key, body, contentType, bucket = getBucketName() }) => {
  const sdk = loadAwsSdk();
  const client = getS3Client();
  const command = new sdk.PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType
  });
  return client.send(command);
};

/**
 * Generate a presigned PUT URL for direct browser-to-R2 upload
 */
const createUploadUrl = async ({ key, contentType, expiresIn = 3600, bucket = getBucketName() }) => {
  const sdk = loadAwsSdk();
  const client = getS3Client();
  const command = new sdk.PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType
  });
  const signedUrl = await sdk.getSignedUrl(client, command, { expiresIn });
  return {
    signedUrl,
    key,
    bucket
  };
};

/**
 * Generate a presigned GET URL for secure media preview/playback/download
 */
const getFileUrl = async ({ key, expiresIn = 3600, bucket = getBucketName(), contentDisposition }) => {
  const sdk = loadAwsSdk();
  const client = getS3Client();
  const commandParams = {
    Bucket: bucket,
    Key: key
  };
  if (contentDisposition) {
    commandParams.ResponseContentDisposition = contentDisposition;
  }
  const command = new sdk.GetObjectCommand(commandParams);
  return sdk.getSignedUrl(client, command, { expiresIn });
};

/**
 * Delete an object from R2
 */
const deleteFile = async ({ key, bucket = getBucketName() }) => {
  const sdk = loadAwsSdk();
  const client = getS3Client();
  const command = new sdk.DeleteObjectCommand({
    Bucket: bucket,
    Key: key
  });
  return client.send(command);
};

/**
 * Check if an object exists in R2
 */
const checkFileExists = async ({ key, bucket = getBucketName() }) => {
  const sdk = loadAwsSdk();
  const client = getS3Client();
  try {
    const command = new sdk.HeadObjectCommand({
      Bucket: bucket,
      Key: key
    });
    await client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
};

/**
 * Multipart upload support for large video/file uploads
 */
const createMultipartUpload = async ({ key, contentType, bucket = getBucketName() }) => {
  const sdk = loadAwsSdk();
  const client = getS3Client();
  const command = new sdk.CreateMultipartUploadCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType
  });
  const res = await client.send(command);
  return {
    uploadId: res.UploadId,
    key,
    bucket
  };
};

const getMultipartPartUrl = async ({ key, uploadId, partNumber, expiresIn = 3600, bucket = getBucketName() }) => {
  const sdk = loadAwsSdk();
  const client = getS3Client();
  const command = new sdk.UploadPartCommand({
    Bucket: bucket,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber
  });
  return sdk.getSignedUrl(client, command, { expiresIn });
};

const completeMultipartUpload = async ({ key, uploadId, parts, bucket = getBucketName() }) => {
  const sdk = loadAwsSdk();
  const client = getS3Client();
  const command = new sdk.CompleteMultipartUploadCommand({
    Bucket: bucket,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts // Array of { ETag, PartNumber }
    }
  });
  return client.send(command);
};

const abortMultipartUpload = async ({ key, uploadId, bucket = getBucketName() }) => {
  const sdk = loadAwsSdk();
  const client = getS3Client();
  const command = new sdk.AbortMultipartUploadCommand({
    Bucket: bucket,
    Key: key,
    UploadId: uploadId
  });
  return client.send(command);
};

module.exports = {
  loadAwsSdk,
  getS3Client,
  getBucketName,
  uploadFile,
  createUploadUrl,
  getFileUrl,
  deleteFile,
  checkFileExists,
  createMultipartUpload,
  getMultipartPartUrl,
  completeMultipartUpload,
  abortMultipartUpload
};
