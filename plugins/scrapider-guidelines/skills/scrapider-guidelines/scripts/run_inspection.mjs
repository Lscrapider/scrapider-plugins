#!/usr/bin/env node
import { execFile, fork } from 'node:child_process';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { parseJava, prepareJavaParser } from './inspection_parser.mjs';
import { inspectJ1J9 } from './inspection_rules_j1_j9.mjs';
import { inspectJ10J19 } from './inspection_rules_j10_j19.mjs';
import { inspectJ17, inspectPython } from './inspection_rules_j17_python.mjs';

const execute = promisify(execFile);
const maxFilesPerWorker = 10;
const maxBytesPerWorker = 128 * 1024;
const settingsNames = new Set([
  'OPT_IN', 'REQUIRE_MANAGE_LAYER', 'EXCLUDED_TYPES', 'EXCLUDED_MAPPER_NAMES',
  'EXPLICIT_UTILITY_CLASSES', 'VAGUE_NAMES', 'REQUIRE_SERVICE_JAVADOC',
  'REQUIRED_TAGS', 'REQUIRE_PARAM_FIELD_COMMENTS', 'DETECT_SILENT_SWALLOW', 'MODULE_MAP',
]);
const booleanSettings = new Set([
  'OPT_IN', 'REQUIRE_MANAGE_LAYER', 'REQUIRE_SERVICE_JAVADOC',
  'REQUIRE_PARAM_FIELD_COMMENTS', 'DETECT_SILENT_SWALLOW',
]);
const listSettings = new Set([
  'EXCLUDED_TYPES', 'EXCLUDED_MAPPER_NAMES', 'EXPLICIT_UTILITY_CLASSES', 'VAGUE_NAMES', 'REQUIRED_TAGS',
]);

function repositoryRoot(directory) {
  let current = resolve(directory);
  while (true) {
    if (existsSync(resolve(current, '.git'))) return current;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function inDirectory(directory, path) {
  const part = relative(directory, path);
  return part !== '..' && !part.startsWith(`..${sep}`) && !isAbsolute(part);
}

function displayPath(path, directory, repository) {
  const base = repository || directory;
  return inDirectory(base, path) ? relative(base, path).split(sep).join('/') : path;
}

async function changedJavaFiles(project) {
  const commands = [
    ['diff', '--relative', '--name-only', '-z', '--diff-filter=d', '--', '*.java'],
    ['diff', '--cached', '--relative', '--name-only', '-z', '--diff-filter=d', '--', '*.java'],
    ['ls-files', '--others', '--exclude-standard', '-z', '--', '*.java'],
  ];
  const output = await Promise.all(commands.map(async (args) => {
    try {
      return (await execute('git', ['-C', project, ...args], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })).stdout;
    } catch (error) {
      throw new Error(`Git file discovery failed: ${error.stderr?.trim() || error.message}`);
    }
  }));
  return [...new Set(output.flatMap((text) => text.split('\0')).filter(Boolean))]
    .filter((file) => existsSync(resolve(project, file)));
}

function inspectionSettings() {
  const settings = JSON.parse(process.env.SCRAPIDER_INSPECTION_SETTINGS || '{}');
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    throw new Error('SCRAPIDER_INSPECTION_SETTINGS must be a JSON object');
  }
  for (const [name, value] of Object.entries(settings)) {
    if (!settingsNames.has(name)) throw new Error(`Unknown inspection setting: ${name}`);
    if (booleanSettings.has(name) && typeof value !== 'boolean') {
      throw new Error(`Inspection setting ${name} must be a boolean`);
    }
    if (listSettings.has(name) && (!Array.isArray(value) || !value.every((item) => typeof item === 'string'))) {
      throw new Error(`Inspection setting ${name} must be a list of strings`);
    }
    if (name === 'MODULE_MAP' && (!value || typeof value !== 'object' || Array.isArray(value)
        || !Object.values(value).every((item) => typeof item === 'string'))) {
      throw new Error('Inspection setting MODULE_MAP must map strings to strings');
    }
  }
  return settings;
}

function lineNumber(node) {
  if (Number.isInteger(node) && node > 0) return node;
  return node?.range ? node.range().start.line + 1 : 1;
}

