"""Bake an OBJ model into the compact wireframe file the homepage draws.

Usage: python3 tools/build_wireframe.py models/p51/p51.obj assets/models/p51.wire

Vertices are merged at 4 decimal places, faces are triangulated, and each
unique triangle edge becomes one line segment. Output (little-endian):

    char[4]   magic "WIRE"
    uint32    vertex count
    uint32    segment count
    float32   bbox min x, y, z
    float32   bbox max x, y, z
    uint16    vertex positions, quantized over the bbox (3 per vertex)
    varint    segments, sorted by first endpoint: (a - previous a), (b - a)

GitHub Pages doesn't gzip binary files, so the varint deltas stand in for
compression and take the segment list from 4 bytes each to about 2.
"""
import struct
import sys

src, dst = sys.argv[1], sys.argv[2]

raw = []
faces = []
for line in open(src):
    parts = line.split()
    if not parts:
        continue
    if parts[0] == 'v':
        raw.append(tuple(float(c) for c in parts[1:4]))
    elif parts[0] == 'f':
        idx = [int(p.split('/')[0]) for p in parts[1:]]
        idx = [i - 1 if i > 0 else len(raw) + i for i in idx]
        for k in range(1, len(idx) - 1):
            faces.append((idx[0], idx[k], idx[k + 1]))

# Merge vertices that share a position at 4 decimal places.
key_to_new = {}
remap = []
verts = []
for v in raw:
    key = tuple(round(c * 10000) for c in v)
    if key not in key_to_new:
        key_to_new[key] = len(verts)
        verts.append(v)
    remap.append(key_to_new[key])

edges = set()
for a, b, c in faces:
    a, b, c = remap[a], remap[b], remap[c]
    if a == b or b == c or a == c:
        continue
    for p, q in ((a, b), (b, c), (c, a)):
        edges.add((p, q) if p < q else (q, p))

if len(verts) > 65535:
    sys.exit('too many vertices for uint16 indices: %d' % len(verts))

lo = [min(v[i] for v in verts) for i in range(3)]
hi = [max(v[i] for v in verts) for i in range(3)]
span = [(hi[i] - lo[i]) or 1.0 for i in range(3)]

out = bytearray(b'WIRE')
out += struct.pack('<II', len(verts), len(edges))
out += struct.pack('<6f', *lo, *hi)
for v in verts:
    out += struct.pack('<3H', *(round((v[i] - lo[i]) / span[i] * 65535) for i in range(3)))


def varint(x):
    b = bytearray()
    while x >= 0x80:
        b.append((x & 0x7f) | 0x80)
        x >>= 7
    b.append(x)
    return b


prev = 0
for p, q in sorted(edges):
    out += varint(p - prev) + varint(q - p)
    prev = p

open(dst, 'wb').write(out)
print('%d vertices, %d segments, %d bytes' % (len(verts), len(edges), len(out)))
print('bbox', [round(c, 3) for c in lo], [round(c, 3) for c in hi])
