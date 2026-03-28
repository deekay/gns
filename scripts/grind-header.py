#!/usr/bin/env python3

import hashlib
import struct
import sys


def decode_compact(bits: int) -> int:
    exponent = bits >> 24
    mantissa = bits & 0x007FFFFF

    if exponent <= 3:
        return mantissa >> (8 * (3 - exponent))

    return mantissa << (8 * (exponent - 3))


def hash256(payload: bytes) -> bytes:
    return hashlib.sha256(hashlib.sha256(payload).digest()).digest()


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: grind-header.py <80-byte-header-hex>", file=sys.stderr)
        return 1

    header_hex = argv[1].strip().lower()
    if len(header_hex) != 160:
        print("header must be exactly 80 bytes", file=sys.stderr)
        return 1

    try:
        header = bytearray.fromhex(header_hex)
    except ValueError as error:
        print(f"invalid hex: {error}", file=sys.stderr)
        return 1

    bits = int.from_bytes(header[72:76], "little")
    target = decode_compact(bits)
    if target <= 0:
        print("invalid compact target", file=sys.stderr)
        return 1

    nonce = int.from_bytes(header[76:80], "little")
    target_bytes = target.to_bytes(32, "big")
    pack_nonce = struct.Struct("<I").pack_into
    sha256 = hashlib.sha256

    for _ in range(2**32):
        pack_nonce(header, 76, nonce)

        hashed = sha256(sha256(header).digest()).digest()
        if hashed[::-1] <= target_bytes:
            print(header.hex())
            return 0

        nonce = (nonce + 1) & 0xFFFFFFFF

    print("no valid nonce found", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
