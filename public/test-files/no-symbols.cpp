#include <cstdint>

int add(int a, int b) { return a + b; }
int multiply(int a, int b) { return a * b; }
int subtract(int a, int b) { return a - b; }
int divide(int a, int b) { return b != 0 ? a / b : 0; }
int modulo(int a, int b) { return b != 0 ? a % b : 0; }
int negate(int x) { return -x; }
int abs_val(int x) { return x < 0 ? -x : x; }
int min_val(int a, int b) { return a < b ? a : b; }
int max_val(int a, int b) { return a > b ? a : b; }
int clamp_val(int v, int lo, int hi) { return v < lo ? lo : (v > hi ? hi : v); }
int square(int x) { return x * x; }
int cube(int x) { return x * x * x; }
int pow2(int n) { return n >= 0 ? (1 << n) : 0; }
int bit_and(int a, int b) { return a & b; }
int bit_or(int a, int b) { return a | b; }
int bit_xor(int a, int b) { return a ^ b; }
int bit_not(int x) { return ~x; }
int shift_left(int x, int n) { return x << n; }
int shift_right(int x, int n) { return x >> n; }
bool eq(int a, int b) { return a == b; }
bool ne(int a, int b) { return a != b; }
bool lt(int a, int b) { return a < b; }
bool le(int a, int b) { return a <= b; }
bool gt(int a, int b) { return a > b; }
bool ge(int a, int b) { return a >= b; }
bool logical_and(bool a, bool b) { return a && b; }
bool logical_or(bool a, bool b) { return a || b; }
bool logical_not(bool x) { return !x; }
int choose(bool c, int a, int b) { return c ? a : b; }
int sum3(int a, int b, int c) { return a + b + c; }
int product3(int a, int b, int c) { return a * b * c; }
int average2(int a, int b) { return (a + b) / 2; }
int double_val(int x) { return x * 2; }
int half(int x) { return x / 2; }
int increment(int x) { return x + 1; }
int decrement(int x) { return x - 1; }
bool is_even(int x) { return (x & 1) == 0; }
bool is_odd(int x) { return (x & 1) != 0; }
int sign(int x) { return x > 0 ? 1 : (x < 0 ? -1 : 0); }
uint32_t rotl32(uint32_t x, int n) { return (x << n) | (x >> (32 - n)); }
uint32_t rotr32(uint32_t x, int n) { return (x >> n) | (x << (32 - n)); }
int id(int x) { return x; }
int zero() { return 0; }
int one() { return 1; }
int two() { return 2; }
int ten() { return 10; }
int hundred() { return 100; }
int mask_bits(int n) { return n >= 32 ? -1 : ((1 << n) - 1); }
int low_byte(int x) { return x & 0xFF; }
int high_byte(int x) { return (x >> 8) & 0xFF; }
int set_bit(int x, int b) { return x | (1 << b); }
int clear_bit(int x, int b) { return x & ~(1 << b); }
bool test_bit(int x, int b) { return (x & (1 << b)) != 0; }
int toggle_bit(int x, int b) { return x ^ (1 << b); }
int popcount_approx(int x) { int n = 0; while (x) { n++; x &= x - 1; } return n; }
int next_pow2(int x) { x--; x |= x >> 1; x |= x >> 2; x |= x >> 4; x |= x >> 8; x |= x >> 16; return x + 1; }
int floor_log2(uint32_t x) { int n = 0; while (x > 1) { x >>= 1; n++; } return n; }
int saturate_add(int a, int b) { int r = a + b; return (a > 0 && b > 0 && r < 0) ? 0x7FFFFFFF : r; }
int saturate_sub(int a, int b) { int r = a - b; return (a < 0 && b > 0 && r > 0) ? (int)0x80000000 : r; }
int diff(int a, int b) { return a > b ? a - b : b - a; }
int mid(int a, int b) { return (a + b) / 2; }
int round_up_div(int a, int b) { return b != 0 ? (a + b - 1) / b : 0; }
bool in_range(int v, int lo, int hi) { return v >= lo && v <= hi; }
int blend(int a, int b, int t) { return a + (b - a) * t; }
int negate_if(bool c, int x) { return c ? -x : x; }
int abs_diff(int a, int b) { return a >= b ? a - b : b - a; }
int min3(int a, int b, int c) { return (a < b ? a : b) < c ? (a < b ? a : b) : c; }
int max3(int a, int b, int c) { return (a > b ? a : b) > c ? (a > b ? a : b) : c; }
int clamp_byte(int x) { return x < 0 ? 0 : (x > 255 ? 255 : x); }
uint8_t to_byte(int x) { return (uint8_t)(x & 0xFF); }
int from_byte(uint8_t x) { return (int)x; }
int swap_bytes(int x) { return ((x & 0xFF) << 8) | ((x >> 8) & 0xFF); }
int reverse_bits_4(int x) { return ((x & 1) << 3) | ((x & 2) << 1) | ((x & 4) >> 1) | ((x & 8) >> 3); }
int parity(int x) { x ^= x >> 16; x ^= x >> 8; x ^= x >> 4; x ^= x >> 2; x ^= x >> 1; return x & 1; }
int trailing_zeros(uint32_t x) { if (x == 0) return 32; int n = 0; while ((x & 1) == 0) { n++; x >>= 1; } return n; }
int leading_zeros_approx(uint32_t x) { if (x == 0) return 32; int n = 0; while (x != 0) { n++; x >>= 1; } return 32 - n; }
int mul_shift(int x, int y, int s) { return (int)(((int64_t)x * y) >> s); }
int div_round(int a, int b) { return b != 0 ? (a + b/2) / b : 0; }
int mod_positive(int a, int b) { if (b <= 0) return 0; int r = a % b; return r < 0 ? r + b : r; }
bool same_sign(int a, int b) { return (a ^ b) >= 0; }
int copy_sign(int x, int y) { return y >= 0 ? abs_val(x) : -abs_val(x); }
int floor_div(int a, int b) { return b != 0 ? (a - (a % b + b) % b) / b : 0; }
int ceil_div(int a, int b) { return b != 0 ? (a + b - 1) / b : 0; }
int round_to_multiple(int x, int m) { return m != 0 ? (x + m/2) / m * m : x; }
int delta(int prev, int curr) { return curr - prev; }
int accumulate(int acc, int x) { return acc + x; }
int factorial_small(int n) { return n <= 1 ? 1 : n * factorial_small(n - 1); }
int fib_small(int n) { return n <= 1 ? n : fib_small(n-1) + fib_small(n-2); }
int gcd_simple(int a, int b) { while (b) { int t = b; b = a % b; a = t; } return a < 0 ? -a : a; }
int lcm_simple(int a, int b) { int g = gcd_simple(a, b); return g != 0 ? (a / g) * b : 0; }
bool is_pow2(uint32_t x) { return x != 0 && (x & (x - 1)) == 0; }
int next_multiple(int x, int m) { return m != 0 ? ((x + m - 1) / m) * m : x; }
int prev_multiple(int x, int m) { return m != 0 ? (x / m) * m : x; }
int wrap(int x, int lo, int hi) { int w = hi - lo; return lo + mod_positive(x - lo, w); }
int overflow_add(int a, int b, int* overflow) { int r = a + b; *overflow = (a > 0 && b > 0 && r < 0) ? 1 : 0; return r; }
int overflow_sub(int a, int b, int* overflow) { int r = a - b; *overflow = (a < 0 && b > 0 && r > 0) ? 1 : 0; return r; }
int f1(int x) { return x + 1; }
int f2(int x) { return x + 2; }
int f3(int x) { return x + 3; }
int f4(int x) { return x + 4; }
int f5(int x) { return x + 5; }
int f6(int x) { return x + 6; }
int f7(int x) { return x + 7; }
int f8(int x) { return x + 8; }
int f9(int x) { return x + 9; }
int f10(int x) { return x + 10; }
int f11(int x) { return x * 2; }
int f12(int x) { return x * 3; }
int f13(int x) { return x * 4; }
int f14(int x) { return x - 1; }
int f15(int x) { return x - 2; }
int f16(int a, int b) { return a + b + 1; }
int f17(int a, int b) { return a + b + 2; }
int f18(int a, int b) { return a * b + 1; }
int f19(int x) { return x & 0x0F; }
int f20(int x) { return x & 0xF0; }
int f21(int x) { return x | 0x01; }
int f22(int x) { return x & ~1; }
int f23(int x) { return (x >> 1) & 0x7F; }
int f24(int x) { return x << 1; }
int f25(int x) { return x ^ 0xFF; }
int f26(int a, int b) { return a - b; }
int f27(int a, int b) { return a * b; }
int f28(int x) { return x % 10; }
int f29(int x) { return x % 100; }
int f30(int x) { return x / 10; }
int f31(int x) { return x / 100; }
int f32(int a, int b) { return (a + b) / 2; }
int f33(int a, int b) { return a * b / 2; }
int f34(int x) { return x > 0 ? x : 0; }
int f35(int x) { return x < 0 ? x : 0; }
int f36(int x) { return x == 0 ? 1 : 0; }
int f37(int x) { return x != 0 ? 1 : 0; }
int f38(int a, int b) { return a == b ? 1 : 0; }
int f39(int a, int b) { return a != b ? 1 : 0; }
int f40(int a, int b) { return a < b ? 1 : 0; }
int f41(int a, int b) { return a > b ? 1 : 0; }
int f42(int x) { return x & 1; }
int f43(int x) { return (x >> 8) & 0xFF; }
int f44(int x) { return (x >> 16) & 0xFF; }
int f45(int x) { return (x >> 24) & 0xFF; }
int f46(int a, int b, int c) { return a + b - c; }
int f47(int a, int b, int c) { return a * b + c; }
int f48(int a, int b, int c) { return a - b + c; }
int f49(int x) { return x * 10; }
int f50(int x) { return x * 100; }
int f51(int x) { return x + 100; }
int f52(int x) { return x - 100; }
int f53(int a, int b) { return a * a + b * b; }
int f54(int x) { return x * 4; }
int f55(int x) { return x * 8; }
int f56(int x) { return x / 4; }
int f57(int x) { return x / 8; }
int f58(int x) { return x % 4; }
int f59(int x) { return x % 8; }
int f60(int a, int b) { return a > b ? a - b : b - a; }
int f61(int x) { return -x - 1; }
int f62(int x) { return x + x; }
int f63(int x) { return x * 3; }
int f64(int x) { return x * 5; }
int f65(int x) { return x * 6; }
int f66(int x) { return x * 7; }
int f67(int x) { return x * 9; }
int f68(int a, int b) { return a | b; }
int f69(int a, int b) { return a & b; }
int f70(int a, int b) { return a ^ b; }
int f71(int x) { return x << 2; }
int f72(int x) { return x << 3; }
int f73(int x) { return x >> 2; }
int f74(int x) { return x >> 3; }
int f75(int a, int b) { return a + b * 2; }
int f76(int a, int b) { return a * 2 + b; }
int f77(int a, int b) { return (a + b) * (a - b); }
int f78(int x) { return x * x + x; }
int f79(int x) { return x * (x + 1); }
int f80(int x) { return x * (x - 1); }
int f81(int a, int b) { return a / b + a % b; }
int f82(int x) { return x & 0xFFFF; }
int f83(int x) { return x >> 16; }
int f84(int a, int b) { return a * b % 256; }
int f85(int x) { return (x + 128) & 0xFF; }
int f86(int x) { return x & 0x7F; }
int f87(int x) { return x | 0x80; }
int f88(int a, int b) { return a < b ? a : b; }
int f89(int a, int b) { return a > b ? a : b; }
int f90(int a, int b, int c) { return a + b + c; }
int f91(int x) { return x + 11; }
int f92(int x) { return x + 12; }
int f93(int x) { return x + 13; }
int f94(int x) { return x + 14; }
int f95(int x) { return x + 15; }
int f96(int x) { return x + 16; }
int f97(int x) { return x + 17; }
int f98(int x) { return x + 18; }
int f99(int x) { return x + 19; }
int f100(int x) { return x + 20; }
int f101(int x) { return x - 3; }
int f102(int x) { return x - 4; }
