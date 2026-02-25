# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-25

### Added
- Terminal UI built with `blessed` for interactive Modbus scanning
- Modbus RTU connection support with configurable baud rate, parity, stop bits, and data bits
- Modbus TCP connection support with ping reachability check
- Function codes: Read Coils (FC 01), Read Holding Registers (FC 03), Read Input Registers (FC 04)
- Data type support: 16-bit, 32-bit, and 64-bit integers (signed/unsigned), float, and double
- Byte order / endianness patterns: ABCD, DCBA, BADC, CDAB
- Multi-setup organization with multiple connections and slaves per setup
- Batch register entry using ranges and comma-separated lists
- Persistent JSON configuration saved under a local `configs/` directory
- Keyboard-driven navigation with vi-style `h`/`l` movement
- Jest test suite covering `src/utils.js` and `src/modbus/types.js`
- `createRegister` exported from `src/modbus/types.js`

[Unreleased]: https://github.com/EmituCom/ModbusScanner/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/EmituCom/ModbusScanner/releases/tag/v1.0.0
