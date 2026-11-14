const CONTROLLER_ANNOTATIONS = [
  "org.springframework.web.bind.annotation.RestController",
  "org.springframework.stereotype.Controller",
];
const SERVICE_ANNOTATION = "org.springframework.stereotype.Service";
const AUTOWIRED_ANNOTATION = "org.springframework.beans.factory.annotation.Autowired";
const SCHEMA_ANNOTATION = "io.swagger.v3.oas.annotations.media.Schema";
const PRINT_STREAM = "java.io.PrintStream";
const THROWABLE = "java.lang.Throwable";
const LOG_METHODS = new Set(["trace", "debug", "info", "warn", "error"]);
const LOGGER_FIELD_NAMES = new Set(["log", "logger", "LOG", "LOGGER"]);
const JAVA_LANG_TYPES = new Set([
  "Object", "String", "Boolean", "Byte", "Character", "Short", "Integer", "Long", "Float", "Double", "Number",
  "Enum", "Throwable", "Exception", "RuntimeException", "Error", "AssertionError", "InterruptedException",
  "IllegalArgumentException", "IllegalStateException", "NullPointerException", "IndexOutOfBoundsException",
  "UnsupportedOperationException", "ClassCastException", "ArithmeticException", "SecurityException",
  "ReflectiveOperationException", "CloneNotSupportedException", "AutoCloseable", "Runnable", "Comparable",
  "CharSequence", "System", "Class", "Math", "StringBuilder", "StringBuffer", "Iterable", "Void", "Record",
]);

const CLASS_KINDS = new Set([
  "class_declaration",
  "interface_declaration",
  "enum_declaration",
  "record_declaration",
  "annotation_type_declaration",
]);
const TYPE_KINDS = new Set([
  "annotated_type",
  "array_type",
  "boolean_type",
  "floating_point_type",
  "generic_type",
  "integral_type",
  "scoped_type_identifier",
  "type_identifier",
  "void_type",
]);
const COMMENT_KINDS = new Set(["block_comment", "line_comment"]);
const SCOPE_KINDS = new Set([
  "block",
  "catch_clause",
  "enhanced_for_statement",
  "for_statement",
  "switch_block_statement_group",
  "try_with_resources_statement",
]);

function children(node) {
  return node?.children?.() ?? [];
}

function namedChildren(node) {
  return node?.namedChildren?.() ?? [];
}

function kind(node) {
  return node?.kind?.() ?? "";
}

function text(node) {
  return node?.text?.() ?? "";
}

function parent(node) {
  return node?.parent?.() ?? null;
}

function findNodes(root, kinds) {
  if (!root) return [];
  const wanted = Array.isArray(kinds) ? kinds : [kinds];
  const result = wanted.flatMap((nodeKind) => root.findAll({ rule: { kind: nodeKind } }));
  return result.sort((left, right) => nodeStart(left) - nodeStart(right));
}

function directChild(node, childKind) {
  return children(node).find((child) => kind(child) === childKind) ?? null;
}

function directChildren(node, childKind) {
  return children(node).filter((child) => kind(child) === childKind);
}

function directIdentifier(node) {
  return directChildren(node, "identifier")[0] ?? null;
}

function nodeName(node) {
  return text(directIdentifier(node)).trim();
}

function directTypeNode(node) {
  return namedChildren(node).find((child) => TYPE_KINDS.has(kind(child))) ?? null;
}

function typeText(node) {
  return text(directTypeNode(node)).trim().replace(/\s+/g, " ");
}

function packageName(root) {
  const declaration = findNodes(root, "package_declaration")[0];
  if (!declaration) return "";
  return namedChildren(declaration).map(text).join("").trim();
}

function importsFor(root) {
  const imports = [];
  for (const declaration of findNodes(root, "import_declaration")) {
    let value = text(declaration)
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/\/\/[^\r\n]*/g, " ")
      .replace(/^\s*import\b/, "")
      .replace(/;\s*$/, "");
    const isStatic = /^\s*static(?:\s|$)/.test(value);
    if (isStatic) value = value.replace(/^\s*static\b/, "");
    value = value.replace(/\s+/g, "");
    const onDemand = value.endsWith(".*");
    imports.push({
      node: declaration,
      value,
      isStatic,
      onDemand,
      name: onDemand ? value.slice(0, -2) : value,
    });
  }
  const bySimple = new Map();
  for (const entry of imports) {
    if (entry.isStatic || entry.onDemand) continue;
    const simple = entry.name.slice(entry.name.lastIndexOf(".") + 1);
    const current = bySimple.get(simple) ?? [];
    current.push(entry.name);
    bySimple.set(simple, current);
  }
  return {
    entries: imports,
    bySimple,
    onDemand: imports.filter((entry) => !entry.isStatic && entry.onDemand).map((entry) => entry.name),
  };
}

