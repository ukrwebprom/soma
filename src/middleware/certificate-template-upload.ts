import multer from "multer";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export const certificateTemplateUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 3,
  },

  fileFilter: (_request, file, callback) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      callback(
        new Error(
          "Only PNG, JPEG and WebP images are allowed",
        ),
      );

      return;
    }

    callback(null, true);
  },
}).fields([
  {
    name: "coverPortrait",
    maxCount: 1,
  },
  {
    name: "coverLandscape",
    maxCount: 1,
  },
  {
    name: "logo",
    maxCount: 1,
  },
]);