import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { homedir } from 'node:os';

const TIER_BY_TOKEN = Object.freeze({
  bootstrap: 'bootstrap', app: 'bootstrap', application: 'bootstrap',
  business: 'business', biz: 'business',
  foundation: 'shared', shared: 'shared', common: 'shared', core: 'shared',
  persistence: 'persistence', db: 'persistence', mapper: 'persistence',
  model: 'model', entity: 'model',
});

const BANNED_TIERS = Object.freeze({
  model: new Set(['business', 'bootstrap', 'persistence', 'shared']),
  persistence: new Set(['business', 'bootstrap']),
  shared: new Set(['business', 'bootstrap']),
  business: new Set(['bootstrap']),
});

const CLASS_KINDS = new Set([
  'class_declaration', 'interface_declaration', 'enum_declaration',
  'annotation_type_declaration', 'record_declaration',
]);
const DB_ACCESS_EXCLUSIONS = new Set(['ObjectMapper']);
const DEFAULT_VAGUE_NAMES = new Set(['common', 'utils', 'util', 'helpers', 'helper', 'misc']);
const MODULE_CACHE_PREFIX = 'scrapider:inspection-rules-j17-python:maven:v1:';

function normalizePath(path) {
  return String(path || '').split(sep).join('/').replace(/^\.\//, '');
}

function pathInside(parent, child) {
  const value = relative(resolve(parent), resolve(child));
  return value === '' || (value !== '..' && !value.startsWith(`..${sep}`) && !isAbsolute(value));
}

function directChildren(node, kind) {
  if (!node) return [];
  return node.namedChildren().filter((child) => !kind || child.kind() === kind);
}

function directChild(node, kind) {
  return directChildren(node, kind)[0] || null;
}

function field(node, name) {
  return node ? node.field(name) || null : null;
}

function nodeText(node) {
  return node ? node.text() || '' : '';
}

function rootPackage(root) {
  const declaration = directChild(root, 'package_declaration');
  if (!declaration) return '';
  const name = directChildren(declaration).find((child) =>
    ['identifier', 'scoped_identifier'].includes(child.kind()));
  return nodeText(name);
}

function parseImport(node) {
  const isStatic = node.children().some((child) => child.kind() === 'static');
  const imported = nodeText(node).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\r\n]*/g, '')
    .replace(/\s+/g, '').replace(/^import/, '').replace(/;$/, '');
  return isStatic ? imported.replace(/^static/, '') : imported;
}

function tierFromTokens(tokens) {
  const hits = tokens.map((token, index) => TIER_BY_TOKEN[token] ? [index, TIER_BY_TOKEN[token]] : null)
    .filter(Boolean);
  if (!hits.length) return null;
  const preferred = hits.find(([, tier]) => tier === 'bootstrap')
    || hits.find(([, tier]) => tier === 'business');
  return (preferred || hits[hits.length - 1])[1];
}

function tierForModuleName(name) {
  return tierFromTokens(String(name || '').toLowerCase().split(/[-_.]/).filter(Boolean));
}

function tierFromPackage(pkg) {
  return tierFromTokens(String(pkg || '').toLowerCase().split('.').filter(Boolean));
}

function moduleMapSetting(settings) {
  const value = settings?.MODULE_MAP;
  if (value === undefined) return { map: {}, error: null };
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || !Object.entries(value).every(([prefix, tier]) => prefix && typeof tier === 'string')) {
    return { map: {}, error: 'MODULE_MAP must be a map of non-empty package prefixes to tier names.' };
  }
  const valid = new Set(['bootstrap', 'business', 'shared', 'persistence', 'model']);
  const invalid = Object.entries(value).find(([, tier]) => !valid.has(tier));
  if (invalid) return { map: {}, error: `MODULE_MAP assigns unsupported tier "${invalid[1]}".` };
  return { map: value, error: null };
}

function tierForFile(pkg, moduleName, moduleMap) {
  for (const [prefix, tier] of Object.entries(moduleMap)) {
    if (pkg.startsWith(prefix)) return tier;
  }
  return tierForModuleName(moduleName) || tierFromPackage(pkg);
}

function rootPackagePrefix(pkg) {
  const segments = String(pkg || '').toLowerCase().split('.').filter(Boolean);
  const index = segments.findIndex((segment) => Object.hasOwn(TIER_BY_TOKEN, segment));
  return index > 0 ? `${segments.slice(0, index).join('.')}.` : null;
}

function getNameNode(typeNode) {
  return field(typeNode, 'name') || directChildren(typeNode, 'identifier')[0] || typeNode;
}

