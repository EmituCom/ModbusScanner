'use strict';

jest.mock('fs');

describe('storage', () => {
  let storage;
  let mockFs;

  beforeEach(() => {
    jest.resetModules();
    jest.mock('fs');
    mockFs = require('fs');
    mockFs.existsSync.mockReturnValue(true); // configs dir exists by default
    storage = require('../src/storage');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- module load ---

  describe('on load', () => {
    test('creates the configs directory when it does not exist', () => {
      jest.resetModules();
      jest.mock('fs');
      const freshFs = require('fs');
      freshFs.existsSync.mockReturnValue(false);
      require('../src/storage');
      expect(freshFs.mkdirSync).toHaveBeenCalledWith('configs');
    });

    test('does not create the configs directory when it already exists', () => {
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  // --- saveConfig ---

  describe('saveConfig', () => {
    test('writes JSON to the default path', () => {
      const config = { setups: [] };
      storage.saveConfig(config);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('last-config.json'),
        JSON.stringify(config, null, 2)
      );
    });

    test('writes JSON to a named file', () => {
      const config = { setups: [] };
      storage.saveConfig(config, 'myconfig');
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('myconfig.json'),
        JSON.stringify(config, null, 2)
      );
    });

    test('appends .json extension when omitted', () => {
      storage.saveConfig({}, 'myconfig');
      const writtenPath = mockFs.writeFileSync.mock.calls[0][0];
      expect(writtenPath.endsWith('myconfig.json')).toBe(true);
    });

    test('does not double-append .json', () => {
      storage.saveConfig({}, 'myconfig.json');
      const writtenPath = mockFs.writeFileSync.mock.calls[0][0];
      expect(writtenPath).not.toContain('myconfig.json.json');
    });
  });

  // --- loadSave ---

  describe('loadSave', () => {
    test('reads and parses the default config file', () => {
      const config = { setups: [{ name: 'test' }] };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(config));
      expect(storage.loadSave()).toEqual(config);
    });

    test('reads a named config file', () => {
      mockFs.readFileSync.mockReturnValue('{}');
      storage.loadSave('myconfig');
      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('myconfig.json'),
        'utf8'
      );
    });
  });

  // --- lastSaveExists ---

  describe('lastSaveExists', () => {
    test('returns true when the last-config file exists', () => {
      mockFs.existsSync.mockReturnValue(true);
      expect(storage.lastSaveExists()).toBe(true);
    });

    test('returns false when the last-config file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      expect(storage.lastSaveExists()).toBe(false);
    });
  });

  // --- getConfigurationFiles ---

  describe('getConfigurationFiles', () => {
    test('returns only .json files', () => {
      mockFs.readdirSync.mockReturnValue(['a.json', 'b.json', 'notes.txt', '.DS_Store']);
      expect(storage.getConfigurationFiles()).toEqual(['a.json', 'b.json']);
    });

    test('returns an empty array when no .json files exist', () => {
      mockFs.readdirSync.mockReturnValue([]);
      expect(storage.getConfigurationFiles()).toEqual([]);
    });
  });
});
