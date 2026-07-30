/**
 * Minimal typings for archiver v8 (ESM, class-based API), which ships no
 * types of its own and is not covered by @types/archiver (v6 API only).
 * Only the surface this project uses is declared.
 */
declare module 'archiver' {
  import { Transform } from 'stream';
  import { ZlibOptions } from 'zlib';

  interface ArchiveEntryData {
    name: string;
    date?: string | Date;
    mode?: number;
    prefix?: string;
  }

  interface ZipArchiveOptions {
    comment?: string;
    forceLocalTime?: boolean;
    forceZip64?: boolean;
    store?: boolean;
    zlib?: ZlibOptions;
  }

  export class Archiver extends Transform {
    append(
      source: Buffer | string | NodeJS.ReadableStream,
      data: ArchiveEntryData
    ): this;
    directory(dirpath: string, destpath: string | false): this;
    file(filepath: string, data?: Partial<ArchiveEntryData>): this;
    finalize(): Promise<void>;
    pointer(): number;
  }

  export class ZipArchive extends Archiver {
    constructor(options?: ZipArchiveOptions);
  }

  export class TarArchive extends Archiver {
    constructor(options?: ZipArchiveOptions);
  }
}
