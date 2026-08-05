import QRCode from "qrcode";
import sharp from "sharp";

import { prisma } from "../lib/prisma.js";

export type CertificateImageLayout =
  | "PORTRAIT"
  | "LANDSCAPE";

interface CertificateImageData {
  title: string;
  instructionText: string | null;
  expiresAt: Date;
  coverUrl: string;
  logoUrl: string | null;
  verificationUrl: string;
}

interface TextSvgOptions {
  width: number;
  height: number;
  text: string;
  fontSize: number;
  lineHeight: number;
  maxCharacters: number;
  maxLines: number;
  color: string;
  fontWeight?: number;
  align?: "left" | "center";
  strokeColor?: string;
  strokeWidth?: number;
}

interface ImageLayer {
  input: Buffer;
  left: number;
  top: number;
}

export class CertificateImageNotFoundError
  extends Error {
  constructor() {
    super("Certificate not found");
    this.name = "CertificateImageNotFoundError";
  }
}

export class CertificateImageAssetError
  extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CertificateImageAssetError";
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(
  value: string,
  maxCharacters: number,
  maxLines: number,
): string[] {
  const normalizedText = value
    .trim()
    .replace(/\s+/g, " ");

  if (!normalizedText) {
    return [];
  }

  const words = normalizedText.split(" ");
  const lines: string[] = [];

  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine
      ? `${currentLine} ${word}`
      : word;

    if (
      !currentLine ||
      candidate.length <= maxCharacters
    ) {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;

    if (lines.length >= maxLines) {
      break;
    }
  }

  if (
    currentLine &&
    lines.length < maxLines
  ) {
    lines.push(currentLine);
  }

  const displayedText = lines.join(" ");

  if (
    displayedText.length <
      normalizedText.length &&
    lines.length > 0
  ) {
    const lastIndex = lines.length - 1;
    const lastLine = lines[lastIndex];

    lines[lastIndex] =
      `${lastLine.slice(
        0,
        Math.max(1, maxCharacters - 1),
      ).trimEnd()}…`;
  }

  return lines;
}

function createTextSvg(
  options: TextSvgOptions,
): Buffer {
  const {
    width,
    height,
    text,
    fontSize,
    lineHeight,
    maxCharacters,
    maxLines,
    color,
    fontWeight = 400,
    align = "left",
    strokeColor = "none",
    strokeWidth = 0,
  } = options;

  const lines = wrapText(
    text,
    maxCharacters,
    maxLines,
  );

  const textAnchor =
    align === "center"
      ? "middle"
      : "start";

  const x =
    align === "center"
      ? width / 2
      : 0;

  const totalHeight =
    Math.max(1, lines.length) * lineHeight;

  const startY = Math.max(
    fontSize,
    (height - totalHeight) / 2 +
      fontSize,
  );

  const textLines = lines
    .map((line, index) => {
      const y =
        startY + index * lineHeight;

      return `
        <tspan
          x="${x}"
          y="${y}"
        >${escapeXml(line)}</tspan>
      `;
    })
    .join("");

  return Buffer.from(`
    <svg
      width="${width}"
      height="${height}"
      viewBox="0 0 ${width} ${height}"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        fill="${color}"
        stroke="${strokeColor}"
        stroke-width="${strokeWidth}"
        stroke-linejoin="round"
        paint-order="stroke fill"
        font-family="Arial, DejaVu Sans, sans-serif"
        font-size="${fontSize}"
        font-weight="${fontWeight}"
        text-anchor="${textAnchor}"
      >
        ${textLines}
      </text>
    </svg>
  `);
}

function createGradientSvg(
  width: number,
  height: number,
  opacity: number,
): Buffer {
  return Buffer.from(`
    <svg
      width="${width}"
      height="${height}"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="gradient"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="0%"
            stop-color="#000000"
            stop-opacity="0"
          />

          <stop
            offset="100%"
            stop-color="#000000"
            stop-opacity="${opacity}"
          />
        </linearGradient>
      </defs>

      <rect
        width="${width}"
        height="${height}"
        fill="url(#gradient)"
      />
    </svg>
  `);
}

function createQrFrameSvg(
  width: number,
  height: number,
  radius: number,
): Buffer {
  return Buffer.from(`
    <svg
      width="${width}"
      height="${height}"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="2"
        y="2"
        width="${width - 4}"
        height="${height - 4}"
        rx="${radius}"
        fill="#ffffff"
        stroke="#e2e6eb"
        stroke-width="4"
      />
    </svg>
  `);
}

