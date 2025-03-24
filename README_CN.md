# ZIP MCP Server

中文 | [English](README.md)

## 项目简介

ZIP MCP Server 是一个基于 fastMCP 和 zip.js 的压缩服务器，实现了 Model Context Protocol (MCP) 协议。本项目提供了全参数可控的 ZIP 压缩、解压缩和查询压缩包信息功能。

## 功能特点

- 支持文件和数据的压缩与解压缩
- 支持多文件打包压缩
- 提供压缩级别控制 (0-9)
- 支持密码保护和加密强度设置
- 提供压缩包元数据查询功能

## 项目结构

```
zip-mcp
├── src
│   ├── index.ts               # 应用程序入口点
│   ├── utils
│   │   └── compression.ts     # 压缩和解压缩功能实现
├── tsconfig.json              # TypeScript配置文件
├── package.json               # npm配置文件
└── README.md                  # 项目文档
```

## 安装与使用

1. 克隆项目：

   ```bash
   git clone <repository-url>
   cd zip-mcp
   ```

2. 安装依赖：

   ```bash
   npm install
   ```

3. 生成 MCP JSON：

    ```bash
    npm run json
    ```

    ```JSON
    {
      "mcpServers": {
        "zip-mcp": {
          "command": "npx",
          "args": [
            "tsx",
            "<ABSOLUTE PATH>src/index.ts"
          ]
        }
      }
    }
    ```

4. 将 MCP JSON 配置到 AI Client 中

- Claude Client https://modelcontextprotocol.io/quickstart/user
- Raycast 需要安装 MCP 插件

## MCP 工具说明

ZIP MCP Server 提供了以下工具，可通过 MCP 协议调用：

### 压缩工具 (compress)

将本地文件或目录压缩为 ZIP 文件。

**参数:**

- `input`: 要压缩的文件或目录路径（字符串或字符串数组）
- `output`: 输出 ZIP 文件的路径
- `options`: 压缩选项（可选）
  - `level`: 压缩级别 (0-9，默认为 5)
  - `password`: 密码保护
  - `encryptionStrength`: 加密强度 (1-3)
  - `overwrite`: 是否覆盖现有文件 (布尔值)

**返回:**

- 成功: 包含成功信息的文本内容
- 失败: 包含错误信息的文本内容

### 解压工具 (decompress)

解压本地 ZIP 文件到指定目录。

**参数:**

- `input`: ZIP 文件路径
- `output`: 输出目录路径
- `options`: 解压选项（可选）
  - `password`: 解压密码
  - `overwrite`: 是否覆盖现有文件 (布尔值)
  - `createDirectories`: 是否创建不存在的目录 (布尔值)

**返回:**

- 成功: 包含解压结果信息的文本内容
- 失败: 包含错误信息的文本内容

### ZIP 信息工具 (getZipInfo)

获取本地 ZIP 文件的元数据信息。

**参数:**

- `input`: ZIP 文件路径
- `options`: 选项（可选）
  - `password`: 解压密码

**返回:**

- 成功: 包含 ZIP 文件详细信息的文本内容，包括：
  - 总文件数
  - 总大小
  - 压缩后大小
  - 压缩率
  - 每个文件的详细信息
- 失败: 包含错误信息的文本内容

### 测试工具 (echo)

返回输入的消息，用于测试服务是否正常运行。

**参数:**

- `message`: 要返回的消息

**返回:**

- 包含输入消息和当前时间戳的文本内容

## 示例

使用 MCP 客户端调用工具示例：

```javascript
// 压缩文件
await client.executeTool("compress", {
  input: "/path/to/files/or/directory",
  output: "/path/to/output.zip",
  options: {
    level: 9,
    comment: "测试压缩",
    password: "secret",
    overwrite: true,
  },
});

// 解压文件
await client.executeTool("decompress", {
  input: "/path/to/archive.zip",
  output: "/path/to/extract/directory",
  options: {
    password: "secret",
    overwrite: true,
    createDirectories: true,
  },
});

// 获取ZIP信息
await client.executeTool("getZipInfo", {
  input: "/path/to/archive.zip",
  options: {
    password: "secret",
  },
});

// 测试服务
await client.executeTool("echo", {
  message: "Hello, ZIP MCP Server!",
});
```

## 联系方式

- 邮箱: [gz7gugu@qq.com](mailto:gz7gugu@qq.com)
- 播客: [https://7gugu.com](https://7gugu.com)