function parseSetting(ctx, name, fallback) {
  const settings = ctx.settings && typeof ctx.settings === "object" ? ctx.settings : {};
  if (!Object.prototype.hasOwnProperty.call(settings, name)) return fallback;
  return settings[name];
}

function asBoolean(value, fallback) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off", ""].includes(normalized)) return false;
  }
  return fallback;
}

function asStringSet(value, fallback) {
  const values = Array.isArray(value) ? value : (typeof value === "string" ? [value] : fallback);
  return new Set(values.map((item) => String(item).trim()).filter(Boolean));
}

function asStringList(value, fallback) {
  const values = Array.isArray(value) ? value : (typeof value === "string" ? [value] : fallback);
  return values.map((item) => String(item).trim().replace(/^@/, "")).filter(Boolean);
}

function directAnnotations(node) {
  const modifiers = directChild(node, "modifiers");
  return namedChildren(modifiers).filter((child) => ["annotation", "marker_annotation"].includes(kind(child)));
}

function annotationNameNode(annotation) {
  return namedChildren(annotation).find((child) =>
    ["identifier", "scoped_identifier", "field_access"].includes(kind(child))) ?? null;
}

function annotationName(annotation) {
  return text(annotationNameNode(annotation)).trim().replace(/^@/, "");
}

function annotationStatus(annotation, targetFqns, imports, pkg) {
  const name = annotationName(annotation);
  if (!name) return { status: "unresolved", node: annotation };
  if (name.includes(".")) {
    return targetFqns.includes(name)
      ? { status: "match", node: annotation }
      : { status: "other", node: annotation };
  }

  const target = targetFqns.find((fqn) => fqn.slice(fqn.lastIndexOf(".") + 1) === name);
  if (!target) return { status: "other", node: annotation };
  if (pkg === target.slice(0, target.lastIndexOf("."))) return { status: "match", node: annotation };

  const explicit = imports.bySimple.get(name) ?? [];
  if (explicit.length === 1) {
    return explicit[0] === target
      ? { status: "match", node: annotation }
      : { status: "other", node: annotation };
  }
  if (explicit.length > 1) return { status: "unresolved", node: annotation };

  const matchingWildcard = imports.onDemand.filter((entry) => `${entry}.` === target.slice(0, target.lastIndexOf(".") + 1));
  if (matchingWildcard.length) return { status: "unresolved", node: annotation };
  return { status: "unresolved", node: annotation };
}

function classAnnotationState(classNode, targets, imports, pkg) {
  const results = directAnnotations(classNode).map((annotation) =>
    annotationStatus(annotation, targets, imports, pkg));
  const match = results.find((result) => result.status === "match");
  if (match) return match;
  return results.find((result) => result.status === "unresolved") ?? { status: "other", node: null };
}

function classNodes(root) {
  return findNodes(root, [...CLASS_KINDS]);
}

function classBody(node) {
  return children(node).find((child) =>
    ["class_body", "interface_body", "enum_body", "annotation_type_body"].includes(kind(child))) ?? null;
}

function enclosingClass(node) {
  for (let current = parent(node); current; current = parent(current)) {
    if (CLASS_KINDS.has(kind(current))) return current;
  }
  return null;
}

function enclosingCallable(node) {
  for (let current = parent(node); current; current = parent(current)) {
    if (["method_declaration", "constructor_declaration", "lambda_expression"].includes(kind(current))) return current;
  }
  return null;
}

function isAncestor(ancestor, node) {
  for (let current = node; current; current = parent(current)) {
    if (current.id() === ancestor.id()) return true;
  }
  return false;
}

function nodeStart(node) {
  return node?.range?.().start?.index ?? Number.POSITIVE_INFINITY;
}

function classInfos(root, pkg) {
  return classNodes(root).map((node) => {
    const body = classBody(node);
    const fields = directChildren(body, "field_declaration").flatMap((declaration) =>
      directChildren(declaration, "variable_declarator").map((variable) => ({
        declaration,
        variable,
        name: nodeName(variable),
        typeNode: directTypeNode(declaration),
        rawType: typeText(declaration),
      })));
    const methods = directChildren(body, "method_declaration");
    const superclass = children(node).find((child) => kind(child) === "superclass") ?? null;
    const extendsType = superclass ? findNodes(superclass, [...TYPE_KINDS])[0] ?? null : null;
    const name = nodeName(node);
    return {
      node,
      body,
      kind: kind(node),
      name,
      fqn: pkg && name ? `${pkg}.${name}` : name,
      fields,
      methods,
      extendsRaw: text(extendsType).trim(),
    };
  });
}

