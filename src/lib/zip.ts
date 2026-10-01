// Minimal streaming ZIP writer (STORE, no compression). Screenshots are
// already-compressed images and the xlsx is itself a zip, so deflating again
// buys almost nothing — storing keeps this dependency-free and cheap on CPU.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(d: Date): { time: number; date: number } {
  const year = Math.max(1980, d.getFullYear());
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

type CentralEntry = { name: Uint8Array; crc: number; size: number; offset: number; time: number; date: number };

export class ZipWriter {
  private entries: CentralEntry[] = [];
  private offset = 0;
  private readonly now = dosDateTime(new Date());
  private readonly emit: (chunk: Uint8Array) => void;

  constructor(emit: (chunk: Uint8Array) => void) {
    this.emit = emit;
  }

  addFile(path: string, data: Uint8Array) {
    const name = new TextEncoder().encode(path);
    const crc = crc32(data);
    const { time, date } = this.now;

    const header = new DataView(new ArrayBuffer(30));
    header.setUint32(0, 0x04034b50, true);
    header.setUint16(4, 20, true); // version needed
    header.setUint16(6, 0x0800, true); // UTF-8 file names
    header.setUint16(8, 0, true); // STORE
    header.setUint16(10, time, true);
    header.setUint16(12, date, true);
    header.setUint32(14, crc, true);
    header.setUint32(18, data.length, true);
    header.setUint32(22, data.length, true);
    header.setUint16(26, name.length, true);
    header.setUint16(28, 0, true);

    this.emit(new Uint8Array(header.buffer));
    this.emit(name);
    this.emit(data);

    this.entries.push({ name, crc, size: data.length, offset: this.offset, time, date });
    this.offset += 30 + name.length + data.length;
  }

  finish() {
    const start = this.offset;
    let size = 0;
    for (const e of this.entries) {
      const h = new DataView(new ArrayBuffer(46));
      h.setUint32(0, 0x02014b50, true);
      h.setUint16(4, 20, true); // version made by
      h.setUint16(6, 20, true); // version needed
      h.setUint16(8, 0x0800, true);
      h.setUint16(10, 0, true);
      h.setUint16(12, e.time, true);
      h.setUint16(14, e.date, true);
      h.setUint32(16, e.crc, true);
      h.setUint32(20, e.size, true);
      h.setUint32(24, e.size, true);
      h.setUint16(28, e.name.length, true);
      h.setUint32(42, e.offset, true);
      this.emit(new Uint8Array(h.buffer));
      this.emit(e.name);
      size += 46 + e.name.length;
    }
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, this.entries.length, true);
    end.setUint16(10, this.entries.length, true);
    end.setUint32(12, size, true);
    end.setUint32(16, start, true);
    this.emit(new Uint8Array(end.buffer));
  }
}