function formatExpiryDate(
  value: Date,
): string {
  return new Intl.DateTimeFormat(
    "uk-UA",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(value);
}

function getVerificationUrl(
  code: string,
): string {
  const baseUrl =
    process.env
      .PUBLIC_CERTIFICATE_VERIFY_BASE_URL;

  if (!baseUrl) {
    throw new Error(
      "PUBLIC_CERTIFICATE_VERIFY_BASE_URL is not defined",
    );
  }

  return [
    baseUrl.replace(/\/+$/, ""),
    encodeURIComponent(code),
  ].join("/");
}

async function downloadImage(
  url: string,
  assetName: string,
): Promise<Buffer> {
  let response: globalThis.Response;

  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new CertificateImageAssetError(
      `Failed to download ${assetName}`,
    );
  }

  if (!response.ok) {
    throw new CertificateImageAssetError(
      `Failed to download ${assetName}: HTTP ${response.status}`,
    );
  }

  const contentType =
    response.headers.get("content-type") ??
    "";

  if (!contentType.startsWith("image/")) {
    throw new CertificateImageAssetError(
      `${assetName} is not an image`,
    );
  }

  const imageBuffer = Buffer.from(
    await response.arrayBuffer(),
  );

  const maximumSize =
    15 * 1024 * 1024;

  if (imageBuffer.length > maximumSize) {
    throw new CertificateImageAssetError(
      `${assetName} is too large`,
    );
  }

  return imageBuffer;
}

async function prepareCover(
  source: Buffer,
  width: number,
  height: number,
): Promise<Buffer> {
  return sharp(source)
    .rotate()
    .resize(width, height, {
      fit: "cover",
      position: "centre",
    })
    .png()
    .toBuffer();
}

async function prepareLogo(
  source: Buffer,
  width: number,
  height: number,
): Promise<Buffer> {
  return sharp(source)
    .rotate()
    .resize(width, height, {
      fit: "contain",
      background: {
        r: 255,
        g: 255,
        b: 255,
        alpha: 0,
      },
    })
    .png()
    .toBuffer();
}

async function createQrCodeSvg(
  verificationUrl: string,
  width: number,
): Promise<Buffer> {
  const svg = await QRCode.toString(
    verificationUrl,
    {
      type: "svg",
      width,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#111111ff",
        light: "#ffffffff",
      },
    },
  );

  return Buffer.from(svg);
}

async function generatePortraitImage(
  data: CertificateImageData,
): Promise<Buffer> {
  const coverSource = await downloadImage(
    data.coverUrl,
    "portrait cover",
  );

  const coverHeight = 980;
  const qrFrameSize = 540;
  const qrInnerSize = 460;

  const cover = await prepareCover(
    coverSource,
    1080,
    coverHeight,
  );

  const qrCode = await createQrCodeSvg(
    data.verificationUrl,
    qrInnerSize,
  );

  const layers: ImageLayer[] = [
    {
      input: cover,
      left: 0,
      top: 0,
    },

    // Фиксированная подпись над названием сертификата
    {
      input: createTextSvg({
        width: 940,
        height: 72,
        text: "цифровий сертифікат",
        fontSize: 42,
        lineHeight: 48,
        maxCharacters: 40,
        maxLines: 1,
        color: "#ffffff",
        fontWeight: 600,
        align: "center",
        strokeColor: "#111111",
        strokeWidth: 6,
      }),
      left: 70,
      top: 100,
    },

    // Заголовок сверху, по центру, с обводкой
    {
      input: createTextSvg({
        width: 940,
        height: 220,
        text: data.title,
        fontSize: 82,
        lineHeight: 88,
        maxCharacters: 22,
        maxLines: 2,
        color: "#ffffff",
        fontWeight: 700,
        align: "center",
        strokeColor: "#111111",
        strokeWidth: 12,
      }),
      left: 70,
      top: 120,
    },

    // QR-код наполовину заходит на картинку
    {
      input: createQrFrameSvg(
        qrFrameSize,
        qrFrameSize,
        38,
      ),
      left: 270,
      top: 710,
    },
    {
      input: qrCode,
      left: 310,
      top: 750,
    },

    {
      input: createTextSvg({
        width: 900,
        height: 140,
        text:
          data.instructionText ??
          "Покажіть QR-код співробітнику закладу",
        fontSize: 42,
        lineHeight: 50,
        maxCharacters: 42,
        maxLines: 2,
        color: "#3f4754",
        fontWeight: 500,
        align: "center",
      }),
      left: 90,
      top: 1295,
    },
  ];

  const logoUrl = data.logoUrl?.trim();

  if (logoUrl) {
    const logoSource = await downloadImage(
      logoUrl,
      "logo",
    );

    const logo = await prepareLogo(
      logoSource,
      420,
      190,
    );

    layers.push({
      input: logo,
      left: 330,
      top: 1490,
    });
  }

  layers.push({
    input: createTextSvg({
      width: 900,
      height: 80,
      text:
        `Дійсний до ${formatExpiryDate(
          data.expiresAt,
        )}`,
      fontSize: 40,
      lineHeight: 46,
      maxCharacters: 50,
      maxLines: 1,
      color: "#596170",
      fontWeight: 600,
      align: "center",
    }),
    left: 90,
    top: 1760,
  });

  return sharp({
    create: {
      width: 1080,
      height: 1920,
      channels: 4,
      background: "#ffffff",
    },
  })
    .composite(layers)
    .png({
      compressionLevel: 9,
    })
    .toBuffer();
}