function annotationNames(typeNode) {
  const modifiers = directChild(typeNode, 'modifiers');
  if (!modifiers) return [];
  return directChildren(modifiers).filter((child) =>
    child.kind() === 'annotation' || child.kind() === 'marker_annotation')
    .map((annotation) => ({ node: annotation, name: nodeText(field(annotation, 'name')) }))
    .filter(({ name }) => name);
}

function resolveAnnotation(annotation, target, imports) {
  const simple = target.slice(target.lastIndexOf('.') + 1);
  if (annotation.name === target) return 'yes';
  if (annotation.name !== simple) return 'no';
  const explicit = imports.filter((item) => item !== `${target.slice(0, target.lastIndexOf('.'))}.*`
    && item.endsWith(`.${simple}`));
  if (explicit.length) return explicit.includes(target) ? 'yes' : 'no';
  const wildcard = `${target.slice(0, target.lastIndexOf('.'))}.*`;
  if (imports.includes(wildcard)) return 'yes';
  return 'unknown';
}

function emitOnce(ctx, meta, kind, key, node, message) {
  const id = `${kind}:${key}`;
  if (meta.reported.has(id)) return;
  meta.reported.add(id);
  if (kind === 'unresolved') ctx.unresolved('J17', node, message);
  else ctx.issue('J17', node, message);
}

function xmlDecode(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (whole, entity) => {
    const lower = entity.toLowerCase();
    if (lower === 'amp') return '&';
    if (lower === 'lt') return '<';
    if (lower === 'gt') return '>';
    if (lower === 'quot') return '"';
    if (lower === 'apos') return "'";
    if (lower.startsWith('#x')) return String.fromCodePoint(Number.parseInt(lower.slice(2), 16));
    if (lower.startsWith('#')) return String.fromCodePoint(Number.parseInt(lower.slice(1), 10));
    return whole;
  });
}

function parsePomXml(source) {
  const document = { name: '#document', qualifiedName: '#document', children: [], parts: [] };
  const stack = [document];
  let index = 0;
  const appendText = (text, decode = true) => {
    if (text) stack[stack.length - 1].parts.push(decode ? xmlDecode(text) : text);
  };
  const tagEnd = (start) => {
    let quote = null;
    let brackets = 0;
    for (let cursor = start + 1; cursor < source.length; cursor++) {
      const char = source[cursor];
      if (quote) {
        if (char === quote) quote = null;
      } else if (char === '"' || char === "'") quote = char;
      else if (char === '[') brackets++;
      else if (char === ']') brackets = Math.max(0, brackets - 1);
      else if (char === '>' && brackets === 0) return cursor;
    }
    return -1;
  };

  while (index < source.length) {
    if (source.startsWith('<!--', index)) {
      const end = source.indexOf('-->', index + 4);
      if (end < 0) throw new Error('unterminated XML comment');
      index = end + 3;
      continue;
    }
    if (source.startsWith('<![CDATA[', index)) {
      const end = source.indexOf(']]>', index + 9);
      if (end < 0) throw new Error('unterminated XML CDATA');
      appendText(source.slice(index + 9, end), false);
      index = end + 3;
      continue;
    }
    if (source.startsWith('<?', index)) {
      const end = source.indexOf('?>', index + 2);
      if (end < 0) throw new Error('unterminated XML processing instruction');
      index = end + 2;
      continue;
    }
    if (source[index] !== '<') {
      const end = source.indexOf('<', index);
      appendText(source.slice(index, end < 0 ? source.length : end));
      index = end < 0 ? source.length : end;
      continue;
    }

    const end = tagEnd(index);
    if (end < 0) throw new Error('unterminated XML tag');
    const inside = source.slice(index + 1, end).trim();
    index = end + 1;
    if (!inside || inside.startsWith('!')) continue;
    if (inside.startsWith('/')) {
      const closing = inside.slice(1).trim();
      const open = stack.pop();
      if (!open || open === document || open.qualifiedName !== closing) {
        throw new Error(`mismatched XML closing tag ${closing}`);
      }
      continue;
    }

    const selfClosing = /\/$/.test(inside);
    const qualifiedName = inside.replace(/\/$/, '').trim().split(/\s/, 1)[0];
    if (!/^[A-Za-z_][\w:.-]*$/.test(qualifiedName)) throw new Error('invalid XML element name');
    const node = {
      qualifiedName,
      name: qualifiedName.split(':').at(-1),
      children: [],
      parts: [],
    };
    const parent = stack[stack.length - 1];
    parent.children.push(node);
    parent.parts.push(node);
    if (!selfClosing) stack.push(node);
  }

  if (stack.length !== 1) throw new Error(`unclosed XML element ${stack[stack.length - 1].name}`);
  return document;
}

