# ModbusScanner

A terminal UI tool for scanning and monitoring Modbus devices over RTU (serial) and TCP connections.

## Features

- **Modbus RTU** — connect via serial port with configurable baud rate, parity, stop bits, and data bits
- **Modbus TCP** — connect via IP/hostname with ping reachability check before connecting
- **Function codes** — Read Coils (FC 01), Read Holding Registers (FC 03), Read Input Registers (FC 04)
- **Data types** — 16-bit, 32-bit, and 64-bit integers (signed/unsigned), float, and double
- **Byte order** — ABCD, DCBA, BADC, CDAB endianness patterns
- **Multi-setup** — organize connections into named setups, each with multiple slaves and registers
- **Persistent config** — configurations are saved as JSON files and reloaded on startup
- **Batch register entry** — add multiple registers at once using ranges and comma-separated lists

## Requirements

- Node.js >= 8.17.0

## Installation

```bash
git clone https://github.com/EmituCom/ModbusScanner.git
cd ModbusScanner
npm install
```

## Usage

```bash
node src/main.js
```

On first launch a welcome screen lets you create a new setup or load a previously saved configuration. Configurations are stored in a `configs/` directory in the project root.

## Keybindings

| Key | Action |
|-----|--------|
| `r` | Refresh — run a new scan |
| `a` | Add a register to the selected slave |
| `e` | Edit the selected item |
| `d` | Delete the selected item |
| `c` | Open the connection manager |
| `b` | Back — return to the welcome screen |
| `s` | Save the current configuration |
| `x` / `Space` | Toggle scan selection on a register |
| `Enter` / `→` / `l` | Expand / drill into selected item |
| `←` / `h` | Collapse selected item |
| `q` / `Ctrl+C` | Quit |

## Configuration

Configurations are JSON files saved under `configs/`. The `configs/` directory is excluded from version control via `.gitignore` so your device addresses and register maps stay local.

## License

MIT — see [LICENSE](LICENSE)