async function generateLandscapeImage(
  data: CertificateImageData,
): Promise<Buffer> {
  const coverSource = await downloadImage(
    data.coverUrl,
    "landscape cover",
  );

  const cover = await prepareCover(
    coverSource,
    960,
    1080,
  );

  const qrCode = await createQrCodeSvg(
    data.verificationUrl,
    420,
  );

  const layers: ImageLayer[] = [
    {
      input: cover,
      left: 0,
      top: 0,
    },

    // Фиксированная подпись над QR-кодом
    {
      input: createTextSvg({
        width: 790,
        height: 64,
        text: "цифровий сертифікат",
        fontSize: 36,
        lineHeight: 42,
        maxCharacters: 40,
        maxLines: 1,
        color: "#3f4754",
        fontWeight: 600,
        align: "center",
      }),
      left: 1045,
      top: 45,
    },

    // Название сертификата внизу левой картинки
    {
      input: createTextSvg({
        width: 860,
        height: 190,
        text: data.title,
        fontSize: 68,
        lineHeight: 76,
        maxCharacters: 24,
        maxLines: 2,
        color: "#ffffff",
        fontWeight: 700,
        align: "center",
        strokeColor: "#111111",
        strokeWidth: 10,
      }),
      left: 50,
      top: 820,
    },

    {
      input: createQrFrameSvg(
        500,
        500,
        36,
      ),
      left: 1190,
      top: 120,
    },
    {
      input: qrCode,
      left: 1230,
      top: 160,
    },

    {
      input: createTextSvg({
        width: 790,
        height: 125,
        text:
          data.instructionText ??
          "Покажіть QR-код співробітнику закладу",
        fontSize: 36,
        lineHeight: 44,
        maxCharacters: 46,
        maxLines: 2,
        color: "#3f4754",
        fontWeight: 500,
        align: "center",
      }),
      left: 1045,
      top: 615,
    },
  ];

  const logoUrl = data.logoUrl?.trim();

  if (logoUrl) {
    const logoSource = await downloadImage(
      logoUrl,
      "logo",
    );

    // Увеличенный логотип
    const logo = await prepareLogo(
      logoSource,
      500,
      180,
    );

    layers.push({
      input: logo,
      left: 1210,
      top: 770,
    });
  }

  layers.push({
    input: createTextSvg({
      width: 790,
      height: 78,
      text:
        `Дійсний до ${formatExpiryDate(
          data.expiresAt,
        )}`,
      fontSize: 36,
      lineHeight: 42,
      maxCharacters: 50,
      maxLines: 1,
      color: "#596170",
      fontWeight: 600,
      align: "center",
    }),
    left: 1045,
    top: 952,
  });

  return sharp({
    create: {
      width: 1920,
      height: 1080,
      channels: 4,
      background: "#ffffff",
    },
  })
    .composite(layers)
    .png({
      compressionLevel: 9,
    })
    .toBuffer();
}

export async function generateCertificateImage(
  code: string,
  layout: CertificateImageLayout,
): Promise<Buffer> {
  const certificate =
    await prisma.certificate.findUnique({
      where: {
        code,
      },
      select: {
        code: true,
        title: true,
        expiresAt: true,

        instructionText: true,
        coverPortraitUrl: true,
        coverLandscapeUrl: true,
        logoUrl: true,

        template: {
          select: {
            instructionText: true,
            coverPortraitUrl: true,
            coverLandscapeUrl: true,
            logoUrl: true,
          },
        },
      },
    });

  if (!certificate) {
    throw new CertificateImageNotFoundError();
  }

  /*
   * Fallback на шаблон оставляем для старых
   * тестовых сертификатов, выпущенных до того,
   * как изображения начали сохраняться
   * непосредственно в Certificate.
   */
  const portraitCoverUrl =
    certificate.coverPortraitUrl ??
    certificate.template.coverPortraitUrl;

  const landscapeCoverUrl =
    certificate.coverLandscapeUrl ??
    certificate.template.coverLandscapeUrl;

  const instructionText =
    certificate.instructionText ??
    certificate.template.instructionText;

  const logoUrl =
    certificate.logoUrl ??
    certificate.template.logoUrl;

  const coverUrl =
    layout === "LANDSCAPE"
      ? landscapeCoverUrl
      : portraitCoverUrl;

  if (!coverUrl) {
    throw new CertificateImageAssetError(
      `Certificate has no ${layout.toLowerCase()} cover`,
    );
  }

  const imageData: CertificateImageData = {
    title: certificate.title,
    instructionText,
    expiresAt: certificate.expiresAt,
    coverUrl,
    logoUrl,
    verificationUrl:
      getVerificationUrl(
        certificate.code,
      ),
  };

  if (layout === "LANDSCAPE") {
    return generateLandscapeImage(
      imageData,
    );
  }

  return generatePortraitImage(
    imageData,
  );
}
