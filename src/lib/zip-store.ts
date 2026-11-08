function crcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
}

const CRC = crcTable();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u16(n: number): Uint8Array {
  const b = new Uint8Array(2);
  b[0] = n & 0xff;
  b[1] = (n >>> 8) & 0xff;
  return b;
}

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4);
  b[0] = n & 0xff;
  b[1] = (n >>> 8) & 0xff;
  b[2] = (n >>> 16) & 0xff;
  b[3] = (n >>> 24) & 0xff;
  return b;
}

const enc = new TextEncoder();

export function zipStore(files: { name: string; body: string }[]): Uint8Array {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = enc.encode(file.name);
    const data = enc.encode(file.body);
    const crc = crc32(data);
    const local = [
      enc.encode("PK\u0003\u0004"),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
      data,
    ];
    const localSize = local.reduce((n, part) => n + part.length, 0);
    chunks.push(...local);
    central.push(
      enc.encode("PK\u0001\u0002"),
      u16(20),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name,
    );
    offset += localSize;
  }
  const cd = central;
  const cdSize = cd.reduce((n, part) => n + part.length, 0);
  const eocd = [
    enc.encode("PK\u0005\u0006"),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(cdSize),
    u32(offset),
    u16(0),
  ];
  const total = offset + cdSize + eocd.reduce((n, part) => n + part.length, 0);
  const out = new Uint8Array(total);
  let i = 0;
  for (const part of [...chunks, ...cd, ...eocd]) {
    out.set(part, i);
    i += part.length;
  }
  return out;
}
