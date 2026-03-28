#include <openssl/sha.h>
#include <pthread.h>
#include <stdatomic.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

static int from_hex_nibble(char c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'a' && c <= 'f') return 10 + (c - 'a');
  if (c >= 'A' && c <= 'F') return 10 + (c - 'A');
  return -1;
}

static int hex_to_bytes(const char *hex, uint8_t *out, size_t out_len) {
  size_t hex_len = strlen(hex);
  if (hex_len != out_len * 2) return -1;

  for (size_t i = 0; i < out_len; ++i) {
    int hi = from_hex_nibble(hex[i * 2]);
    int lo = from_hex_nibble(hex[i * 2 + 1]);
    if (hi < 0 || lo < 0) return -1;
    out[i] = (uint8_t)((hi << 4) | lo);
  }

  return 0;
}

static void bytes_to_hex(const uint8_t *bytes, size_t len, char *hex_out) {
  static const char *HEX = "0123456789abcdef";

  for (size_t i = 0; i < len; ++i) {
    hex_out[i * 2] = HEX[(bytes[i] >> 4) & 0x0f];
    hex_out[i * 2 + 1] = HEX[bytes[i] & 0x0f];
  }

  hex_out[len * 2] = '\0';
}

static int compact_target_to_bytes(uint32_t bits, uint8_t target[32]) {
  memset(target, 0, 32);

  uint32_t exponent = bits >> 24;
  uint32_t mantissa = bits & 0x007fffff;

  if (exponent == 0) return -1;

  if (exponent <= 3) {
    mantissa >>= 8 * (3 - exponent);
    exponent = 3;
  }

  if (exponent > 32) return -1;

  size_t index = 32 - exponent;
  if (index + 2 >= 32) return -1;

  target[index] = (uint8_t)((mantissa >> 16) & 0xff);
  target[index + 1] = (uint8_t)((mantissa >> 8) & 0xff);
  target[index + 2] = (uint8_t)(mantissa & 0xff);
  return 0;
}

static int less_or_equal_be(const uint8_t left[32], const uint8_t right[32]) {
  return memcmp(left, right, 32) <= 0;
}

typedef struct {
  uint8_t header[80];
  uint8_t target[32];
  uint32_t start_nonce;
  uint32_t step;
  _Atomic int *found;
  _Atomic uint32_t *found_nonce;
} worker_args_t;

static void *grind_worker(void *raw) {
  worker_args_t *args = (worker_args_t *)raw;
  uint8_t header[80];
  uint8_t first[SHA256_DIGEST_LENGTH];
  uint8_t second[SHA256_DIGEST_LENGTH];
  uint8_t reversed[SHA256_DIGEST_LENGTH];

  memcpy(header, args->header, sizeof(header));

  for (uint32_t nonce = args->start_nonce;; nonce += args->step) {
    if (atomic_load(args->found)) {
      return NULL;
    }

    header[76] = (uint8_t)(nonce & 0xff);
    header[77] = (uint8_t)((nonce >> 8) & 0xff);
    header[78] = (uint8_t)((nonce >> 16) & 0xff);
    header[79] = (uint8_t)((nonce >> 24) & 0xff);

    SHA256(header, sizeof(header), first);
    SHA256(first, sizeof(first), second);

    for (size_t index = 0; index < 32; ++index) {
      reversed[index] = second[31 - index];
    }

    if (less_or_equal_be(reversed, args->target)) {
      int expected = 0;
      if (atomic_compare_exchange_strong(args->found, &expected, 1)) {
        atomic_store(args->found_nonce, nonce);
      }
      return NULL;
    }

    if (nonce > UINT32_MAX - args->step) {
      return NULL;
    }
  }
}

int main(int argc, char **argv) {
  if (argc != 2) {
    fprintf(stderr, "usage: gns-grind-header-fast <80-byte-header-hex>\n");
    return 1;
  }

  uint8_t header[80];
  if (hex_to_bytes(argv[1], header, sizeof(header)) != 0) {
    fprintf(stderr, "invalid header hex\n");
    return 1;
  }

  uint32_t bits =
    (uint32_t)header[72]
    | ((uint32_t)header[73] << 8)
    | ((uint32_t)header[74] << 16)
    | ((uint32_t)header[75] << 24);

  uint8_t target[32];
  if (compact_target_to_bytes(bits, target) != 0) {
    fprintf(stderr, "invalid compact target\n");
    return 1;
  }

  uint32_t base_nonce =
    (uint32_t)header[76]
    | ((uint32_t)header[77] << 8)
    | ((uint32_t)header[78] << 16)
    | ((uint32_t)header[79] << 24);

  long detected = sysconf(_SC_NPROCESSORS_ONLN);
  uint32_t thread_count = detected > 1 ? (uint32_t)detected : 1U;
  if (thread_count > 8U) {
    thread_count = 8U;
  }

  pthread_t *threads = calloc(thread_count, sizeof(pthread_t));
  worker_args_t *args = calloc(thread_count, sizeof(worker_args_t));
  if (threads == NULL || args == NULL) {
    fprintf(stderr, "allocation failure\n");
    free(threads);
    free(args);
    return 1;
  }

  _Atomic int found = 0;
  _Atomic uint32_t found_nonce = 0;

  for (uint32_t i = 0; i < thread_count; ++i) {
    memcpy(args[i].header, header, sizeof(header));
    memcpy(args[i].target, target, sizeof(target));
    args[i].start_nonce = base_nonce + i;
    args[i].step = thread_count;
    args[i].found = &found;
    args[i].found_nonce = &found_nonce;

    if (pthread_create(&threads[i], NULL, grind_worker, &args[i]) != 0) {
      fprintf(stderr, "failed to create worker thread\n");
      free(threads);
      free(args);
      return 1;
    }
  }

  for (uint32_t i = 0; i < thread_count; ++i) {
    pthread_join(threads[i], NULL);
  }

  if (!atomic_load(&found)) {
    fprintf(stderr, "no valid nonce found\n");
    free(threads);
    free(args);
    return 2;
  }

  uint32_t nonce = atomic_load(&found_nonce);
  header[76] = (uint8_t)(nonce & 0xff);
  header[77] = (uint8_t)((nonce >> 8) & 0xff);
  header[78] = (uint8_t)((nonce >> 16) & 0xff);
  header[79] = (uint8_t)((nonce >> 24) & 0xff);

  char out_hex[161];
  bytes_to_hex(header, sizeof(header), out_hex);
  puts(out_hex);

  free(threads);
  free(args);
  return 0;
}
