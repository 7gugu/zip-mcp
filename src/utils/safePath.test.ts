import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';
import { assertSafeZipEntryPath } from './safePath.js';
import { decompressData } from './compression.js';

describe('assertSafeZipEntryPath', () => {
  const outputRoot = '/tmp/zip-mcp-safe-out';

  it('allows nested paths under the output root', () => {
    const resolved = assertSafeZipEntryPath(outputRoot, 'normal/ok.txt');
    assert.equal(resolved, path.resolve(outputRoot, 'normal/ok.txt'));
  });

  it('rejects parent traversal', () => {
    assert.throws(
      () => assertSafeZipEntryPath(outputRoot, '../escape.txt'),
      /Unsafe zip entry path/,
    );
  });

  it('rejects nested parent traversal', () => {
    assert.throws(
      () => assertSafeZipEntryPath(outputRoot, 'foo/../../escape.txt'),
      /parent traversal not allowed/,
    );
  });

  it('rejects absolute posix paths', () => {
    assert.throws(
      () => assertSafeZipEntryPath(outputRoot, '/etc/passwd'),
      /absolute path not allowed/,
    );
  });

  it('rejects windows drive paths', () => {
    assert.throws(
      () => assertSafeZipEntryPath(outputRoot, 'C:\\Windows\\temp.txt'),
      /absolute path not allowed/,
    );
  });

  it('rejects empty entry names', () => {
    assert.throws(
      () => assertSafeZipEntryPath(outputRoot, ''),
      /empty or invalid entry name/,
    );
  });
});

describe('decompress zip slip', () => {
  it('does not write files outside the output directory', async () => {
    const workdir = await mkdtemp(path.join(tmpdir(), 'zip-mcp-safe-'));
    const outputDir = path.join(workdir, 'out');
    const outsideFile = path.join(workdir, 'zip_mcp_probe.txt');

    await mkdir(outputDir, { recursive: true });

    const writer = new ZipWriter(new BlobWriter('application/zip'));
    await writer.add('../zip_mcp_probe.txt', new TextReader('zip-mcp-poc'));
    const zipData = new Uint8Array(await (await writer.close()).arrayBuffer());
    const result = await decompressData(zipData, {});

    assert.throws(
      () => assertSafeZipEntryPath(path.resolve(outputDir), result[0].name),
      /Unsafe zip entry path/,
    );

    let outsideExists = true;
    try {
      await access(outsideFile);
    } catch {
      outsideExists = false;
    }

    assert.equal(outsideExists, false);

    await rm(workdir, { recursive: true, force: true });
  });
});
