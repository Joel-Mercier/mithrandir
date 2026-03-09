# capacity

Show system capacity and resource scores.

## Usage

```sh
mithrandir capacity
```

## Description

Displays system hardware information and capacity analysis for your homelab:

- CPU model, core count, and RAM
- Storage usage with progress bars per mount point
- Per-app performance and storage impact scores
- Aggregate capacity scores with verdicts
- Number of high-performance and high-storage apps

Each app in the registry has a performance score (CPU/RAM impact) and a storage score (disk growth), rated as Low, Medium, or High. The command aggregates these scores for installed apps and compares them against your hardware to give a verdict: Comfortable, Adequate, Tight, or Overloaded for performance, and Healthy, Moderate, Warning, or Critical for storage.

## Non-TTY Mode

When run in a non-interactive shell, outputs a plaintext table instead of the formatted display.

## Notes

- Requires root privileges for disk usage checks
- Storage projections are estimates based on typical usage patterns
- Performance scores reflect typical resource usage, not real-time measurements
