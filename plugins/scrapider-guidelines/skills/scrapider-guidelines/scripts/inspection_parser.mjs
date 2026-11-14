import { exec, execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const require = createRequire(import.meta.url);
const scripts = dirname(fileURLToPath(import.meta.url));
const platform = `${process.platform}-${process.arch}`;
const windows = process.platform === 'win32';
const npmArguments = ['ci', '--omit=dev', '--include=optional', '--ignore-scripts', '--no-audit', '--no-fund', '--loglevel=error'];
let javaParser;

function parserFiles(directory, nativeTarget) {
  const binding = join(directory, 'node_modules', '@ast-grep', 'napi');
  const native = join(directory, 'node_modules', '@ast-grep', `napi-${nativeTarget}`, `ast-grep-napi.${nativeTarget}.node`);
  const grammar = join(directory, 'node_modules', 'tree-sitter-java', 'prebuilds', platform, 'tree-sitter-java.node');
  return existsSync(join(binding, 'package.json')) && existsSync(native) && existsSync(grammar)
    ? { binding, grammar } : null;
}

async function installParser(directory) {
  const options = { cwd: directory, timeout: 60_000, windowsHide: true };
  try {
    if (windows) await promisify(exec)(`npm.cmd ${npmArguments.join(' ')}`, options);
    else await promisify(execFile)('npm', npmArguments, options);
  } catch (error) {
    if (error.killed) throw new Error('npm ci timed out');
    if (error.code === 'ENOENT' || (windows && error.code === 9009)) throw new Error('npm is unavailable');
    const npmCode = error.stderr?.match(/^npm (?:ERR!|error) code (\S+)/m)?.[1];
    throw new Error(`npm ci failed (${npmCode || error.code})`);
  }
}

export async function prepareJavaParser() {
  const nativeTarget = process.platform === 'linux'
    ? `${platform}-${process.report.getReport().header.glibcVersionRuntime ? 'gnu' : 'musl'}`
    : windows ? `${platform}-msvc` : platform;
  const local = parserFiles(scripts, nativeTarget);
  if (local) return local;

  const cacheOverride = windows ? process.env.LOCALAPPDATA : process.env.XDG_CACHE_HOME;
  const cacheBase = cacheOverride && isAbsolute(cacheOverride)
    ? cacheOverride
    : windows ? join(homedir(), 'AppData', 'Local') : join(homedir(), '.cache');
  const cache = join(cacheBase, 'scrapider-guidelines', 'inspection');
  const lock = join(scripts, 'package-lock.json');
  const version = createHash('sha256').update(readFileSync(lock)).digest('hex').slice(0, 16);
  const installed = join(cache, `${nativeTarget}-${version}`);
  const cached = parserFiles(installed, nativeTarget);
  if (cached) return cached;

  mkdirSync(cache, { recursive: true });
  const pending = mkdtempSync(join(cache, `${nativeTarget}-install-`));
  try {
    copyFileSync(join(scripts, 'package.json'), join(pending, 'package.json'));
    copyFileSync(lock, join(pending, 'package-lock.json'));
    await installParser(pending);
    if (!parserFiles(pending, nativeTarget)) throw new Error(`Java parser binaries unavailable for ${nativeTarget}`);
    try {
      // Publish only a complete install. A concurrent scan may have published the same version.
      renameSync(pending, installed);
    } catch (error) {
      const concurrent = parserFiles(installed, nativeTarget);
      if (concurrent) return concurrent;
      throw error;
    }
    return parserFiles(installed, nativeTarget);
  } finally {
    rmSync(pending, { recursive: true, force: true });
  }
}

export function parseJava(source, { binding, grammar }) {
  if (!javaParser) {
    const { parse, registerDynamicLanguage } = require(binding);
    registerDynamicLanguage({ java: { libraryPath: grammar, languageSymbol: 'tree_sitter_java', extensions: ['java'] } });
    javaParser = (text) => parse('java', text).root();
  }
  return javaParser(source);
}