function declarationNames(declaration) {
  if (kind(declaration) === "variable_declarator") return [nodeName(declaration)].filter(Boolean);
  return directChildren(declaration, "variable_declarator").map(nodeName).filter(Boolean);
}

function parameterName(parameter) {
  const identifiers = directChildren(parameter, "identifier");
  return text(identifiers[identifiers.length - 1]).trim();
}

function importResolution(name, imports, pkg, infos) {
  if (!name) return { status: "unknown", fqn: null };
  if (name.includes(".")) return { status: "known", fqn: name };

  const explicit = imports.bySimple.get(name) ?? [];
  if (explicit.length === 1) return { status: "known", fqn: explicit[0] };
  if (explicit.length > 1) return { status: "unknown", fqn: null };

  const local = infos.filter((info) => info.name === name);
  if (local.length === 1) return { status: "known", fqn: local[0].fqn, local: local[0] };
  if (local.length > 1) return { status: "unknown", fqn: null };

  if (JAVA_LANG_TYPES.has(name)) {
    return { status: "known", fqn: `java.lang.${name}` };
  }

  const wildcardCandidates = imports.onDemand.map((entry) => `${entry}.${name}`);
  if (wildcardCandidates.length === 1) return { status: "known", fqn: wildcardCandidates[0] };
  if (wildcardCandidates.length > 1) return { status: "unknown", fqn: null };

  // A type in the current package may be declared in another file. Its FQN is not enough to
  // establish its superclass or method owner from this file alone.
  return { status: "unknown", fqn: pkg ? `${pkg}.${name}` : name };
}

function resolveType(rawType, imports, pkg, infos) {
  const cleaned = String(rawType ?? "")
    .replace(/@[\w$.]+(?:\([^)]*\))?\s*/g, "")
    .replace(/<.*$/s, "")
    .replace(/(?:\[\]\s*)+$/, "")
    .replace(/\.\.\.$/, "")
    .trim();
  if (!cleaned) return { status: "unknown", fqn: null };
  return importResolution(cleaned, imports, pkg, infos);
}

function isExcludedType(rawType, excludedTypes, imports, pkg, infos) {
  if (excludedTypes.has(rawType)) return true;
  const resolved = resolveType(rawType, imports, pkg, infos);
  return resolved.fqn != null && excludedTypes.has(resolved.fqn);
}

function isDatabaseType(rawType, includeManage) {
  return rawType.endsWith("Mapper") || (includeManage && rawType.endsWith("Manage"));
}

function isStaticField(fieldDeclaration) {
  const modifiers = directChild(fieldDeclaration, "modifiers");
  return children(modifiers).some((modifier) => kind(modifier) === "static" || text(modifier).trim() === "static");
}

function precedingSibling(node) {
  const p = parent(node);
  if (!p) return null;
  const siblings = children(p);
  const index = siblings.findIndex((sibling) => sibling.id() === node.id());
  return index > 0 ? siblings[index - 1] : null;
}

function precedingComment(node) {
  const sibling = precedingSibling(node);
  return COMMENT_KINDS.has(kind(sibling)) ? sibling : null;
}

function javadocFor(node) {
  const comment = precedingComment(node);
  return comment && text(comment).trim().startsWith("/**") ? comment : null;
}

function javadocTags(comment, tagName) {
  const body = text(comment).replace(/^\s*\/\*\*/, "").replace(/\*\/\s*$/, "");
  const tags = [];
  for (const line of body.split(/\r?\n/)) {
    const normalized = line.replace(/^\s*\*?\s?/, "").trim();
    const match = normalized.match(new RegExp(`^@${tagName}\\b(?:\\s+([^\\s]+))?`));
    if (match) tags.push(match[1] ?? "");
  }
  return tags;
}

function javadocTagNames(comment) {
  const body = text(comment).replace(/^\s*\/\*\*/, "").replace(/\*\/\s*$/, "");
  const tags = [];
  for (const line of body.split(/\r?\n/)) {
    const normalized = line.replace(/^\s*\*?\s?/, "").trim();
    const match = normalized.match(/^@([\w-]+)\b/);
    if (match) tags.push(match[1]);
  }
  return tags;
}

function methodParameters(method) {
  const parameters = directChild(method, "formal_parameters");
  return namedChildren(parameters).filter((node) => ["formal_parameter", "spread_parameter"].includes(kind(node)));
}

function methodReturnType(method) {
  return directTypeNode(method);
}

function topLevelClasses(root) {
  return namedChildren(root).filter((node) => CLASS_KINDS.has(kind(node)));
}