function xmlChildren(node, name) {
  return (node?.children || []).filter((child) => child.name === name);
}

function xmlChild(node, name) {
  return xmlChildren(node, name)[0] || null;
}

function xmlText(node) {
  if (!node) return '';
  return node.parts.map((part) => typeof part === 'string' ? part : xmlText(part)).join('');
}

function xmlChildText(node, name) {
  return xmlText(xmlChild(node, name)).trim();
}

function pomLabel(project, file) {
  if (pathInside(project, file)) return normalizePath(relative(project, file)) || 'pom.xml';
  return '[cached parent POM]';
}

function pomInfo(file, project) {
  const source = readFileSync(file, 'utf8');
  const document = parsePomXml(source);
  const projectNode = xmlChild(document, 'project');
  if (!projectNode) throw new Error('pom.xml has no <project> root element');
  const parentNode = xmlChild(projectNode, 'parent');
  const propertiesNode = xmlChild(projectNode, 'properties');
  const properties = {};
  for (const property of propertiesNode?.children || []) {
    properties[property.name] = xmlText(property).trim();
  }
  const dependencies = xmlChildren(xmlChild(projectNode, 'dependencies'), 'dependency').map((dep) => ({
    group: xmlChildText(dep, 'groupId'),
    artifact: xmlChildText(dep, 'artifactId'),
  }));
  const profiles = xmlChildren(xmlChild(projectNode, 'profiles'), 'profile');
  const profileModules = profiles.some((profile) => xmlChildren(xmlChild(profile, 'modules'), 'module').length > 0);
  const profileDependencies = profiles.some((profile) =>
    xmlChildren(xmlChild(profile, 'dependencies'), 'dependency').length > 0);

  return {
    file: resolve(file),
    dir: dirname(resolve(file)),
    relDir: pathInside(project, file) ? normalizePath(relative(project, dirname(resolve(file)))) : '[cached parent POM]',
    modules: xmlChildren(xmlChild(projectNode, 'modules'), 'module').map((module) => xmlText(module).trim()),
    rawGroup: xmlChildText(projectNode, 'groupId'),
    rawArtifact: xmlChildText(projectNode, 'artifactId'),
    rawVersion: xmlChildText(projectNode, 'version'),
    rawPackaging: xmlChildText(projectNode, 'packaging') || 'jar',
    properties,
    parent: parentNode ? {
      group: xmlChildText(parentNode, 'groupId'),
      artifact: xmlChildText(parentNode, 'artifactId'),
      version: xmlChildText(parentNode, 'version'),
      relativePath: xmlChild(parentNode, 'relativePath')
        ? xmlText(xmlChild(parentNode, 'relativePath')).trim() : '../pom.xml',
      hasRelativePath: Boolean(xmlChild(parentNode, 'relativePath')),
    } : null,
    dependencies,
    hasProfiles: profiles.length > 0,
    profileModules,
    profileDependencies,
    parentState: 'unchecked',
    parentInfo: null,
    model: null,
  };
}

function cachedPom(file, project, pomCache, reasons) {
  const path = resolve(file);
  if (pomCache.has(path)) return pomCache.get(path);
  let info;
  try { info = pomInfo(path, project); }
  catch (error) {
    reasons.add(`Cannot parse ${pomLabel(project, path)}: ${error.message}.`);
    return null;
  }
  pomCache.set(path, info);
  return info;
}

function cachedExternalParent(info, project, pomCache, reasons) {
  if (!info.parent?.group || !info.parent.artifact || !info.parent.version) return null;
  const builtins = {
    'project.groupId': info.rawGroup, 'pom.groupId': info.rawGroup,
    'project.artifactId': info.rawArtifact, 'pom.artifactId': info.rawArtifact,
    'project.version': info.rawVersion, 'pom.version': info.rawVersion,
    'project.basedir': info.dir, 'pom.basedir': info.dir, basedir: info.dir,
  };
  const context = `Maven parent for ${pomLabel(project, info.file)}`;
  const group = interpolate(info.parent.group, info.properties, builtins, reasons, `${context} groupId`);
  const artifact = interpolate(info.parent.artifact, info.properties, builtins, reasons, `${context} artifactId`);
  const version = interpolate(info.parent.version, info.properties, builtins, reasons, `${context} version`);
  if (!group || !artifact || !version
      || !/^[A-Za-z0-9_.-]+$/.test(group) || !/^[A-Za-z0-9_.-]+$/.test(artifact)
      || !/^[A-Za-z0-9_.+-]+$/.test(version)) return null;
  const repository = resolve(homedir(), '.m2', 'repository');
  const groupPath = group.split('.').join(sep);
  const parentPom = resolve(repository, groupPath, artifact, version, `${artifact}-${version}.pom`);
  if (!pathInside(repository, parentPom) || !existsSync(parentPom)) return null;
  return cachedPom(parentPom, project, pomCache, reasons);
}

