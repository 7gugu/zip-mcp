const fs = require('fs');
const path = require('path');

const config = {
  mcpServers: {
    "zip-mcp": {
      "command": "npx",
      "args": [
        "tsx",
        path.resolve(__dirname, 'src/index.ts')
      ]
    }
  }
};

const configJson = JSON.stringify(config, null, 2);

console.log('MCP 配置内容:');
console.log(configJson);