function annotationHasAttribute(annotation, attributeName) {
  const argumentList = directChild(annotation, "annotation_argument_list");
  return findNodes(argumentList, "element_value_pair").some((node) =>
    kind(node) === "element_value_pair" && nodeName(node) === attributeName);
}

function schemaDescriptionState(field, imports, pkg) {
  let uncertain = false;
  for (const annotation of directAnnotations(field)) {
    const name = annotationName(annotation);
    if (name.split(".").pop() !== "Schema") continue;
    const hasDescription = annotationHasAttribute(annotation, "description");
    const status = annotationStatus(annotation, [SCHEMA_ANNOTATION], imports, pkg);
    if (status.status === "match" && hasDescription) return { described: true, uncertain: false };
    if (status.status === "unresolved" && hasDescription) uncertain = true;
  }
  return { described: false, uncertain };
}

function directTypeIdentifier(typeNode) {
  return text(typeNode).trim();
}

function callableParameters(callable) {
  const formal = directChild(callable, "formal_parameters");
  if (formal) return namedChildren(formal).filter((node) => ["formal_parameter", "spread_parameter"].includes(kind(node)));
  const lambda = directChild(callable, "lambda_parameters");
  return namedChildren(lambda).filter((node) => ["formal_parameter", "identifier"].includes(kind(node)));
}

function declarationScope(declaration, callable) {
  for (let current = parent(declaration); current && current.id() !== callable.id(); current = parent(current)) {
    if (SCOPE_KINDS.has(kind(current))) return current;
    if (CLASS_KINDS.has(kind(current))) return null;
  }
  return null;
}

function variableTypeNode(declaration) {
  if (kind(declaration) === "catch_formal_parameter") {
    return namedChildren(declaration).find((node) => TYPE_KINDS.has(kind(node)) || kind(node) === "catch_type") ?? null;
  }
  if (kind(declaration) === "enhanced_for_statement") return directTypeNode(declaration);
  return directTypeNode(declaration);
}

function nearestVariable(call, name, infos) {
  const callable = enclosingCallable(call);
  const currentClass = enclosingClass(call);
  if (!callable) return null;

  const parameters = callableParameters(callable);
  for (const parameter of parameters) {
    if (parameterName(parameter) === name) {
      return { declaration: parameter, typeNode: variableTypeNode(parameter), kind: "parameter" };
    }
  }

  const localCandidates = findNodes(callable, ["local_variable_declaration", "catch_formal_parameter", "enhanced_for_statement", "resource"])
    .filter((node) => enclosingClass(node)?.id() === currentClass?.id());
  const visible = [];
  for (const declaration of localCandidates) {
    const declaredNames = kind(declaration) === "enhanced_for_statement"
      ? [nodeName(declaration)]
      : declarationNames(declaration);
    if (!declaredNames.includes(name)) continue;
    if (nodeStart(declaration) >= nodeStart(call)) continue;
    const scope = declarationScope(declaration, callable);
    if (!scope || !isAncestor(scope, call)) continue;
    visible.push({ declaration, typeNode: variableTypeNode(declaration), kind: "local", start: nodeStart(declaration) });
  }
  if (visible.length) return visible.sort((a, b) => b.start - a.start)[0];

  const info = infos.find((item) => item.node.id() === currentClass?.id());
  const field = info?.fields.find((item) => item.name === name);
  if (field) return { declaration: field.declaration, variable: field.variable, typeNode: field.typeNode, kind: "field", field };
  return null;
}

function classInfoForType(resolved, infos) {
  if (!resolved?.fqn) return null;
  return infos.find((info) => info.fqn === resolved.fqn || info.name === resolved.fqn) ?? null;
}

function methodInvocationParts(call) {
  const list = directChild(call, "argument_list");
  const direct = children(call);
  const beforeArgs = list ? direct.slice(0, direct.findIndex((child) => child.id() === list.id())) : direct;
  const identifiers = beforeArgs.filter((node) => kind(node) === "identifier");
  const methodNameNode = identifiers[identifiers.length - 1] ?? null;
  const receiver = beforeArgs.find((node) => node.id() !== methodNameNode?.id() && node.isNamed?.()) ?? null;
  return {
    name: text(methodNameNode).trim(),
    nameNode: methodNameNode,
    receiver,
    argumentList: list,
    arguments: namedChildren(list),
  };
}