function cleanMessage(message) {
  return String(message).replace(/\s+/g, ' ').trim();
}

function scanChunk({ selected, directory, repository, settings, parser }) {
  const findings = [];
  const incomplete = [];
  try {
    if (selected.some((path) => path.endsWith('.java'))) parseJava('', parser);
    const sharedByProject = new Map();
    const seen = new Set();

    for (const path of selected) {
      const project = inDirectory(repository || directory, path)
        ? repository || directory : repositoryRoot(dirname(path)) || dirname(path);
      const file = relative(project, path).split(sep).join('/');
      const display = displayPath(path, directory, repository);
      if (!sharedByProject.has(project)) sharedByProject.set(project, new Map());
      const add = (target, rule, node, message) => {
        const item = { file: display, line: lineNumber(node), rule, message: cleanMessage(message), project, projectWide: rule === 'J17' && node == null };
        const key = JSON.stringify([target === incomplete, item.file, item.line, item.rule, item.message]);
        if (!seen.has(key)) {
          seen.add(key);
          target.push(item);
        }
      };
      const ctx = {
        project, file, settings, shared: sharedByProject.get(project),
        issue: (rule, node, message) => add(findings, rule, node, message),
        unresolved: (rule, node, reason) => add(incomplete, rule, node, reason),
      };
      try {
        ctx.source = readFileSync(path, 'utf8');
        if (path.endsWith('.java')) {
          ctx.root = parseJava(ctx.source, parser);
          const error = ctx.root.find({ rule: { kind: 'ERROR' } });
          const missing = ctx.root.find({ rule: { regex: '^$' } });
          if (error || (missing && missing.kind() !== 'program')) {
            ctx.unresolved('PARSE', error || missing, 'Java syntax could not be parsed completely');
          }
          for (const [rules, check] of [['J1-J9', inspectJ1J9], ['J10-J16,J18-J19', inspectJ10J19], ['J17', inspectJ17]]) {
            try {
              check(ctx);
            } catch (error) {
              ctx.unresolved(rules, null, error.message);
            }
          }
        } else if (path.endsWith('.py')) {
          inspectPython(ctx);
        } else {
          ctx.unresolved('FILE', null, 'unsupported file type');
        }
      } catch (error) {
        ctx.unresolved('FILE', null, error.message);
      }
    }
  } catch (error) {
    return { error: cleanMessage(error.message) };
  }
  return { findings, incomplete };
}

function chunksFor(selected) {
  const chunks = [];
  let chunk = [];
  let bytes = 0;
  for (const path of selected) {
    let size = 0;
    try {
      size = statSync(path).size;
    } catch {
      // A worker reports inaccessible inputs as incomplete.
    }
    if (chunk.length && (chunk.length >= maxFilesPerWorker || bytes + size > maxBytesPerWorker)) {
      chunks.push(chunk);
      chunk = [];
      bytes = 0;
    }
    chunk.push(path);
    bytes += size;
  }
  if (chunk.length) chunks.push(chunk);
  return chunks;
}

function runWorker(payload) {
  return new Promise((resolveWorker, rejectWorker) => {
    const worker = fork(fileURLToPath(import.meta.url), ['--inspection-worker'], {
      execArgv: [], stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
    });
    let result;
    let errors = '';
    worker.stderr.on('data', (chunk) => { errors += chunk.toString(); });
    worker.once('message', (message) => { result = message; });
    worker.once('error', rejectWorker);
    worker.once('exit', (code, signal) => {
      if (code === 0 && result) resolveWorker(result);
      else rejectWorker(new Error(cleanMessage(errors) || `inspection worker exited: ${signal || code}`));
    });
    worker.send(payload);
  });
}

