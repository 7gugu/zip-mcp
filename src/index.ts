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

// Create FastMCP server instance
const server = new FastMCP({
  name: "ZIP MCP Server",
  version: "1.0.0",
});

// General error handling function
const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === "string") {
    return error;
  } else {
    return "Unknown error";
  }
};

// Check if file or directory exists
const exists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

// Get file list (including subdirectories)
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
      // Store relative path
      fileList.push(path.relative(basePath, filePath));
    }
  }

  return fileList;
};

// Compression tool - Compress local files
server.addTool({
  name: "compress",
  description: "Compress local files or directories into a ZIP file",
  parameters: z.object({
    input: z.union([
      z.string(), // Single file or directory path
      z.array(z.string()), // Multiple file or directory paths
    ]),
    output: z.string(), // Output ZIP file path
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
      // Separate CompressionOptions and other options
      const { overwrite, ...compressionOptions } = args.options || {};
      const shouldOverwrite = overwrite ?? false;

      // Check if output path already exists
      if ((await exists(outputPath)) && !shouldOverwrite) {
        throw new Error(
          `Output file ${outputPath} already exists. Set overwrite: true to overwrite.`
        );
      }

      // Create output directory (if it doesn't exist)
      const outputDir = path.dirname(outputPath);
      if (!(await exists(outputDir))) {
        await fs.mkdir(outputDir, { recursive: true });
      }

      // Prepare input files
      const inputPaths = Array.isArray(args.input) ? args.input : [args.input];
      const filesToCompress: { name: string; data: Uint8Array }[] = [];

      // Process each input path
      for (const inputPath of inputPaths) {
        if (!(await exists(inputPath))) {
          throw new Error(`Input path not found: ${inputPath}`);
        }

        const stats = await fs.stat(inputPath);

        if (stats.isDirectory()) {
          // Process directory
          const baseDir = path.basename(inputPath);
          const files = await getAllFiles(inputPath);

          for (const relPath of files) {
            const fullPath = path.join(inputPath, relPath);
            const data = await fs.readFile(fullPath);
            // Maintain relative path structure
            filesToCompress.push({
              name: path.join(baseDir, relPath),
              data: new Uint8Array(data),
            });
          }
        } else {
          // Process single file
          const data = await fs.readFile(inputPath);
          filesToCompress.push({
            name: path.basename(inputPath),
            data: new Uint8Array(data),
          });
        }
      }

      if(compressionOptions?.level && compressionOptions.level > 9) {
        compressionOptions.level = 9;
      }

      if(compressionOptions?.level && compressionOptions.level < 0) {
        compressionOptions.level = 0;
      }

      // Execute compression
      const result = await compressData(filesToCompress, compressionOptions);

      // Write result to file
      await fs.writeFile(outputPath, result);

      return {
        content: [
          {
            type: "text",
            text: `Compression completed. Created ${outputPath} file containing ${filesToCompress.length} files.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Compression failed: ${formatError(error)}` }],
      };
    }
  },
});

// Decompression tool - Decompress local ZIP file
server.addTool({
  name: "decompress",
  description: "Decompress local ZIP file to specified directory",
  parameters: z.object({
    input: z.string(), // ZIP file path
    output: z.string(), // Output directory path
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

      // Check if input file exists
      if (!(await exists(inputPath))) {
        throw new Error(`Input file not found: ${inputPath}`);
      }

      // Check output directory
      if (await exists(outputPath)) {
        const stats = await fs.stat(outputPath);
        if (!stats.isDirectory()) {
          throw new Error(`Output path is not a directory: ${outputPath}`);
        }
      } else {
        if (createDirectories) {
          await fs.mkdir(outputPath, { recursive: true });
        } else {
          throw new Error(`Output directory does not exist: ${outputPath}`);
        }
      }

      // Read ZIP file
      const zipData = await fs.readFile(inputPath);

      // Decompress file
      const result = await decompressData(new Uint8Array(zipData), options);

      // Extract files to output directory
      const extractedFiles: string[] = [];
      for (const file of result) {
        const outputFilePath = path.join(outputPath, file.name);
        const outputFileDir = path.dirname(outputFilePath);

        // Create directory (if needed)
        if (!(await exists(outputFileDir))) {
          await fs.mkdir(outputFileDir, { recursive: true });
        }

        // Check if file already exists
        if ((await exists(outputFilePath)) && !overwrite) {
          console.warn(`Skipping existing file: ${outputFilePath}`);
          continue;
        }

        // Write file
        await fs.writeFile(outputFilePath, file.data);
        extractedFiles.push(file.name);
      }

      return {
        content: [
          {
            type: "text",
            text: `Decompression completed. Extracted ${extractedFiles.length} files to ${outputPath}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Decompression failed: ${formatError(error)}` }],
      };
    }
  },
});

// Get ZIP info tool - Get local ZIP file information
server.addTool({
  name: "getZipInfo",
  description: "Get metadata information of a local ZIP file",
  parameters: z.object({
    input: z.string(), // ZIP file path
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

      // Check if input file exists
      if (!(await exists(inputPath))) {
        throw new Error(`Input file not found: ${inputPath}`);
      }

      // Read ZIP file
      const zipData = await fs.readFile(inputPath);

      // Get ZIP information
      const metadata = await getZipInfo(new Uint8Array(zipData), options);

      const compressionRatio =
        metadata.totalSize > 0
          ? (
              (1 - metadata.totalCompressedSize / metadata.totalSize) *
              100
            ).toFixed(2) + "%"
          : "0%";

      // File size formatting
      const formatSize = (size: number): string => {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
        if (size < 1024 * 1024 * 1024)
          return `${(size / (1024 * 1024)).toFixed(2)} MB`;
        return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
      };

      // Build file information text
      const filesInfo = metadata.files
        .map(
          (file) =>
            `- ${file.filename}: Original size=${formatSize(
              file.size
            )}, Compressed=${formatSize(file.compressedSize)}, Modified date=${new Date(
              file.lastModDate
            ).toLocaleString()}, Encrypted=${file.encrypted ? "Yes" : "No"}`
        )
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: `ZIP file "${path.basename(inputPath)}" information overview:`,
          },
          { type: "text", text: `Total files: ${metadata.files.length}` },
          { type: "text", text: `Total size: ${formatSize(metadata.totalSize)}` },
          {
            type: "text",
            text: `Compressed size: ${formatSize(metadata.totalCompressedSize)}`,
          },
          { type: "text", text: `Compression ratio: ${compressionRatio}` },
          {
            type: "text",
            text: metadata.comment ? `Comment: ${metadata.comment}` : "",
          },
          { type: "text", text: `\nFile details:\n${filesInfo}` },
        ],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Failed to get ZIP information: ${formatError(error)}` },
        ],
      };
    }
  },
});

// Test tool - Simple echo function to test if the service is running properly
server.addTool({
  name: "echo",
  description: "Return the input message (for testing)",
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

// Start server
server.start({
  transportType: "stdio",
});

console.log("ZIP MCP Server started");