function resolveExpressionType(expression, call, imports, pkg, infos) {
  if (!expression) return { status: "unknown", fqn: null };
  const expressionKind = kind(expression);
  if (expressionKind === "parenthesized_expression") {
    return resolveExpressionType(namedChildren(expression)[0] ?? null, call, imports, pkg, infos);
  }
  if (expressionKind === "this") {
    const info = infos.find((item) => item.node.id() === enclosingClass(call)?.id());
    return info ? { status: "known", fqn: info.fqn, local: info } : { status: "unknown", fqn: null };
  }
  if (expressionKind === "super") {
    const info = infos.find((item) => item.node.id() === enclosingClass(call)?.id());
    return info?.extendsRaw ? resolveType(info.extendsRaw, imports, pkg, infos) : { status: "unknown", fqn: null };
  }
  if (expressionKind === "identifier") {
    const name = text(expression).trim();
    const variable = nearestVariable(call, name, infos);
    if (variable?.typeNode) return resolveType(directTypeIdentifier(variable.typeNode), imports, pkg, infos);
    return importResolution(name, imports, pkg, infos);
  }
  if (expressionKind === "object_creation_expression") {
    const typeNode = namedChildren(expression).find((node) => TYPE_KINDS.has(kind(node)));
    return resolveType(text(typeNode), imports, pkg, infos);
  }
  if (expressionKind === "field_access") {
    const parts = namedChildren(expression);
    const fieldName = text(parts[parts.length - 1]).trim();
    const object = parts[0] ?? null;
    if (!object || !fieldName) return { status: "unknown", fqn: null };

    if (kind(object) === "this") {
      const current = infos.find((item) => item.node.id() === enclosingClass(call)?.id());
      const field = current?.fields.find((item) => item.name === fieldName);
      if (field?.typeNode) return resolveType(field.rawType, imports, pkg, infos);
      return { status: "unknown", fqn: null };
    }

    if (kind(object) === "identifier" && text(object).trim() === "System") {
      const shadow = nearestVariable(call, "System", infos);
      const localSystemClass = infos.find((item) => item.name === "System");
      if (!shadow && !localSystemClass) {
        const explicit = imports.bySimple.get("System") ?? [];
        if (explicit.length === 0 && ["out", "err"].includes(fieldName)) {
          return { status: "known", fqn: PRINT_STREAM };
        }
        if (explicit.length === 1 && explicit[0] === "java.lang.System" && ["out", "err"].includes(fieldName)) {
          return { status: "known", fqn: PRINT_STREAM };
        }
      }
    }

    const objectType = resolveExpressionType(object, call, imports, pkg, infos);
    const objectInfo = classInfoForType(objectType, infos);
    const field = objectInfo?.fields.find((item) => item.name === fieldName);
    if (field?.typeNode) return resolveType(field.rawType, imports, pkg, infos);
    if (objectType.fqn === "java.lang.System" && ["out", "err"].includes(fieldName)) {
      return { status: "known", fqn: PRINT_STREAM };
    }
    return { status: "unknown", fqn: null };
  }
  if (expressionKind === "method_invocation") {
    const parts = methodInvocationParts(expression);
    const owner = parts.receiver
      ? classInfoForType(resolveExpressionType(parts.receiver, expression, imports, pkg, infos), infos)
      : infos.find((item) => item.node.id() === enclosingClass(call)?.id());
    const methods = owner?.methods.filter((method) => nodeName(method) === parts.name) ?? [];
    const returnTypes = methods.map((method) => text(methodReturnType(method)).trim()).filter(Boolean);
    if (returnTypes.length && returnTypes.every((type) => type === returnTypes[0])) {
      return resolveType(returnTypes[0], imports, pkg, infos);
    }
    return { status: "unknown", fqn: null };
  }
  if (["string_literal", "text_block"].includes(expressionKind)) return { status: "known", fqn: "java.lang.String" };
  if (["decimal_integer_literal", "hex_integer_literal", "octal_integer_literal", "binary_integer_literal", "decimal_floating_point_literal", "hex_floating_point_literal"].includes(expressionKind)) {
    return { status: "known", fqn: "java.lang.Number" };
  }
  return { status: "unknown", fqn: null };
}

function throwableSubtype(fqn, imports, pkg, infos, seen = new Set()) {
  if (!fqn || seen.has(fqn)) return null;
  if (fqn === THROWABLE || fqn === "java.lang.Exception" || fqn === "java.lang.Error" ||
      fqn === "java.lang.RuntimeException" || fqn === "java.lang.Throwable") return true;
  if (fqn.startsWith("java.") && /(?:Exception|Error|Throwable)$/.test(fqn)) return true;

  const info = infos.find((item) => item.fqn === fqn);
  if (info) {
    if (!info.extendsRaw) return false;
    const resolvedBase = resolveType(info.extendsRaw, imports, pkg, infos);
    if (!resolvedBase.fqn) return null;
    seen.add(fqn);
    return throwableSubtype(resolvedBase.fqn, imports, pkg, infos, seen);
  }

  if (fqn.startsWith("java.lang.") || fqn.startsWith("java.io.") || fqn.startsWith("java.sql.") ||
      fqn.startsWith("java.net.") || fqn.startsWith("java.nio.") || fqn.startsWith("java.util.concurrent.") ||
      fqn.startsWith("java.security.") || fqn.startsWith("java.text.")) {
    return false;
  }
  return null;
}