async function runInspection(files, projectPath) {
  const findings = [];
  const incomplete = [];
  let parserError;
  try {
    const directory = realpathSync(resolve(projectPath));
    const repository = repositoryRoot(directory);
    if (files !== null && (!Array.isArray(files) || !files.every((file) => typeof file === 'string'))) {
      throw new Error('files must be an array of file paths');
    }
    if (files === null && !repository) throw new Error(`No Git repository found for ${directory}`);
    const base = files === null ? repository : directory;
    const paths = files === null ? await changedJavaFiles(repository) : files;
    const selected = [...new Set(paths.map((file) => {
      const path = resolve(base, file);
      return existsSync(path) ? realpathSync(path) : path;
    }))].sort();
    if (!selected.length) return { text: 'SKIP: no files', code: 0 };
    const settings = inspectionSettings();
    let parser;
    let scannable = selected;
    if (selected.some((path) => path.endsWith('.java'))) {
      try {
        parser = await prepareJavaParser();
      } catch (error) {
        parserError = `ERROR: Java parser setup failed (${cleanMessage(error.message)})`;
        scannable = selected.filter((path) => !path.endsWith('.java'));
      }
    }
    for (const chunk of chunksFor(scannable)) {
      let result;
      try {
        result = await runWorker({ selected: chunk, directory, repository, settings, parser });
      } catch (error) {
        for (const path of chunk) {
          incomplete.push({ file: displayPath(path, directory, repository), line: 1, rule: 'FILE', message: `worker failed: ${cleanMessage(error.message)}` });
        }
        continue;
      }
      if (result.error) {
        for (const path of chunk) {
          incomplete.push({ file: displayPath(path, directory, repository), line: 1, rule: 'FILE', message: result.error });
        }
        continue;
      }
      findings.push(...result.findings);
      incomplete.push(...result.incomplete);
    }
  } catch (error) {
    return { text: `ERROR: ${cleanMessage(error.message)}`, code: 2 };
  }
  const unique = (items) => {
    const seen = new Set();
    return items.filter((item) => {
      const key = item.projectWide
        ? JSON.stringify([item.project, item.rule, item.message])
        : JSON.stringify([item.file, item.line, item.rule, item.message]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  const uniqueFindings = unique(findings);
  const uniqueIncomplete = unique(incomplete);
  const sort = (a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.rule.localeCompare(b.rule);
  uniqueFindings.sort(sort);
  uniqueIncomplete.sort(sort);
  const render = (items, prefix = '') => {
    const groups = new Map();
    for (const item of items) {
      const key = JSON.stringify([item.file, item.rule, item.message]);
      if (!groups.has(key)) groups.set(key, { ...item, lines: [] });
      groups.get(key).lines.push(item.line);
    }
    return [...groups.values()].map(({ file, lines, rule, message }) =>
      `${prefix}${file}:${[...new Set(lines)].join(',')} [${rule}] ${message}`);
  };
  const lines = [
    ...render(uniqueFindings),
    ...render(uniqueIncomplete, 'INCOMPLETE '),
  ];
  if (parserError) lines.push(parserError);
  return { text: lines.length ? lines.join('\n') : 'PASS', code: parserError || uniqueIncomplete.length ? 2 : uniqueFindings.length ? 1 : 0 };
}

/** Inspect supplied file paths, or changed Java files when omitted. */
export async function inspect(files = null, projectPath = process.cwd()) {
  return (await runInspection(files, projectPath)).text;
}

const isMain = process.argv[1] && existsSync(process.argv[1])
  && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (isMain && process.argv[2] === '--inspection-worker' && process.send) {
  process.once('message', (payload) => {
    process.send(scanChunk(payload), () => process.disconnect());
  });
} else if (isMain) {
  try {
    const args = process.argv.slice(2);
    if (args[0] === '--help') {
      console.log('Usage: node run_inspection.mjs [file ...] | --files-stdin\nNo files: inspect changed Java files in the current Git repository.\n--files-stdin reads a JSON array of paths from standard input.');
    } else {
      if (args[0] === '--files-stdin' && args.length !== 1) throw new Error('--files-stdin cannot be combined with file arguments');
      const files = args[0] === '--files-stdin'
        ? JSON.parse(readFileSync(0, 'utf8'))
        : args.length ? (args[0] === '--' ? args.slice(1) : args) : null;
      const result = await runInspection(files, process.cwd());
      console.log(result.text);
      process.exitCode = result.code;
    }
  } catch (error) {
    console.log(`ERROR: ${cleanMessage(error.message)}`);
    process.exitCode = 2;
  }
}