function resolveParent(info, project, pomCache, reasons) {
  if (!info.parent) return null;
  if (info.parentState !== 'unchecked') return info.parentInfo;
  info.parentState = 'unknown';
  let relativePathValue = info.parent.relativePath;
  if (relativePathValue && !/\$\{[^}]+\}/.test(relativePathValue)) {
    let path = resolve(info.dir, relativePathValue);
    try {
      if (existsSync(path) && !path.toLowerCase().endsWith('.xml')) path = resolve(path, 'pom.xml');
    } catch { /* converted to an unresolved relation below */ }
    if (pathInside(project, path) && existsSync(path)) {
      const parentInfo = cachedPom(path, project, pomCache, reasons);
      if (parentInfo) {
        info.parentState = 'local';
        info.parentInfo = parentInfo;
        return parentInfo;
      }
    } else if (!pathInside(project, path) && existsSync(path)) {
      reasons.add(`Maven parent path for ${pomLabel(project, info.file)} is outside the project.`);
    }
  } else if (relativePathValue) {
    reasons.add(`Unresolved Maven parent path in ${pomLabel(project, info.file)}.`);
  }

  const parentInfo = cachedExternalParent(info, project, pomCache, reasons);
  if (parentInfo) {
    info.parentState = 'cached';
    info.parentInfo = parentInfo;
    return parentInfo;
  }
  info.parentState = 'external';
  return null;
}

function interpolate(raw, props, builtins, reasons, context) {
  let value = String(raw ?? '');
  const resolveOne = (input, trail, depth) => {
    if (depth > 12) {
      reasons.add(`${context}: recursive Maven property.`);
      return null;
    }
    let failed = false;
    const expanded = input.replace(/\$\{([^}]+)\}/g, (match, key) => {
      let replacement;
      if (Object.hasOwn(builtins, key)) replacement = builtins[key];
      else if (Object.hasOwn(props, key) && !trail.has(key)) {
        replacement = resolveOne(props[key], new Set([...trail, key]), depth + 1);
      }
      if (replacement === undefined || replacement === null || String(replacement).includes('${')) {
        failed = true;
        return match;
      }
      return String(replacement);
    });
    if (failed) return null;
    return expanded;
  };
  value = resolveOne(value, new Set(), 0);
  if (value === null || /\$\{[^}]+\}/.test(value)) {
    reasons.add(`${context}: unresolved Maven property.`);
    return null;
  }
  return value;
}

function effectiveModel(info, project, pomCache, reasons, modeling = new Set()) {
  if (!info) return null;
  if (info.model) return info.model;
  if (modeling.has(info.file)) {
    reasons.add(`Maven parent cycle reaches ${pomLabel(project, info.file)}.`);
    return null;
  }
  modeling.add(info.file);
  const parentInfo = resolveParent(info, project, pomCache, reasons);
  const parentModel = parentInfo ? effectiveModel(parentInfo, project, pomCache, reasons, modeling) : null;
  const props = { ...(parentModel?.properties || {}), ...info.properties };
  const parentGroup = parentModel?.group || info.parent?.group || '';
  const parentArtifact = parentModel?.artifact || info.parent?.artifact || '';
  const parentVersion = parentModel?.version || info.parent?.version || '';
  const basedir = info.dir;
  const builtins = {
    'project.basedir': basedir, 'pom.basedir': basedir, basedir,
    'project.parent.groupId': parentGroup, 'pom.parent.groupId': parentGroup,
    'project.parent.artifactId': parentArtifact, 'pom.parent.artifactId': parentArtifact,
    'project.parent.version': parentVersion, 'pom.parent.version': parentVersion,
  };
  const rawGroup = info.rawGroup || parentGroup;
  const rawArtifact = info.rawArtifact;
  const rawVersion = info.rawVersion || parentVersion;
  const group = interpolate(rawGroup, props, builtins, reasons,
    `Maven groupId in ${pomLabel(project, info.file)}`);
  const artifact = interpolate(rawArtifact, props, builtins, reasons,
    `Maven artifactId in ${pomLabel(project, info.file)}`);
  const version = rawVersion ? interpolate(rawVersion, props, builtins, reasons,
    `Maven version in ${pomLabel(project, info.file)}`) : null;
  const finalBuiltins = {
    ...builtins,
    'project.groupId': group || '', 'pom.groupId': group || '',
    'project.artifactId': artifact || '', 'pom.artifactId': artifact || '',
    'project.version': version || '', 'pom.version': version || '',
  };
  const packaging = interpolate(info.rawPackaging, props, finalBuiltins, reasons,
    `Maven packaging in ${pomLabel(project, info.file)}`);
  if (!group || !artifact) reasons.add(`Missing Maven coordinates in ${pomLabel(project, info.file)}.`);
  info.model = { group, artifact, version, packaging: packaging || info.rawPackaging, properties: props, builtins: finalBuiltins };
  modeling.delete(info.file);
  return info.model;
}