function locallyDeclaresMethod(receiverType, methodName, imports, pkg, infos, seen = new Set()) {
  const info = classInfoForType(receiverType, infos);
  if (!info || seen.has(info.fqn)) return false;
  if (info.methods.some((method) => nodeName(method) === methodName)) return true;
  if (!info.extendsRaw) return false;
  seen.add(info.fqn);
  return locallyDeclaresMethod(resolveType(info.extendsRaw, imports, pkg, infos), methodName, imports, pkg, infos, seen);
}

function anonymouslyDeclaresMethod(receiver, methodName) {
  let expression = receiver;
  while (kind(expression) === "parenthesized_expression") expression = namedChildren(expression)[0];
  if (kind(expression) !== "object_creation_expression") return false;
  const body = directChild(expression, "class_body");
  return directChildren(body, "method_declaration").some((method) => nodeName(method) === methodName);
}

function printStreamSubtype(receiverType, imports, pkg, infos, seen = new Set()) {
  const fqn = receiverType?.fqn;
  if (!fqn || seen.has(fqn)) return null;
  if (fqn === PRINT_STREAM) return true;
  const info = classInfoForType(receiverType, infos);
  if (info) {
    if (!info.extendsRaw) return false;
    seen.add(fqn);
    return printStreamSubtype(resolveType(info.extendsRaw, imports, pkg, infos), imports, pkg, infos, seen);
  }
  if (receiverType.status === "known" && (fqn.startsWith("java.lang.") || fqn === "java.io.PrintWriter")) return false;
  return null;
}

function reportJ8(ctx, call, imports, pkg, infos, parts) {
  const { name, receiver } = parts;
  if (!["print", "println", "printf", "printStackTrace"].includes(name)) return;

  if (!receiver) {
    ctx.unresolved("J8", call, `cannot confirm the owner of unqualified ${name}()`);
    return;
  }

  const receiverType = resolveExpressionType(receiver, call, imports, pkg, infos);
  if (name === "printStackTrace") {
    if (receiverType.fqn) {
      const subtype = throwableSubtype(receiverType.fqn, imports, pkg, infos);
      if (subtype === true) {
        if (anonymouslyDeclaresMethod(receiver, name) || locallyDeclaresMethod(receiverType, name, imports, pkg, infos)) {
          ctx.unresolved("J8", call, "cannot resolve printStackTrace() overload or override");
        } else {
          ctx.issue("J8", call, "Throwable.printStackTrace()");
        }
      } else if (subtype == null) {
        ctx.unresolved("J8", call, "cannot confirm whether the receiver extends Throwable");
      }
      return;
    }
    ctx.unresolved("J8", call, "cannot resolve the receiver type for printStackTrace()");
    return;
  }

  const subtype = printStreamSubtype(receiverType, imports, pkg, infos);
  if (subtype === true) {
    if (anonymouslyDeclaresMethod(receiver, name) || locallyDeclaresMethod(receiverType, name, imports, pkg, infos)) {
      ctx.unresolved("J8", call, "cannot resolve print overload or override");
    } else {
      ctx.issue("J8", call, "PrintStream debug output");
    }
    return;
  }
  if (subtype == null) ctx.unresolved("J8", call, "cannot confirm whether the print call is PrintStream debug output");
}

function fieldNameFromReference(reference) {
  if (kind(reference) === "identifier") return text(reference).trim();
  if (kind(reference) !== "field_access") return "";
  const ids = namedChildren(reference).filter((node) => kind(node) === "identifier");
  return text(ids[ids.length - 1]).trim();
}

function fieldForReference(reference, call, infos) {
  const current = infos.find((item) => item.node.id() === enclosingClass(call)?.id());
  const name = fieldNameFromReference(reference);
  if (!name || !current) return { field: null, name, status: "unknown" };
  if (kind(reference) === "identifier") {
    const variable = nearestVariable(call, name, infos);
    if (variable && variable.kind !== "field") return { field: null, name, status: "shadowed" };
    const field = current.fields.find((item) => item.name === name);
    return { field: field ?? null, name, status: field ? "found" : "unknown" };
  }
  const parts = namedChildren(reference);
  const object = parts[0] ?? null;
  if (kind(object) === "this") {
    const field = current.fields.find((item) => item.name === name);
    return { field: field ?? null, name, status: field ? "found" : "unknown" };
  }
  const className = text(object).trim();
  const classInfo = infos.find((item) => item.name === className);
  if (classInfo) {
    const field = classInfo.fields.find((item) => item.name === name);
    return { field: field ?? null, name, status: field ? "found" : "unknown" };
  }
  return { field: null, name, status: "unknown" };
}

