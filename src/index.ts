import { FastMCP } from "fastmcp";
import { z } from "zod";
import {
  compressData,
  decompressData,
  getZipInfo,
  DecompressionOptions,
} from "./utils/compression";
import * as fs from "fs/promises";
import * as path from "path";

// 创建 FastMCP 服务器实例
const server = new FastMCP({
  name: "ZIP MCP Server",
  version: "1.0.0",
});

// 通用错误处理函数
const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === "string") {
    return error;
  } else {
    return "未知错误";
  }
};

// 检查文件或目录是否存在
const exists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

// 获取文件列表(包含子目录)
const getAllFiles = async (
  dirPath: string,
  fileList: string[] = [],
  basePath: string = dirPath
): Promise<string[]> => {
  const files = await fs.readdir(dirPath);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = await fs.stat(filePath);

    if (stat.isDirectory()) {
      fileList = await getAllFiles(filePath, fileList, basePath);
    } else {
      // 存储相对路径
      fileList.push(path.relative(basePath, filePath));
    }
  }

  return fileList;
};

// 压缩工具 - 压缩本地文件
server.addTool({
  name: "compress",
  description: "将本地文件或目录压缩为ZIP文件",
  parameters: z.object({
    input: z.union([
      z.string(), // 单个文件或目录路径
      z.array(z.string()), // 多个文件或目录路径
    ]),
    output: z.string(), // 输出ZIP文件路径
    options: z
      .object({
      level: z.number().min(0).max(9).optional(),
      comment: z.string().optional(),
      password: z.string().optional(),
      encryptionStrength: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
      overwrite: z.boolean().optional(),
      })
      .optional(),
    }),
    execute: async (args) => {
    try {
      const outputPath = args.output;
      // 分离 CompressionOptions 和其他选项
      const { overwrite, ...compressionOptions } = args.options || {};
      const shouldOverwrite = overwrite ?? false;

      // 检查输出路径是否已存在
      if ((await exists(outputPath)) && !shouldOverwrite) {
        throw new Error(
          `输出文件 ${outputPath} 已存在。设置 overwrite: true 以覆盖。`
        );
      }

      // 创建输出目录（如果不存在）
      const outputDir = path.dirname(outputPath);
      if (!(await exists(outputDir))) {
        await fs.mkdir(outputDir, { recursive: true });
      }

      // 准备输入文件
      const inputPaths = Array.isArray(args.input) ? args.input : [args.input];
      const filesToCompress: { name: string; data: Uint8Array }[] = [];

      // 处理每个输入路径
      for (const inputPath of inputPaths) {
        if (!(await exists(inputPath))) {
          throw new Error(`找不到输入路径: ${inputPath}`);
        }

        const stats = await fs.stat(inputPath);

        if (stats.isDirectory()) {
          // 处理目录
          const baseDir = path.basename(inputPath);
          const files = await getAllFiles(inputPath);

          for (const relPath of files) {
            const fullPath = path.join(inputPath, relPath);
            const data = await fs.readFile(fullPath);
            // 保持相对路径结构
            filesToCompress.push({
              name: path.join(baseDir, relPath),
              data: new Uint8Array(data),
            });
          }
        } else {
          // 处理单个文件
          const data = await fs.readFile(inputPath);
          filesToCompress.push({
            name: path.basename(inputPath),
            data: new Uint8Array(data),
          });
        }
      }

      if(compressionOptions?.level && compressionOptions.level > 3) {
        compressionOptions.level = 3;
      }

      // 执行压缩
      const result = await compressData(filesToCompress, compressionOptions);

      // 将结果写入文件
      await fs.writeFile(outputPath, result);

      return {
        content: [
          {
            type: "text",
            text: `压缩完成。已创建 ${outputPath} 文件，包含 ${filesToCompress.length} 个文件。`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `压缩失败: ${formatError(error)}` }],
      };
    }
  },
});

