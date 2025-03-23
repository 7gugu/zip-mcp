import * as zip from '@zip.js/zip.js';

export interface CompressionOptions {
  level?: number; // 压缩级别 (0-9)
  password?: string; // 密码保护
  encryptionStrength?: 1 | 2 | 3; // 加密强度 (1-3)
}

export interface DecompressionOptions {
  password?: string; // 解压密码
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
 * 压缩文件或数据
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
      // 处理多文件压缩
      for (const item of data) {
        let fileData: Uint8Array | Blob | string = item.data;
        
        // 转换字符串为 Uint8Array
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
      // 处理单文件压缩
      let fileData = data;
      
      // 转换字符串为 Uint8Array
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
    throw new Error(`压缩失败: ${error.message}`);
  }
}

/**
 * 解压缩数据
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
    throw new Error(`解压失败: ${error.message}`);
  }
}

/**
 * 获取压缩包信息
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
    throw new Error(`获取压缩包信息失败: ${error.message}`);
  }
}