function reportJ9(ctx, call, parts, infos) {
  if (!LOG_METHODS.has(parts.name)) return;
  const firstArgument = parts.arguments[0] ?? null;
  if (kind(firstArgument) !== "binary_expression") return;
  if (!parts.receiver || !["identifier", "field_access"].includes(kind(parts.receiver))) return;

  const resolved = fieldForReference(parts.receiver, call, infos);
  if (resolved.status === "shadowed") return;
  if (resolved.field) {
    const isLogger = LOGGER_FIELD_NAMES.has(resolved.field.name) || resolved.field.rawType.includes("Logger");
    if (isLogger) {
      ctx.issue("J9", call, "logger message concatenation");
    }
    return;
  }
  if (LOGGER_FIELD_NAMES.has(resolved.name) || /Logger/i.test(resolved.name)) {
    ctx.unresolved("J9", call, "logger-like field is unresolved");
  }
}

function potentialDatabaseMembers(classNode, includeManage) {
  const body = classBody(classNode);
  const fields = directChildren(body, "field_declaration");
  const fieldCandidates = fields.filter((field) => isDatabaseType(typeText(field), includeManage));
  const constructorCandidates = directChildren(body, "constructor_declaration")
    .flatMap((constructor) => namedChildren(directChild(constructor, "formal_parameters")))
    .filter((parameter) => ["formal_parameter", "spread_parameter"].includes(kind(parameter)) &&
      isDatabaseType(typeText(parameter), includeManage));
  return { fieldCandidates, constructorCandidates };
}

