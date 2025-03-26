import * as zip from '@zip.js/zip.js';

export interface CompressionOptions {
  level?: number; // Compression level (0-9)
  password?: string; // Password protection
  encryptionStrength?: 1 | 2 | 3; // Encryption strength (1-3)
}

export interface DecompressionOptions {
  password?: string; // Decompression password
}

export interface ZipInfo {
  filename: string;
  size: number;
  compressedSize: number;
  lastModDate: Date;
  encrypted: boolean;
  comment?: string;
}

export interface ZipMetadata {
  files: ZipInfo[];
  totalSize: number;
  totalCompressedSize: number;
  comment?: string;
}

/**
 * Compress files or data
 */
export async function compressData(
  data: Uint8Array | Blob | string | { name: string, data: Uint8Array | Blob | string }[],
  options: CompressionOptions = {}
): Promise<Uint8Array> {
  const zipWriter = new zip.ZipWriter(new zip.Uint8ArrayWriter(), {
    level: options.level || 5,
    password: options.password,
    encryptionStrength: options.encryptionStrength
  });

  try {
    if (Array.isArray(data)) {
      // Handle multiple file compression
      for (const item of data) {
        let fileData: Uint8Array | Blob | string = item.data;
        
        // Convert string to Uint8Array
        if (typeof fileData === 'string') {
          const encoder = new TextEncoder();
          fileData = encoder.encode(fileData);
        }
        
        await zipWriter.add(item.name, 
          typeof fileData === 'string' 
            ? new zip.TextReader(fileData)
            : fileData instanceof Blob 
              ? new zip.BlobReader(fileData) 
              : new zip.Uint8ArrayReader(fileData)
        );
      }
    } else {
      // Handle single file compression
      let fileData = data;
      
      // Convert string to Uint8Array
      if (typeof fileData === 'string') {
        const encoder = new TextEncoder();
        fileData = encoder.encode(fileData);
      }
      
      await zipWriter.add('file', 
        typeof fileData === 'string' 
          ? new zip.TextReader(fileData)
          : fileData instanceof Blob 
            ? new zip.BlobReader(fileData) 
            : new zip.Uint8ArrayReader(fileData)
      );
    }

    return await zipWriter.close();
  } catch (error: any) {
    throw new Error(`Compression failed: ${error.message}`);
  }
}

/**
 * Decompress data
 */
export async function decompressData(
  data: Uint8Array | Blob,
  options: DecompressionOptions = {}
): Promise<{ name: string, data: Uint8Array }[]> {
  try {
    const reader = data instanceof Blob ? new zip.BlobReader(data) : new zip.Uint8ArrayReader(data);
    const zipReader = new zip.ZipReader(reader, { password: options.password });
    
    const entries = await zipReader.getEntries();
    const results: { name: string, data: Uint8Array }[] = [];
    
    for (const entry of entries) {
      if (!entry.directory && typeof entry.getData === 'function') {
        const writer = new zip.Uint8ArrayWriter();
        const data = await entry.getData(writer);
        results.push({
          name: entry.filename,
          data
        });
      }
    }
    
    await zipReader.close();
    return results;
  } catch (error: any) {
    throw new Error(`Decompression failed: ${error.message}`);
  }
}

/**
 * Get zip file information
 */
export async function getZipInfo(
  data: Uint8Array | Blob,
  options: DecompressionOptions = {}
): Promise<ZipMetadata> {
  try {
    const reader = data instanceof Blob ? new zip.BlobReader(data) : new zip.Uint8ArrayReader(data);
    const zipReader = new zip.ZipReader(reader, { password: options.password });
    
    const entries = await zipReader.getEntries();
    const files: ZipInfo[] = [];
    let totalSize = 0;
    let totalCompressedSize = 0;
    
    for (const entry of entries) {
      if (!entry.directory) {
        files.push({
          filename: entry.filename,
          size: entry.uncompressedSize,
          compressedSize: entry.compressedSize,
          lastModDate: new Date(entry.lastModDate),
          encrypted: entry.encrypted,
          comment: entry.comment
        });
        
        totalSize += entry.uncompressedSize;
        totalCompressedSize += entry.compressedSize;
      }
    }
    
    const metadata: ZipMetadata = {
      files,
      totalSize,
      totalCompressedSize,
      comment: zipReader.comment ? new TextDecoder().decode(zipReader.comment) : undefined
    };
    
    await zipReader.close();
    return metadata;
  } catch (error: any) {
    throw new Error(`Failed to get zip file information: ${error.message}`);
  }
}