function resolvePomValue(raw, info, project, pomCache, reasons, label) {
  const model = effectiveModel(info, project, pomCache, reasons);
  if (!model) return null;
  return interpolate(raw, model.properties, model.builtins, reasons, label);
}

function collectGradleDescriptors(project, file) {
  const paths = [];
  const projectDir = resolve(project);
  const filePath = resolve(projectDir, file || '.');
  if (!pathInside(projectDir, filePath)) return paths;
  let directory = dirname(filePath);
  const candidates = new Set([projectDir]);
  while (pathInside(projectDir, directory)) {
    candidates.add(directory);
    if (directory === projectDir) break;
    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  for (const candidate of candidates) {
    for (const name of ['settings.gradle', 'settings.gradle.kts', 'build.gradle', 'build.gradle.kts']) {
      const path = resolve(candidate, name);
      if (existsSync(path)) paths.push(normalizePath(relative(projectDir, path)));
    }
  }
  return [...new Set(paths)].sort();
}

function buildMavenMetadata(projectPath) {
  const project = resolve(projectPath);
  const reasons = new Set();
  const pomCache = new Map();
  const rootPom = resolve(project, 'pom.xml');
  const meta = {
    project,
    mode: 'none',
    rootPom,
    modules: [],
    moduleByDir: new Map(),
    moduleByGa: new Map(),
    reasons,
    reported: new Set(),
    moduleDiscoveryIncomplete: false,
  };
  if (!existsSync(rootPom)) return meta;

  const root = cachedPom(rootPom, project, pomCache, reasons);
  if (!root) {
    meta.mode = 'unknown';
    meta.moduleDiscoveryIncomplete = true;
    return meta;
  }
  effectiveModel(root, project, pomCache, reasons);
  const rootHasModules = root.modules.length > 0;
  if (!rootHasModules && !root.profileModules) {
    meta.mode = 'single';
    return meta;
  }

  meta.mode = 'multi';
  const visited = new Set();
  const walk = (info) => {
    if (!info) return;
    if (visited.has(info.file)) {
      reasons.add(`Maven <modules> contains a cycle or duplicate at ${normalizePath(relative(project, info.file))}.`);
      meta.moduleDiscoveryIncomplete = true;
      return;
    }
    visited.add(info.file);
    const model = effectiveModel(info, project, pomCache, reasons);
    if (info.hasProfiles) {
      reasons.add(`Maven profiles are active-unknown in ${normalizePath(relative(project, info.file))}.`);
    }
    if (info.profileModules) {
      reasons.add(`Profile modules are unresolved in ${normalizePath(relative(project, info.file))}.`);
      meta.moduleDiscoveryIncomplete = true;
    }
    if (info.hasProfiles && info.modules.length) meta.moduleDiscoveryIncomplete = true;
    for (const rawModule of info.modules) {
      const expanded = resolvePomValue(rawModule, info, project, pomCache, reasons,
        `Maven module path in ${normalizePath(relative(project, info.file))}`);
      if (expanded === null) {
        meta.moduleDiscoveryIncomplete = true;
        continue;
      }
      if (!expanded) {
        reasons.add(`Maven <module> in ${normalizePath(relative(project, info.file))} has an empty path.`);
        meta.moduleDiscoveryIncomplete = true;
        continue;
      }
      let modulePath = resolve(info.dir, expanded);
      if (isAbsolute(expanded)) modulePath = resolve(expanded);
      let childPom = modulePath.toLowerCase().endsWith('.xml') ? modulePath : resolve(modulePath, 'pom.xml');
      if (!pathInside(project, childPom)) {
        reasons.add(`Maven module "${rawModule}" escapes the selected project.`);
        meta.moduleDiscoveryIncomplete = true;
        continue;
      }
      if (!existsSync(childPom)) {
        reasons.add(`Maven module "${rawModule}" lacks pom.xml.`);
        meta.moduleDiscoveryIncomplete = true;
        continue;
      }
      const child = cachedPom(childPom, project, pomCache, reasons);
      if (!child) meta.moduleDiscoveryIncomplete = true;
      if (child) walk(child);
    }

    if (model && model.packaging !== 'pom') {
      const moduleName = model.artifact || basename(info.dir);
      const record = {
        dir: resolve(info.dir),
        relDir: normalizePath(relative(project, info.dir)),
        name: moduleName,
        group: model.group,
        artifact: model.artifact,
        dependencies: [],
        pom: info,
      };
      if (meta.moduleByDir.has(record.dir)) {
        reasons.add(`More than one Maven artifact module maps to ${record.relDir || '.'}.`);
      } else {
        meta.moduleByDir.set(record.dir, record);
        meta.modules.push(record);
      }
    }
  };
  walk(root);

  const modelModules = meta.modules.filter((module) => module.group && module.artifact);
  for (const module of modelModules) {
    const ga = `${module.group}\u0000${module.artifact}`;
    const matches = meta.moduleByGa.get(ga) || [];
    matches.push(module);
    meta.moduleByGa.set(ga, matches);
  }
  for (const [ga, matches] of meta.moduleByGa) {
    if (matches.length > 1) {
      reasons.add(`Maven reactor contains duplicate groupId/artifactId coordinates (${ga.replace('\u0000', ':')}); module dependencies cannot be mapped uniquely.`);
    }
  }

  for (const module of meta.modules) {
    const chain = [];
    const seenParents = new Set();
    let info = module.pom;
    while (info && !seenParents.has(info.file)) {
      seenParents.add(info.file);
      chain.push(info);
      const parent = resolveParent(info, project, pomCache, reasons);
      if (info.parent && !parent && info.parentState === 'external') {
        const coordinate = `${info.parent.group || '?'}:${info.parent.artifact || '?'}:${info.parent.version || '?'}`;
        reasons.add(`Uncached parent ${coordinate}; inherited dependencies unknown.`);
      }
      if (info !== module.pom && (info.profileDependencies || info.profileModules)) {
        reasons.add(`Maven parent profiles may change dependencies in ${pomLabel(project, info.file)}.`);
      }
      info = parent;
    }
    for (const owner of chain) {
      for (const dep of owner.dependencies) {
        if (!dep.group || !dep.artifact) {
          reasons.add(`Missing dependency coordinates in ${pomLabel(project, owner.file)}.`);
          continue;
        }
        const group = resolvePomValue(dep.group, module.pom, project, pomCache, reasons,
          `Maven dependency groupId in ${module.relDir || '.'}`);
        const artifact = resolvePomValue(dep.artifact, module.pom, project, pomCache, reasons,
          `Maven dependency artifactId in ${module.relDir || '.'}`);
        if (group === null || artifact === null) continue;
        const ga = `${group}\u0000${artifact}`;
        const targets = meta.moduleByGa.get(ga) || [];
        if (targets.length === 1) module.dependencies.push(targets[0]);
        else if (targets.length > 1) {
          reasons.add(`Maven dependency ${group}:${artifact} in ${module.relDir || '.'} maps to multiple reactor modules.`);
        }
      }
    }
    module.dependencies = [...new Set(module.dependencies)];
    module.pom = { file: module.pom.file, relDir: module.pom.relDir };
  }

  return meta;
}

function projectMetadata(ctx, mavenRoot = ctx.project) {
  const project = resolve(mavenRoot);
  const key = `${MODULE_CACHE_PREFIX}${resolve(ctx.project)}:${project}`;
  const cache = ctx.shared;
  if (cache instanceof Map) {
    if (cache.has(key)) return cache.get(key);
    const value = buildMavenMetadata(project);
    cache.set(key, value);
    return value;
  }
  return buildMavenMetadata(project);
}

function moduleForFile(meta, absoluteFile) {
  return meta.modules.filter((module) => pathInside(module.dir, absoluteFile))
    .sort((left, right) => right.dir.length - left.dir.length)[0] || null;
}

function ancestorPomFiles(project, absoluteFile) {
  if (!pathInside(project, absoluteFile)) return [];
  const directories = [];
  let directory = dirname(absoluteFile);
  while (pathInside(project, directory)) {
    directories.push(directory);
    if (directory === project) break;
    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  return directories.reverse().map((path) => resolve(path, 'pom.xml')).filter(existsSync);
}

function metadataForFile(ctx) {
  const project = resolve(ctx.project);
  const absoluteFile = resolve(project, ctx.file);
  const roots = ancestorPomFiles(project, absoluteFile);
  if (!roots.length) return { meta: projectMetadata(ctx, project), module: null, selectionReason: null };

  const candidates = roots.map((pom) => {
    const meta = projectMetadata(ctx, dirname(pom));
    return { meta, module: moduleForFile(meta, absoluteFile) };
  });
  const reactorIndex = candidates.findIndex(({ meta, module }) => meta.mode === 'multi' && module);
  if (reactorIndex >= 0) {
    const selected = candidates[reactorIndex];
    const selectionReasons = candidates.slice(0, reactorIndex).flatMap(({ meta }) => {
      if (meta.mode === 'unknown') return [`Outer Maven POM ${relative(project, meta.rootPom) || 'pom.xml'} is unreadable; reactor ownership is uncertain.`];
      if (meta.mode === 'multi' && meta.moduleDiscoveryIncomplete) {
        return [`Outer Maven reactor ${relative(project, meta.project) || '.'} has unresolved module paths.`];
      }
      return [];
    });
    return { ...selected, selectionReasons, absoluteFile };
  }

  const uncertain = candidates.find(({ meta }) => meta.mode === 'unknown'
    || (meta.mode === 'multi' && meta.moduleDiscoveryIncomplete));
  if (uncertain) {
    const root = normalizePath(relative(project, uncertain.meta.project)) || '.';
    return {
      ...uncertain,
      absoluteFile,
      selectionReason: `Cannot determine Maven reactor for ${normalizePath(relative(project, absoluteFile))}; inspect ${root}.`,
    };
  }

  const single = [...candidates].reverse().find(({ meta }) => meta.mode === 'single');
  if (single) return { ...single, absoluteFile, selectionReason: null };

  const multi = candidates.find(({ meta }) => meta.mode === 'multi');
  if (multi) {
    return {
      ...multi,
      absoluteFile,
      selectionReason: `No static Maven module contains ${normalizePath(relative(project, absoluteFile))}.`,
    };
  }
  return { meta: projectMetadata(ctx, project), module: null, absoluteFile, selectionReason: null };
}

function reportMetadataReasons(ctx, meta) {
  for (const reason of meta.reasons) emitOnce(ctx, meta, 'unresolved', reason, null, reason);
}

function inspectGradle(ctx, meta, descriptors) {
  if (!descriptors.length) return false;
  const reason = `Gradle dependency graph unavailable (${descriptors.join(', ')})`;
  emitOnce(ctx, meta, 'unresolved', `gradle:${descriptors.join(',')}`, null, reason);
  return true;
}

function checkJ17Graph(ctx, meta, module, sourceTier) {
  if (!module || !sourceTier) return;
  const banned = BANNED_TIERS[sourceTier] || new Set();
  for (const target of module.dependencies) {
    const targetTier = tierForModuleName(target.name);
    const key = `${module.relDir}->${target.relDir}:${sourceTier}`;
    if (!targetTier) {
      emitOnce(ctx, meta, 'unresolved', `edge-tier:${key}`,
        null, `Unknown target tier for ${target.name}; artifactId has no J17 role token.`);
      continue;
    }
    if (banned.has(targetTier)) {
      emitOnce(ctx, meta, 'issue', `edge:${key}`, null,
        `module ${module.name} (${sourceTier}) depends on ${target.name} (${targetTier})`);
    }
  }
}

export function inspectJ17(ctx) {
  const project = resolve(ctx.project);
  const file = normalizePath(ctx.file);
  if (!file.endsWith('.java')) return;

  const selection = metadataForFile(ctx);
  const { meta, module, selectionReason, selectionReasons = [] } = selection;
  const gradle = collectGradleDescriptors(project, file);
  const hasGradle = inspectGradle(ctx, meta, gradle);
  for (const reason of selectionReasons) {
    emitOnce(ctx, meta, 'unresolved', `selection:${reason}`, null, reason);
  }
  if (selectionReason) {
    emitOnce(ctx, meta, 'unresolved', `selection:${file}`, null, selectionReason);
  }
  if (meta.mode === 'single') return;
  if (meta.mode === 'none') {
    if (hasGradle) return;
    return;
  }
  reportMetadataReasons(ctx, meta);

  const pkg = rootPackage(ctx.root);
  const settings = ctx.settings || {};
  const { map: moduleMap, error: mapError } = moduleMapSetting(settings);
  if (mapError) emitOnce(ctx, meta, 'unresolved', 'settings:module-map', null, mapError);
  const moduleName = module?.name || '';
  const tier = tierForFile(pkg, moduleName, moduleMap);
  if (!tier) {
    const location = module?.relDir || file;
    emitOnce(ctx, meta, 'unresolved', `source-tier:${location}`,
      null, `Unknown J17 tier for ${moduleName || location}; set MODULE_MAP.`);
    return;
  }

  const root = ctx.root;
  if (!root) {
    emitOnce(ctx, meta, 'unresolved', `ast:${file}`, null,
      `No Java AST for ${file}; J17 source checks skipped.`);
    return;
  }

  const importNodes = directChildren(root, 'import_declaration');
  const imports = importNodes.map(parseImport);
  const prefix = rootPackagePrefix(pkg);
  if (prefix) {
    const banned = BANNED_TIERS[tier] || new Set();
    for (const importNode of importNodes) {
      const imported = parseImport(importNode);
      const hit = [...banned].find((bannedTier) => imported.startsWith(`${prefix}${bannedTier}.`));
      if (hit) ctx.issue('J17', importNode, `${tier} tier imports ${hit} package: ${imported}`);
    }
  }

  const exclusions = Array.isArray(settings.EXCLUDED_MAPPER_NAMES)
    && settings.EXCLUDED_MAPPER_NAMES.every((item) => typeof item === 'string')
    ? new Set(settings.EXCLUDED_MAPPER_NAMES) : new Set(DB_ACCESS_EXCLUSIONS);
  for (const typeNode of directChildren(root).filter((child) => CLASS_KINDS.has(child.kind()))) {
    const nameNode = getNameNode(typeNode);
    const name = nodeText(nameNode);
    if (!name) continue;
    const dbAccess = !exclusions.has(name) && (name.endsWith('Mapper') || name.endsWith('Manage'));
    const annotations = annotationNames(typeNode);
    const annotationState = (target) => {
      const matching = annotations.map((annotation) => ({
        annotation,
        state: resolveAnnotation(annotation, target, imports),
      })).filter(({ state }) => state !== 'no');
      if (matching.some(({ state }) => state === 'yes')) return true;
      if (matching.length) {
        for (const { annotation } of matching) {
          emitOnce(ctx, meta, 'unresolved', `annotation:${file}:${annotation.name}`,
            annotation.node, `Cannot resolve @${annotation.name} to its Spring type.`);
        }
      }
      return false;
    };
    const web = annotationState('org.springframework.web.bind.annotation.RestController')
      || annotationState('org.springframework.stereotype.Controller')
      || annotationState('org.springframework.web.bind.annotation.Controller');
    const service = annotationState('org.springframework.stereotype.Service');
    const advice = annotationState('org.springframework.web.bind.annotation.RestControllerAdvice');
    const misplaced = tier === 'bootstrap' ? web || service || dbAccess
      : tier === 'model' ? web || service || advice || dbAccess
        : tier === 'persistence' ? web : false;
    if (misplaced) ctx.issue('J17', nameNode, `${tier}-tier class ${name}`);
  }

  checkJ17Graph(ctx, meta, module, tier);
  if (hasGradle && !module) {
    emitOnce(ctx, meta, 'unresolved', `gradle-file:${file}`, null,
      `No Maven/Gradle module association for ${file}.`);
  }
}

export function inspectPython(ctx) {
  const file = normalizePath(ctx.file);
  if (!file.endsWith('.py')) return;
  const name = basename(file);
  const base = name.slice(0, -3);
  const source = String(ctx.source || '');
  if (!/^[a-z_][a-z0-9_]*$/.test(base)) {
    ctx.issue('PY1', 1, 'not snake_case');
  }

  const match = /sys\s*\.\s*path\s*\.\s*(append|insert|extend|remove)\s*\(/.exec(source);
  if (match) {
    const line = source.slice(0, match.index).split('\n').length;
    const lineText = source.split(/\r?\n/)[line - 1]?.trim() || '';
    const excerpt = lineText.length > 80 ? `${lineText.slice(0, 80)}…` : lineText;
    ctx.unresolved('PY2', line, `sys.path match; confirm executable code: ${excerpt}`);
  }

  const settings = ctx.settings || {};
  if (settings.OPT_IN === false) return;
  const configuredNames = settings.VAGUE_NAMES;
  const vagueNames = Array.isArray(configuredNames)
    && configuredNames.every((item) => typeof item === 'string')
    ? new Set(configuredNames) : DEFAULT_VAGUE_NAMES;
  if (vagueNames.has(base)) ctx.issue('PY3', 1, 'vague name');
}
