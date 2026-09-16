import { v2 as cloudinary } from 'cloudinary';

// Khởi tạo Cloudinary với env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload buffer lên Cloudinary, trả về secure_url (public, ai cũng xem được).
 * folder: thư mục trên Cloudinary (vd "flextrip/avatars")
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  filename: string,
  folder = 'flextrip/avatars',
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: filename.replace(/\.[^.]+$/, ''),
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        transformation: [
          { width: 500, height: 500, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result!.secure_url);
      },
    );
    stream.end(buffer);
  });
}

/**
 * Xoá ảnh khỏi Cloudinary theo public_id (trích từ URL).
 */
export async function deleteFromCloudinary(secureUrl: string): Promise<void> {
  try {
    const url = new URL(secureUrl);
    // URL dạng: https://res.cloudinary.com/<cloud>/image/upload/v<version>/<folder>/<public_id>
    // public_id = path segments sau "upload" trừ version
    const segments = url.pathname.split('/').filter(Boolean); // bỏ empty
    const uploadIdx = segments.indexOf('upload');
    if (uploadIdx === -1) return;
    // Lấy segments từ sau "upload" + 1 (bỏ version) cho đến hết
    const publicId = segments.slice(uploadIdx + 2).join('/');
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // ignore — URL không parse được thì bỏ qua
  }
}
