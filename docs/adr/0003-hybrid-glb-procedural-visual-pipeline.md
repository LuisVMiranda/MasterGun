# ADR 0003: Hybrid GLB And Procedural Visual Pipeline

## Status

Accepted. The procedural production rollout was approved on 2026-07-13; authored GLBs remain a future enhancement.

## Context

Master Gun currently builds gameplay visuals from Three.js primitives. This keeps the project local, lightweight, and robust, but limits the silhouette and animation quality available for weapons and human characters. Gates, walls, pickups, damage states, and transient effects remain better suited to deterministic procedural construction.

## Decision

Use a hybrid pipeline:

- Approved procedural weapons and armored operators are the production baseline.
- Repository-owned Blender scripts may later replace those baselines with compact GLBs through the same asset contracts.
- Gates, walls, pickups, contact shadows, projectile pools, and transient effects remain JavaScript/Three.js assets.
- Runtime GLBs are loaded through Three.js `GLTFLoader` and cloned through `SkeletonUtils`.
- Every GLB has a procedural fallback and a manifest contract for bounds, sockets, animations, LOD, triangle count, material count, and payload size.
- Blender is a development-only tool. Browsers and players require only committed GLBs.
- The Art Lab is development-only and must approve any later family replacement before it reaches production.

## Consequences

The game gains higher-fidelity silhouettes now and preserves a path to future skeletal animation without making Blender a runtime dependency. Production asset factories own the approved procedural models, sockets, deterministic damage states, effects, and instanced LODs. A later GLB rollout must validate dimensions, animations, file size, and fallback behavior against those contracts.

## Commands

- `pnpm art:build` generates original runtime GLBs when Blender is available.
- `pnpm art:validate` validates contracts and reports pending prototype GLBs.
- `pnpm art:validate:strict` fails when any required GLB is absent.
