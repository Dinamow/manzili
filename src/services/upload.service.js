const { cloudinary } = require('../config/cloudinary');
const { AppError } = require('../utils/errors');

async function uploadImage(file) {
  if (!file) throw new AppError('No file provided', 400);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'manzili', resource_type: 'image' },
      (error, result) => {
        if (error) return reject(new AppError('Upload failed: ' + error.message, 500));
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
        });
      }
    );
    stream.end(file.buffer);
  });
}

module.exports = { uploadImage };
