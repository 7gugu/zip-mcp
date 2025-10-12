declare module 'fastmcp' {
  import { z } from 'zod';

  export interface FastMCPOptions {
    name: string;
    version: string;
  }

  export interface ToolResult {
    content: Array<{
      type: string;
      text: string;
    }>;
  }

  export interface ToolExecuteFunction {
    (args: any): Promise<ToolResult>;
  }

  export interface Tool {
    name: string;
    description: string;
    parameters: z.ZodSchema;
    execute: ToolExecuteFunction;
  }

  export class FastMCP {
    constructor(options: FastMCPOptions);
    addTool(tool: Tool): void;
    start(options: { transportType: string }): void;
  }
}
