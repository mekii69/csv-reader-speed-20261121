# csv-reader-speed-20261121

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/mekii69/csv-reader-speed-20261121/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/mekii69/csv-reader-speed-20261121/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A fast, dependency-free CSV reader that returns exactly csv-reader 1.0.0's answers for broken CSV files — the same `{columns, rows, errors}`, including its stray-CR, unterminated-quote, quote-junk, short-row and long-row errors — read with bulk scans instead of one character at a time.

## Run it

```sh
MAKEFUN_INPUT_DIR=./in MAKEFUN_OUTPUT_DIR=./out node main.ts
```

`main.ts` reads `cases.json` from the input directory, answers every case with `run()` from `solve.js`, and writes `answers.json` to the output directory.

---

<sub>Entered on [make.fun](https://make.fun/?ref=9zhm5f8f&utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>
