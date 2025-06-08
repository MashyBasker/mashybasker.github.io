---
author: ["Maharshi Basu"]
title: "Triggering Auto-Vectorization in Zig Standard Library method"
date: "2025-06-08"
description: "An exploration of how LLVM’s auto-vectorization can be used to optimize Zig’s std.mem.allEqual, and the surprising performance implications that follow."
summary: "An exploration of how LLVM’s auto-vectorization can be used to optimize Zig’s std.mem.allEqual, and the surprising performance implications that follow."
tags: ["zig", "llvm", "simd"]
ShowToc: false
TocOpen: true
---

## Introduction

I read [this post](https://sivukhin.github.io/find-slice-element-position-in-rust.html) recently by Nikita Sivukhin. In it, they refactor a `find` method to locate the position of an element in a slice. The optimization takes advantage of LLVM’s auto-vectorization to improve performance.

I decided to apply the techniques discussed to the `std.mem.allEqual` function in Zig’s standard library to investigate how vectorization could affect its performance.

## The Standard Library

The `allEqual` method is defined as

> Returns true if all elements in a slice are equal to the scalar value provided

With this pretty simple source code:

```zig
pub fn allEqual(comptime T: type, slice: []const T, scalar: T) bool {
    for (slice) |item| {
        if (item != scalar) return false;
    }
    return true;
}
```
<br><br>

Putting this on [godbolt](https://godbolt.org/z/zqczGb13e) using Zig 0.14.1 and the flags `-O ReleaseFast -target x86_64-linux -mcpu=native` gives the compiler output:

<br><br>

```asm
allEqual:
        push    rbp
        mov     rbp, rsp
        test    rsi, rsi
        je      .LBB0_1
        cmp     dword ptr [rdi], edx
        jne     .LBB0_3
        mov     ecx, 1
.LBB0_7:
        mov     rax, rcx
        cmp     rsi, rcx
        je      .LBB0_4
        lea     rcx, [rax + 1]
        cmp     dword ptr [rdi + 4*rax], edx
        je      .LBB0_7
.LBB0_4:
        cmp     rax, rsi
        setae   al
        pop     rbp
        ret
.LBB0_1:
        mov     al, 1
        pop     rbp
        ret
.LBB0_3:
        xor     eax, eax
        pop     rbp
        ret
```
<br><br>
However, this approach lacks vectorization. Why doesn’t LLVM apply it? To understand what might be preventing vectorization, we can check the [LLVM optimization remarks](https://llvm.org/docs/Remarks.html) for clues.

Unlike Rust, Zig doesn't support passing arbitrary LLVM flags such as `-pass-remarks`, `-pass-remarks-missed`, or `-pass-remarks-analysis` directly. To work around this, we need to first emit the LLVM IR using the `-emit-llvm-ir` flag to generate a `.ll` file. Then use the [`llvm-opt`](https://llvm.org/docs/CommandGuide/opt.html) tool on this file to generate the optimization remarks.

### Setting up the development environment

I used [Nix](https://nix.dev/) with [Devenv](https://devenv.sh/) to set up the environment. Just run `devenv init` in your project directory and configure the `devenv.nix` file as needed:

```nix
{ pkgs, lib, config, inputs, ... }:

{
  languages.zig.enable = true;
  
  packages = with pkgs; [
        llvmPackages_19.llvm
  ];
}
```

Finally execute `devenv shell` to build the environment.

### Investigation

We put the following slightly modified code in a `test.zig` file.

```zig
const std = @import("std");

export fn allEqual_std(data: [*]const u8, len: usize, target: u8) bool {
    return std.mem.allEqual(u8, data[0..len], target);
}
```

The `export` keyword is needed, otherwise LLVM's dead code elimination will ignore this function as its never actually called.

Executing:

```shell
zig build-obj -femit-llvm-ir=test.ll -femit-asm=output.s -O ReleaseFast test.zig &&
opt -O3 \
  -pass-remarks=.* \
  -pass-remarks-missed=.* \
  -pass-remarks-analysis=.* \
  test.ll -S -o optimized.ll
```

The following output is received:

```shell
remarks-analysis=.*   test.ll -S -o optimized.ll
remark: mem.zig:1191:10: loop not vectorized: could not determine number of loop iterations
remark: mem.zig:1191:10: loop not vectorized
```

The remark `loop not vectorized: could not determine number of loop iterations` means the compiler can't statically determine how many times the loop will run. Vectorization needs predictable iteration counts to safely group operations into SIMD instructions, which is handled by the [LoopVectorizer](https://llvm.org/docs/Vectorizers.html#loop-vectorizer).

This can be caused by non-constant loop bounds or early exits. In the original implementation of `std.mem.allEqual` in the standard library, there’s an early `return` statement inside the loop. That’s what prevents the loop from being vectorized.

### Refactor and Restructure

To trigger loop vectorization, the implementation must be modified to not use early returns:

```zig
export fn allEqual_no_early_stop(slice: [*]const u8, len: usize, scalar: u8) bool {
    var m: bool = true;
    for (slice[0..len]) |item| {
        m = m and (item == scalar);
    }
    return m;
}
```

This looks correct, now let's check the compiler output and the LLVM remarks.

```asm
.LBB0_5:
        cmp     byte ptr [rdi + r8], dl
        sete    r9b
        and     r9b, al
        cmp     byte ptr [rdi + r8 + 1], dl
        sete    al
        cmp     byte ptr [rdi + r8 + 2], dl
        sete    r10b
        and     r10b, al
        and     r10b, r9b
        cmp     byte ptr [rdi + r8 + 3], dl
        sete    al
        cmp     byte ptr [rdi + r8 + 4], dl
        sete    r9b
        and     r9b, al
        ...
```

Unfortunately, there still isn't any SIMD [output](https://godbolt.org/z/7d8bff8fK). However, the loop does get unrolled, and the compiler generates branchless code with no jump instructions. The following remarks are generated:

```shell
remark: w.zig:11:15: loop not vectorized: value that could not be identified as reduction is used outside the loop
remark: w.zig:11:15: loop not vectorized
remark: w.zig:11:15: loop not vectorized: value that could not be identified as reduction is used outside the loop
remark: w.zig:11:15: loop not vectorized
remark: <unknown>:0:0: Cannot SLP vectorize list: vectorization was impossible with available vectorization factors
remark: w.zig:12:9: Vectorized horizontal reduction with cost -17 and with tree size 3
remark: w.zig:11:15: unrolled loop by a factor of 8 with run-time trip count
```

That's a lot. What do they mean?

***The good news***

> Vectorized horizontal reduction with cost -17 and with tree size 3

This refers to a SIMD operation that reduces vector elements into a single scalar value. The `-17` indicates a profitable optimization according to LLVM’s vectorization cost model. A tree size of `3` reflects the structure of the operation’s dependency graph and `3` is its depth.

> unrolled loop by a factor of 8 with run-time trip count

This means the LLVM optimizer has applied _runtime loop unrolling_ with an unroll factor of 8 i.e. each iteration of the unrolled loop performs the work of 8 iterations of the original loop.

***The bad news***

> loop not vectorized: value that could not be identified as reduction is used outside the loop

This remark is due to something known as [Data Dependency Chain](https://cvw.cac.cornell.edu/vector/coding/data-dependencies). It prevents the compiler from generating vectorized output from the above implementation. I'll get to it soon.

>Cannot SLP vectorize list: vectorization was impossible with available vectorization factors

The `SLPVectorizer` combines similar independent instructions into vector instructions. This could not be achieved here due to the reduction pattern in the code `m = m and (item == scalar)`  as well as the dependency chain.

### Data Dependency Chain

In the current implementation there is:

```zig
m = m and (item == scalar);
```

This is a *read-after-write* dependency. It is not vectorizable because each iteration depends on the previous value of `m`. Iteration $N +1$ cannot be computed until the result of iteration $N$ is known.

A method is needed to check whether all elements of a slice are equal to a given scalar, without introducing data dependencies, and where the result of each iteration is independent of the others.


The following is a well-known vectorizable pattern that uses summation:

```zig
export fn allEqual_no_early_stop(slice: [*]const u8, len: usize, scalar: u8) bool {
    var mismatch_count: u32 = 0;
    for (slice[0..len]) |item| {
        mismatch_count += @intFromBool(item != scalar);
    }
    return mismatch_count == 0;
}
```

Here we count the number of mismatches and equate it with zero. If all the elements of the slice are equal to the scalar. The result of the operation `@intFromBool(item != scalar)` is independent of the other results of the other iterations. So, it is safe to vectorize. Looking at the compiler [output](https://godbolt.org/z/fqGP1xjbz):

```asm
.LBB0_6:
        vmovq   xmm7, qword ptr [rdi + rcx]
        vmovq   xmm8, qword ptr [rdi + rcx + 8]
        vmovq   xmm9, qword ptr [rdi + rcx + 16]
        vmovq   xmm10, qword ptr [rdi + rcx + 24]
        vpcmpeqb        xmm7, xmm7, xmm1
        vpxor   xmm7, xmm7, xmm2
        vpmovzxbd       ymm7, xmm7
        vpand   ymm7, ymm7, ymm3
        vpaddd  ymm0, ymm0, ymm7
        vpcmpeqb        xmm7, xmm8, xmm1
        vpxor   xmm7, xmm7, xmm2
        vpmovzxbd       ymm7, xmm7
        vpand   ymm7, ymm7, ymm3
        vpaddd  ymm4, ymm4, ymm7
        vpcmpeqb        xmm7, xmm9, xmm1

		...
```

We can see the [SSE](https://en.wikipedia.org/wiki/Streaming_SIMD_Extensions) registers, and hence LLVM is successfully able to vectorize the `allEqual` function.


We get the following remarks:

```
remark: w.zig:4:15: loop not vectorized: vectorization and interleaving are explicitly disabled, or the loop has already been vectorized
remark: w.zig:4:15: loop not vectorized: vectorization and interleaving are explicitly disabled, or the loop has already been vectorized
```

This remark can occur due to two reasons:

- Vectorization has been explicitly disabled using compiler flags such as `-fno-vectorize` or `-fno-unroll-loops`.
    
- The loops were already vectorized in an earlier optimization phase, so `llvm-opt` skips redundant attempts.
    

Since we did not use any such disabling flags, the remark likely results from the second reason. Indicating that the loops have already been successfully vectorized.

## Results

Benchmarking the stdlib implementation against the new implementation that triggers LLVM's auto-vectorizer. The benchmark is performed against 3 scenarios:

1. All elements of the slice match the target.
2. Only the first element does not match the target.
3. Only the last element does not match the target.


*1. All elements equal to the target*

| Method            | Median (ns) | Mean(ns) | Throughput |
| ----------------- | --------------- | ------------ | ------------ |
| `std.mem.allEqual`  | 581131          | 580878       | 7e9                  |
| `allEqual_no_early` | 192468          | 192378       | 2e10                 |


*2. Only the first element does not match the target.*

| Method            | Median(ns) | Min(ns) | Throughput |
| ----------------- | --------------- | ------------ | ------------|
| `std.mem.allEqual`  | 0               | 0            | inf                  |
| `allEqual_no_early`| 194103          | 196067       | 2e10                 |


*3. Only the last element does not match the target*

| Method            | Median(ns) | Min(ns) | Throughput |
| ----------------- | --------------- | ------------ | ------------ |
| `std.mem.allEqual`  | 557238          | 557433       | 7e9                  |
| `allEqual_no_early` | 194800          | 194474       | 2e10                 |


## Conclusion

The auto-vectorized implementation performs well only when all elements match the scalar value or the first mismatch is near the end. If there's a mismatch early on, the early-stopping version is faster. It returns as soon as a mismatch is found, while the vectorized version still scans the entire slice to count all mismatches.


## References

- [Auto-Vectorization in LLVM](https://llvm.org/docs/Vectorizers.html)
- [Cornell Virtual Workshop - Data Dependencies](https://cvw.cac.cornell.edu/vector/coding/data-dependencies)
- [Find element’s position in Rust – 9 times faster! - Nikita Sivukhin](https://sivukhin.github.io/find-slice-element-position-in-rust.html#Find-element-s-position-in-Rust-9-times-faster)