function inspectJ1J9(ctx) {
  const { root } = ctx;
  if (!root) return;
  const pkg = packageName(root);
  const imports = importsFor(root);
  const infos = classInfos(root, pkg);
  const calls = findNodes(root, "method_invocation");
  const excludedTypes = asStringSet(
    parseSetting(ctx, "EXCLUDED_TYPES", ["com.fasterxml.jackson.databind.ObjectMapper"]),
    ["com.fasterxml.jackson.databind.ObjectMapper"],
  );

  // J1: controllers may depend on service abstractions, not Mapper or Manage fields/parameters.
  for (const classNode of classNodes(root)) {
    const members = potentialDatabaseMembers(classNode, true);
    if (!members.fieldCandidates.length && !members.constructorCandidates.length) continue;
    const state = classAnnotationState(classNode, CONTROLLER_ANNOTATIONS, imports, pkg);
    if (state.status === "unresolved") {
      ctx.unresolved("J1", state.node ?? classNode, "controller annotation FQN is ambiguous");
      continue;
    }
    if (state.status !== "match") continue;
    for (const field of members.fieldCandidates) {
      if (isExcludedType(typeText(field), excludedTypes, imports, pkg, infos)) continue;
      ctx.issue("J1", field, `Controller injects ${typeText(field)}`);
    }
    for (const parameter of members.constructorCandidates) {
      if (isExcludedType(typeText(parameter), excludedTypes, imports, pkg, infos)) continue;
      ctx.issue("J1", parameter, `Controller injects ${typeText(parameter)}`);
    }
  }

  // J2 candidates apply where the reviewed module has an established Manage layer.
  const requireManageLayer = asBoolean(parseSetting(ctx, "REQUIRE_MANAGE_LAYER", true), true);
  if (requireManageLayer) {
    for (const classNode of classNodes(root)) {
      const body = classBody(classNode);
      const mapperFields = directChildren(body, "field_declaration")
        .filter((field) => isDatabaseType(typeText(field), false));
      if (!mapperFields.length) continue;
      const name = nodeName(classNode);
      const serviceByName = name.endsWith("ServiceImpl") ||
        (kind(classNode) === "interface_declaration" && name.endsWith("Service"));
      const serviceAnnotation = classAnnotationState(classNode, [SERVICE_ANNOTATION], imports, pkg);
      if (!serviceByName && serviceAnnotation.status === "unresolved") {
        ctx.unresolved("J2", serviceAnnotation.node ?? classNode, "@Service FQN is ambiguous");
        continue;
      }
      if (!serviceByName && serviceAnnotation.status !== "match") continue;
      for (const field of mapperFields) {
        if (isExcludedType(typeText(field), excludedTypes, imports, pkg, infos)) continue;
        ctx.issue("J2", field, `Service injects ${typeText(field)} directly`);
      }
    }
  }

  // J3: opt-in service interface Javadoc convention; disabled by default.
  const requireServiceJavadoc = asBoolean(parseSetting(ctx, "REQUIRE_SERVICE_JAVADOC", false), false);
  if (requireServiceJavadoc) {
    for (const interfaceNode of classNodes(root).filter((node) =>
      kind(node) === "interface_declaration" && nodeName(node).endsWith("Service"))) {
      const body = classBody(interfaceNode);
      for (const method of directChildren(body, "method_declaration")) {
        const methodName = nodeName(method) || "method";
        const methodAnchor = directIdentifier(method) ?? method;
        const doc = javadocFor(method);
        if (!doc) {
          ctx.issue("J3", methodAnchor, `missing Javadoc: ${methodName}()`);
          continue;
        }
        const documentedParams = new Set(javadocTags(doc, "param"));
        for (const parameter of methodParameters(method)) {
          const name = parameterName(parameter);
          if (name && !documentedParams.has(name)) {
            ctx.issue("J3", parameter, `missing @param ${name}: ${methodName}()`);
          }
        }
        const returnType = methodReturnType(method);
        if (returnType && kind(returnType) !== "void_type" && !javadocTags(doc, "return").length) {
          ctx.issue("J3", methodAnchor, `missing @return: ${methodName}()`);
        }
      }
    }
  }

  // J4: repository header tags are opt-in through a non-empty REQUIRED_TAGS list.
  const requiredTags = asStringList(parseSetting(ctx, "REQUIRED_TAGS", []), []);
  if (requiredTags.length) {
    for (const topLevelClass of topLevelClasses(root)) {
      const anchor = directIdentifier(topLevelClass) ?? topLevelClass;
      const doc = javadocFor(topLevelClass);
      if (!doc) {
        ctx.issue("J4", anchor, "missing class header Javadoc");
        continue;
      }
      const presentTags = new Set(javadocTagNames(doc).map((tag) => tag.toLowerCase()));
      for (const tag of requiredTags) {
        if (!presentTags.has(tag.toLowerCase())) ctx.issue("J4", anchor, `missing @${tag}`);
      }
    }
  }

  // J5: comments for non-static fields in *Param classes; disabled by default.
  const requireParamFieldComments = asBoolean(parseSetting(ctx, "REQUIRE_PARAM_FIELD_COMMENTS", false), false);
  if (requireParamFieldComments) {
    for (const classNode of classNodes(root).filter((node) => nodeName(node).endsWith("Param"))) {
      const body = classBody(classNode);
      for (const field of directChildren(body, "field_declaration")) {
        if (isStaticField(field)) continue;
        const comment = precedingComment(field);
        const hasJavadoc = Boolean(comment && text(comment).trim().startsWith("/**"));
        const hasLeadingComment = Boolean(comment && COMMENT_KINDS.has(kind(comment)) && !hasJavadoc);
        const schema = schemaDescriptionState(field, imports, pkg);
        if (schema.described || hasJavadoc || hasLeadingComment) continue;
        if (schema.uncertain) {
          ctx.unresolved("J5", field, "cannot confirm whether @Schema resolves to Swagger's Schema annotation");
          continue;
        }
        const variables = directChildren(field, "variable_declarator");
        for (const variable of variables.length ? variables : [field]) {
          ctx.issue("J5", directIdentifier(variable) ?? variable, "undocumented Param field");
        }
      }
    }
  }

  // J6: only field and method @Autowired injection is flagged; constructor injection is allowed.
  for (const node of findNodes(root, ["field_declaration", "method_declaration"])) {
    for (const annotation of directAnnotations(node)) {
      const status = annotationStatus(annotation, [AUTOWIRED_ANNOTATION], imports, pkg);
      if (status.status === "match") {
        ctx.issue("J6", node, "@Autowired field/method injection");
      } else if (status.status === "unresolved" && annotationName(annotation).split(".").pop() === "Autowired") {
        ctx.unresolved("J6", annotation, "@Autowired FQN is ambiguous");
      }
    }
  }

  // J7: wildcard imports, including static imports, are syntactic and fully decidable.
  for (const declaration of imports.entries) {
    if (declaration.onDemand) ctx.issue("J7", declaration.node, "wildcard import");
  }

  // J8: use known imports, declaration types, and Java's implicit java.lang types only.
  for (const call of calls) {
    const parts = methodInvocationParts(call);
    reportJ8(ctx, call, imports, pkg, infos, parts);
  }

  // J9 emits candidates by default and can be disabled with OPT_IN.
  const optIn = asBoolean(parseSetting(ctx, "OPT_IN", true), true);
  if (optIn) {
    for (const call of calls) {
      reportJ9(ctx, call, methodInvocationParts(call), infos);
    }
  }
}

export { inspectJ1J9 };
