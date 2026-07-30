# ZIP MCP Server

[中文](README_CN.md) | English

## Introducción del Proyecto

<a href="https://glama.ai/mcp/servers/@7gugu/zip-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@7gugu/zip-mcp/badge" />
</a>

ZIP MCP Server es un servidor de compresión basado en fastMCP y zip.js, que implementa el Model Context Protocol (MCP). Este proyecto proporciona funciones de compresión ZIP totalmente controladas por parámetros, descompresión y consulta de información de paquetes comprimidos.

## Características

- Soporta compresión y descompresión de archivos y datos
- Soporta compresión de empaquetado de múltiples archivos
- Proporciona control del nivel de compresión (0-9)
- Soporta protección por contraseña y configuración de fuerza de cifrado
- Proporciona función de consulta para metadatos de paquetes comprimidos
- Valida las rutas de las entradas ZIP al descomprimir para evitar escrituras de salto de ruta (path traversal)

## Seguridad

Las versiones **1.0.6** y posteriores corrigen un problema de escritura de archivos arbitrarios en la herramienta `decompress`: anteriormente, nombres de entradas ZIP maliciosos (por ejemplo `../outside.txt`) podían unirse al directorio de salida y escribirse fuera de la raíz de extracción prevista. Ahora, la extracción resuelve la raíz de salida una sola vez, valida cada ruta de entrada y rechaza rutas absolutas, rutas con letras de unidad, segmentos `..` y cualquier ruta que escape del directorio de salida.

Gracias a **Ryan** ([vonbrubeck@gmail.com](mailto:vonbrubeck@gmail.com)) por reportar este problema de manera responsable.

## Estructura del Proyecto

```bash
zip-mcp
├── src
│   ├── index.ts               # Punto de entrada de la aplicación
│   ├── utils
│   │   ├── compression.ts     # Implementación de compresión y descompresión
│   │   └── safePath.ts        # Validación segura de rutas de entrada ZIP
├── tsconfig.json              # Archivo de configuración de TypeScript
├── package.json               # Archivo de configuración de npm
└── README.md                  # Documentación del proyecto
```

## Instalación

Puedes instalar ZIP MCP Server globalmente usando npm:

```bash
npm install -g zip-mcp
```

## Configuración de MCP

Después de la instalación, puedes configurar ZIP MCP en tu configuración JSON de MCP:

```json
{
  "mcpServers": {
    "zip-mcp": {
      "command": "zip-mcp",
      "args": []
    }
  }
}
```

## Configurar el JSON de MCP en el Cliente de IA

- Claude Client: [https://modelcontextprotocol.io/quickstart/user](https://modelcontextprotocol.io/quickstart/user)
- Raycast: requiere instalar el plugin MCP
- Cursor: [https://docs.cursor.com/context/model-context-protocol#configuring-mcp-servers](https://docs.cursor.com/context/model-context-protocol#configuring-mcp-servers)

## Descripción de Herramientas MCP

ZIP MCP Server proporciona las siguientes herramientas, que pueden ser llamadas a través del protocolo MCP:

### Herramienta de Compresión (compress)

Comprime archivos o directorios locales en un archivo ZIP.

**Parámetros:**

- `input`: Ruta del archivo o directorio a comprimir (cadena o matriz de cadenas)
- `output`: Ruta del archivo ZIP de salida
- `options`: Opciones de compresión (opcional)
  - `level`: Nivel de compresión (0-9, el predeterminado es 5)
  - `password`: Protección por contraseña
  - `encryptionStrength`: Fuerza del cifrado (1-3)
  - `overwrite`: Si se deben sobrescribir los archivos existentes (booleano)

**Retornos:**

- Éxito: Contenido de texto con información de éxito
- Fallo: Contenido de texto con información de error

### Herramienta de Descompresión (decompress)

Descomprime archivos ZIP locales en el directorio especificado. Las rutas de entrada se validan antes de escribir, por lo que los archivos no pueden extraerse fuera de `output` mediante `..` o rutas absolutas.

**Parámetros:**

- `input`: Ruta del archivo ZIP
- `output`: Ruta del directorio de salida
- `options`: Opciones de descompresión (opcional)
  - `password`: Contraseña de descompresión
  - `overwrite`: Si se deben sobrescribir los archivos existentes (booleano)
  - `createDirectories`: Si se deben crear directorios inexistentes (booleano)

**Retornos:**

- Éxito: Contenido de texto con información del resultado de la descompresión
- Fallo: Contenido de texto con información de error

### Herramienta de Información ZIP (getZipInfo)

Obtiene información de metadatos de archivos ZIP locales.

**Parámetros:**

- `input`: Ruta del archivo ZIP
- `options`: Opciones (opcional)
  - `password`: Contraseña de descompresión

**Retornos:**

- Éxito: Contenido de texto con información detallada del archivo ZIP, incluyendo:
  - Número total de archivos
  - Tamaño total
  - Tamaño comprimido
  - Ratio de compresión
  - Información detallada de cada archivo
- Fallo: Contenido de texto con información de error

### Herramienta de Prueba (echo)

Devuelve el mensaje de entrada para probar si el servicio está funcionando normalmente.

**Parámetros:**

- `message`: Mensaje a devolver

**Retornos:**

- Contenido de texto que contiene el mensaje de entrada y la marca de tiempo actual

## Ejemplos

Ejemplos de llamada a herramientas usando el cliente MCP:

```javascript
// Comprimir archivos
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

// Descomprimir archivos
await client.executeTool("decompress", {
  input: "/path/to/archive.zip",
  output: "/path/to/extract/directory",
  options: {
    password: "secret",
    overwrite: true,
    createDirectories: true,
  },
});

// Obtener info del ZIP
await client.executeTool("getZipInfo", {
  input: "/path/to/archive.zip",
  options: {
    password: "secret",
  },
});

// Probar servicio
await client.executeTool("echo", {
  message: "Hello, ZIP MCP Server!",
});
```

## Contacto

- Email: [gz7gugu@qq.com](mailto:gz7gugu@qq.com)
- Blog: [https://7gugu.com](https://7gugu.com)
