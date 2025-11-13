// Site configuration
export const SITE_NAME = "Office FIle Management";
export const SITE_DESCRIPTION =
  "Secure file delivery with military-grade encryption, time-limited access, and download limits in a particular Organization or Office. Transport your files securely with no questions asked.";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

// Theme colors - updated to match The Transporter movie poster
export const THEME_COLORS = {
  primary: "#006AFF", // Blue from The Transporter logo
  secondary: "#000000", // Black
  accent: "#FFD700", // Gold accent
};

// Standard terminology with professional tone
export const TERMS = {
  upload: "Upload",
  download: "Download",
  share: "Share",
  transport: "Share",
  file: "File",
  link: "Link",
  expires: "Expires",
  views: "Downloads",
};

// SEO Keywords
export const SEO_KEYWORDS = {
  home: "secure file sharing, encrypted file transfer, time-limited file sharing, secure file delivery, private file sharing, temporary file links",
  upload:
    "upload files securely, secure file upload, encrypted file upload, private file sharing, secure file transfer",
  share:
    "secure file sharing, private file sharing, temporary file links, secure download links, time-limited file access",
  dashboard:
    "file management, secure file dashboard, manage shared files, file sharing analytics, download tracking",
};

// Structured Data Templates
export const STRUCTURED_DATA = {
  organization: {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo.png`,
    description: SITE_DESCRIPTION,
    sameAs: [
      "https://twitter.com/thetransporter",
      "https://facebook.com/thetransporter",
    ],
  },

  softwareApplication: {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "WebApplication",
    operatingSystem: "All",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  },
};
