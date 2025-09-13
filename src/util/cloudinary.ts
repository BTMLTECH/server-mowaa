import cloudinary from "cloudinary";
import { Readable } from "stream";

// Cloudinary Config (from .env)
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface UploadResult {
  secure_url: string;
  public_id: string;
}

/**

 * @param buffer 
 * @param folder 
 * @param resourceType
 * @param publicId 
 * @param uploadPreset 
 * @returns 
 */
export const uploadToCloudinary = (
  buffer: Buffer,
  folder: string,
  resourceType: "image" | "raw" | "auto" = "auto",
  publicId?: string,
  extension?: string, // ✅ add extension support
  uploadPreset?: string
): Promise<UploadResult> => {
  return new Promise((resolve, reject) => {
    const options: any = {
      folder,
      resource_type: resourceType,
    };

    if (uploadPreset) {
      options.upload_preset = uploadPreset;
    }

    if (publicId) {
      // ✅ add extension to public_id if provided
      options.public_id = extension ? `${publicId}.${extension}` : publicId;
      options.overwrite = true;
      options.unique_filename = false;
    }

    const stream = cloudinary.v2.uploader.upload_stream(
      options,
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Cloudinary upload failed"));
        } else {
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
          });
        }
      }
    );

    Readable.from(buffer).pipe(stream);
  });
};
