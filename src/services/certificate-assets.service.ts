import { randomUUID } from "node:crypto";
import {
  certificateAssetsBucket,
  supabaseAdmin,
} from "../lib/supabase.js";

export type CertificateAssetKind =
  | "cover-portrait"
  | "cover-landscape"
  | "logo";

export interface UploadCertificateAssetData {
  templateId: string;
  kind: CertificateAssetKind;
  file: Express.Multer.File;
}

const FILE_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export class CertificateAssetUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CertificateAssetUploadError";
  }
}

export async function uploadCertificateAsset(
  data: UploadCertificateAssetData,
) {
  const extension = FILE_EXTENSIONS[data.file.mimetype];

  if (!extension) {
    throw new CertificateAssetUploadError(
      "Unsupported certificate asset type",
    );
  }

  const fileName =
    `${data.kind}-${randomUUID()}.${extension}`;

  const storagePath =
    `templates/${data.templateId}/${fileName}`;

  const { error } = await supabaseAdmin.storage
    .from(certificateAssetsBucket)
    .upload(storagePath, data.file.buffer, {
      contentType: data.file.mimetype,
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    throw new CertificateAssetUploadError(
      `Failed to upload ${data.kind}: ${error.message}`,
    );
  }

  const { data: publicUrlData } =
    supabaseAdmin.storage
      .from(certificateAssetsBucket)
      .getPublicUrl(storagePath);

  return {
    storagePath,
    publicUrl: publicUrlData.publicUrl,
  };
}

export async function deleteCertificateAssets(
  storagePaths: string[],
): Promise<void> {
  if (storagePaths.length === 0) {
    return;
  }

  const { error } = await supabaseAdmin.storage
    .from(certificateAssetsBucket)
    .remove(storagePaths);

  if (error) {
    throw new CertificateAssetUploadError(
      `Failed to delete certificate assets: ${error.message}`,
    );
  }
}