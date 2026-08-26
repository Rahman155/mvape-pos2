/**
 * Logo Upload Utilities
 * Handles file validation, upload, and logo retrieval for stores
 */

/**
 * Supported image file formats for logo
 */
export const SUPPORTED_LOGO_FORMATS = ['image/png', 'image/jpeg', 'image/jpg'];
export const SUPPORTED_LOGO_EXTENSIONS = ['.png', '.jpg', '.jpeg'];

/**
 * Maximum file size for logo in bytes (5MB)
 */
export const MAX_LOGO_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Validation result for logo upload
 */
export interface LogoValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Logo upload response from API
 */
export interface LogoUploadResponse {
  logoUrl: string;
  storeId: string;
  uploadedAt: string;
}

/**
 * Validate logo file format
 * Checks if the file has a supported MIME type and extension
 *
 * @param file - The file to validate
 * @returns Validation error message if invalid, undefined if valid
 */
export function validateLogoFormat(file: File): string | undefined {
  // Check MIME type
  if (!SUPPORTED_LOGO_FORMATS.includes(file.type)) {
    return `File format not supported. Supported formats: PNG, JPG`;
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = SUPPORTED_LOGO_EXTENSIONS.some((ext) =>
    fileName.endsWith(ext)
  );

  if (!hasValidExtension) {
    return `File extension not supported. Supported extensions: ${SUPPORTED_LOGO_EXTENSIONS.join(
      ', '
    )}`;
  }

  return undefined;
}

/**
 * Validate logo file size
 * Checks if the file size does not exceed the maximum allowed size
 *
 * @param file - The file to validate
 * @returns Validation error message if invalid, undefined if valid
 */
export function validateLogoFileSize(file: File): string | undefined {
  if (file.size > MAX_LOGO_FILE_SIZE) {
    const maxSizeMB = MAX_LOGO_FILE_SIZE / (1024 * 1024);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return `File size (${fileSizeMB}MB) exceeds maximum allowed size of ${maxSizeMB}MB`;
  }

  return undefined;
}

/**
 * Validate logo file
 * Performs all validation checks on the logo file
 *
 * @param file - The file to validate
 * @returns Validation result with any errors found
 */
export function validateLogoFile(file: File): LogoValidationResult {
  const errors: string[] = [];

  // Validate format
  const formatError = validateLogoFormat(file);
  if (formatError) {
    errors.push(formatError);
  }

  // Validate file size
  const sizeError = validateLogoFileSize(file);
  if (sizeError) {
    errors.push(sizeError);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create FormData for logo upload
 *
 * @param file - The logo file to upload
 * @returns FormData object ready for API submission
 */
export function createLogoFormData(file: File): FormData {
  const formData = new FormData();
  formData.append('logo', file);
  return formData;
}

/**
 * Get logo preview URL
 * Creates a local preview URL for the logo before upload
 *
 * @param file - The logo file
 * @returns Object URL string that can be used as img src
 */
export function getLogoPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Clean up logo preview URL
 * Releases the object URL to free up memory
 *
 * @param previewUrl - The preview URL to clean up
 */
export function releaseLogoPreviewUrl(previewUrl: string): void {
  URL.revokeObjectURL(previewUrl);
}

/**
 * Format file size for display
 *
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Extract file name without extension
 *
 * @param fileName - The file name to process
 * @returns File name without extension
 */
export function getFileNameWithoutExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return fileName;
  }
  return fileName.substring(0, lastDotIndex);
}

/**
 * Get file extension
 *
 * @param fileName - The file name to process
 * @returns File extension with dot (e.g., '.png')
 */
export function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return '';
  }
  return fileName.substring(lastDotIndex).toLowerCase();
}

/**
 * Validate and prepare logo for upload
 * Combines validation and FormData creation
 *
 * @param file - The logo file to process
 * @returns Object containing validation result and FormData if valid
 */
export function prepareLogoForUpload(
  file: File
): {
  valid: boolean;
  errors: string[];
  formData?: FormData;
} {
  const validation = validateLogoFile(file);

  if (!validation.valid) {
    return {
      valid: false,
      errors: validation.errors,
    };
  }

  const formData = createLogoFormData(file);

  return {
    valid: true,
    errors: [],
    formData,
  };
}

/**
 * Check if a URL is a valid logo URL
 * Performs basic validation of logo URL format
 *
 * @param url - The URL to validate
 * @returns true if URL appears to be valid, false otherwise
 */
export function isValidLogoUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }

  try {
    // Try to create a URL object to validate format
    new URL(url, window.location.origin);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get logo display properties
 * Returns optimized dimensions and styles for displaying logo
 *
 * @param logoUrl - The logo URL
 * @param options - Display options
 * @returns Object with display properties
 */
export function getLogoDisplayProperties(
  logoUrl: string,
  options?: {
    maxWidth?: number;
    maxHeight?: number;
    containerWidth?: number;
  }
) {
  const maxWidth = options?.maxWidth || 200;
  const maxHeight = options?.maxHeight || 100;
  const containerWidth = options?.containerWidth || 300;

  return {
    url: logoUrl,
    maxWidth: `${maxWidth}px`,
    maxHeight: `${maxHeight}px`,
    width: '100%',
    height: 'auto',
    objectFit: 'contain' as const,
    containerStyle: {
      width: `${containerWidth}px`,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
  };
}
