import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";

export const uploadToCloudinary = (
    buffer,
    folder,
    resourceType = "auto"
) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: resourceType,
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );

        Readable.from(buffer).pipe(uploadStream);
    });
};

export const deleteFromCloudinary = async (
    publicId,
    resourceType = "image"
) => {
    if (!publicId) return;

    await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
    });
};