// 解压工具 - 解压本地ZIP文件
server.addTool({
  name: "decompress",
  description: "解压本地ZIP文件到指定目录",
  parameters: z.object({
    input: z.string(), // ZIP文件路径
    output: z.string(), // 输出目录路径
    options: z
      .object({
        password: z.string().optional(),
        overwrite: z.boolean().optional(),
        createDirectories: z.boolean().optional(),
      })
      .optional(),
  }),
  execute: async (args) => {
    try {
      const inputPath = args.input;
      const outputPath = args.output;
      const options: DecompressionOptions & {
        overwrite?: boolean;
        createDirectories?: boolean;
      } = args.options || {};
      const overwrite = options.overwrite ?? false;
      const createDirectories = options.createDirectories ?? true;

      // 检查输入文件是否存在
      if (!(await exists(inputPath))) {
        throw new Error(`找不到输入文件: ${inputPath}`);
      }

      // 检查输出目录
      if (await exists(outputPath)) {
        const stats = await fs.stat(outputPath);
        if (!stats.isDirectory()) {
          throw new Error(`输出路径不是目录: ${outputPath}`);
        }
      } else {
        if (createDirectories) {
          await fs.mkdir(outputPath, { recursive: true });
        } else {
          throw new Error(`输出目录不存在: ${outputPath}`);
        }
      }

      // 读取ZIP文件
      const zipData = await fs.readFile(inputPath);

      // 解压文件
      const result = await decompressData(new Uint8Array(zipData), options);

      // 解析文件到输出目录
      const extractedFiles: string[] = [];
      for (const file of result) {
        const outputFilePath = path.join(outputPath, file.name);
        const outputFileDir = path.dirname(outputFilePath);

        // 创建目录（如果需要）
        if (!(await exists(outputFileDir))) {
          await fs.mkdir(outputFileDir, { recursive: true });
        }

        // 检查文件是否已存在
        if ((await exists(outputFilePath)) && !overwrite) {
          console.warn(`跳过已存在的文件: ${outputFilePath}`);
          continue;
        }

        // 写入文件
        await fs.writeFile(outputFilePath, file.data);
        extractedFiles.push(file.name);
      }

      return {
        content: [
          {
            type: "text",
            text: `解压完成。已将 ${extractedFiles.length} 个文件解压到 ${outputPath}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `解压失败: ${formatError(error)}` }],
      };
    }
  },
});

// 获取 ZIP 信息工具 - 获取本地ZIP文件信息
server.addTool({
  name: "getZipInfo",
  description: "获取本地ZIP文件的元数据信息",
  parameters: z.object({
    input: z.string(), // ZIP文件路径
    options: z
      .object({
        password: z.string().optional(),
      })
      .optional(),
  }),
  execute: async (args) => {
    try {
      const inputPath = args.input;
      const options: DecompressionOptions = args.options || {};

      // 检查输入文件是否存在
      if (!(await exists(inputPath))) {
        throw new Error(`找不到输入文件: ${inputPath}`);
      }

      // 读取ZIP文件
      const zipData = await fs.readFile(inputPath);

      // 获取ZIP信息
      const metadata = await getZipInfo(new Uint8Array(zipData), options);

      const compressionRatio =
        metadata.totalSize > 0
          ? (
              (1 - metadata.totalCompressedSize / metadata.totalSize) *
              100
            ).toFixed(2) + "%"
          : "0%";

      // 文件大小格式化
      const formatSize = (size: number): string => {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
        if (size < 1024 * 1024 * 1024)
          return `${(size / (1024 * 1024)).toFixed(2)} MB`;
        return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
      };

      // 构建文件信息文本
      const filesInfo = metadata.files
        .map(
          (file) =>
            `- ${file.filename}: 原始大小=${formatSize(
              file.size
            )}, 压缩后=${formatSize(file.compressedSize)}, 修改日期=${new Date(
              file.lastModDate
            ).toLocaleString()}, 加密=${file.encrypted ? "是" : "否"}`
        )
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: `ZIP文件 "${path.basename(inputPath)}" 信息概览：`,
          },
          { type: "text", text: `总文件数: ${metadata.files.length}` },
          { type: "text", text: `总大小: ${formatSize(metadata.totalSize)}` },
          {
            type: "text",
            text: `压缩后大小: ${formatSize(metadata.totalCompressedSize)}`,
          },
          { type: "text", text: `压缩率: ${compressionRatio}` },
          {
            type: "text",
            text: metadata.comment ? `注释: ${metadata.comment}` : "",
          },
          { type: "text", text: `\n文件详情:\n${filesInfo}` },
        ],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `获取ZIP信息失败: ${formatError(error)}` },
        ],
      };
    }
  },
});

// 测试工具 - 简单的 echo 功能，用于测试服务是否正常运行
server.addTool({
  name: "echo",
  description: "返回输入的消息 (用于测试)",
  parameters: z.object({
    message: z.string(),
  }),
  execute: async (args) => {
    return {
      content: [
        { type: "text", text: args.message },
        { type: "text", text: new Date().toISOString() },
      ],
    };
  },
});

// 启动服务器
server.start({
  transportType: "stdio",
});

console.log("ZIP MCP Server 已启动");
