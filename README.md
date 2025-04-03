# ZIP MCP Server

[中文](README_CN.md) | English

## Project Introduction

ZIP MCP Server is a compression server based on fastMCP and zip.js, implementing the Model Context Protocol (MCP). This project provides fully parameter-controlled ZIP compression, decompression, and query compression package information functions.

## Features

- Supports compression and decompression of files and data
- Supports multi-file packaging compression
- Provides compression level control (0-9)
- Supports password protection and encryption strength settings
- Provides query function for compressed package metadata

## Project Structure

```bash
zip-mcp
├── src
│   ├── index.ts               # Application entry point
│   ├── utils
│   │   └── compression.ts     # Compression and decompression implementation
├── tsconfig.json              # TypeScript configuration file
├── package.json               # npm configuration file
└── README.md                  # Project documentation
```

## Installation

You can install ZIP MCP Server globally using npm:

```bash
npm install -g zip-mcp
```

## MCP Configuration

After installation, you can configure ZIP MCP in your MCP JSON configuration:

```json
{
  "mcpServers": {
    "zip-mcp": {
      "command": "zip-mcp"
    }
  }
}
```

## Configure the MCP JSON in the AI Client

- Claude Client: [https://modelcontextprotocol.io/quickstart/user](https://modelcontextprotocol.io/quickstart/user)
- Raycast: requires installing the MCP plugin
- Cursor: [https://docs.cursor.com/context/model-context-protocol#configuring-mcp-servers](https://docs.cursor.com/context/model-context-protocol#configuring-mcp-servers)

## MCP Tool Description

ZIP MCP Server provides the following tools, which can be called through the MCP protocol:

### Compression Tool (compress)

Compress local files or directories into a ZIP file.

**Parameters:**

- `input`: Path of the file or directory to be compressed (string or string array)
- `output`: Path of the output ZIP file
- `options`: Compression options (optional)
  - `level`: Compression level (0-9, default is 5)
  - `password`: Password protection
  - `encryptionStrength`: Encryption strength (1-3)
  - `overwrite`: Whether to overwrite existing files (boolean)

**Returns:**

- Success: Text content containing success information
- Failure: Text content containing error information

### Decompression Tool (decompress)

Decompress local ZIP files to the specified directory.

**Parameters:**

- `input`: Path of the ZIP file
- `output`: Path of the output directory
- `options`: Decompression options (optional)
  - `password`: Decompression password
  - `overwrite`: Whether to overwrite existing files (boolean)
  - `createDirectories`: Whether to create non-existent directories (boolean)

**Returns:**

- Success: Text content containing decompression result information
- Failure: Text content containing error information

### ZIP Info Tool (getZipInfo)

Get metadata information of local ZIP files.

**Parameters:**

- `input`: Path of the ZIP file
- `options`: Options (optional)
  - `password`: Decompression password

**Returns:**

- Success: Text content containing detailed information of the ZIP file, including:
  - Total number of files
  - Total size
  - Compressed size
  - Compression ratio
  - Detailed information of each file
- Failure: Text content containing error information

### Test Tool (echo)

Returns the input message to test if the service is running normally.

**Parameters:**

- `message`: Message to be returned

**Returns:**

- Text content containing the input message and current timestamp

## Examples

Examples of calling tools using the MCP client:

```javascript
// Compress files
await client.executeTool("compress", {
  input: "/path/to/files/or/directory",
  output: "/path/to/output.zip",
  options: {
    level: 9,
    comment: "Test compression",
    password: "secret",
    overwrite: true,
  },
});

// Decompress files
await client.executeTool("decompress", {
  input: "/path/to/archive.zip",
  output: "/path/to/extract/directory",
  options: {
    password: "secret",
    overwrite: true,
    createDirectories: true,
  },
});

// Get ZIP info
await client.executeTool("getZipInfo", {
  input: "/path/to/archive.zip",
  options: {
    password: "secret",
  },
});

// Test service
await client.executeTool("echo", {
  message: "Hello, ZIP MCP Server!",
});
```

## Contact

- Email: [gz7gugu@qq.com](mailto:gz7gugu@qq.com)
- Blog: [https://7gugu.com](https://7gugu.com)
