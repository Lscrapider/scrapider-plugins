const DEFAULT_UTILITY_CLASSES = [
  'java.util.Objects',
  'org.apache.commons.lang3.StringUtils',
  'org.apache.commons.lang3.ObjectUtils',
];

const TYPE_KINDS = new Set([
  'annotated_type', 'array_type', 'boolean_type', 'floating_point_type', 'generic_type',
  'integral_type', 'scoped_type_identifier', 'type_identifier', 'void_type',
]);

const TYPE_DECLARATION_KINDS = new Set([
  'annotation_type_declaration', 'class_declaration', 'enum_declaration', 'interface_declaration',
  'record_declaration',
]);

const LOG_METHODS = new Set(['trace', 'debug', 'info', 'warn', 'error', 'log']);
const PRIMITIVE_OR_COMMON_TYPES = new Set([
  'boolean', 'byte', 'char', 'double', 'float', 'int', 'long', 'short', 'void',
  'Boolean', 'Byte', 'Character', 'Class', 'Double', 'Float', 'Integer', 'Long', 'Number', 'Object',
  'Short', 'String', 'Void', 'BigDecimal', 'BigInteger', 'Collection', 'Collections', 'Comparator',
  'Date', 'Deque', 'HashMap', 'HashSet', 'Instant', 'Iterable', 'Iterator', 'LinkedHashMap',
  'LinkedHashSet', 'LinkedList', 'List', 'LocalDate', 'LocalDateTime', 'Map', 'Math', 'Objects',
  'Optional', 'Queue', 'Set', 'SortedMap', 'SortedSet', 'Stream', 'StringBuffer', 'StringBuilder', 'UUID',
]);
const ENUM_LIKE_MEMBER = /(?:enum|status|state|kind|mode)$/i;

function kind(node) {
  return node?.kind?.() || '';
}

function text(node) {
  return node?.text?.() || '';
}

function nodeField(node, name) {
  return node?.field?.(name) || null;
}

function children(node) {
  return node?.namedChildren?.() || [];
}

function directChild(node, acceptedKinds) {
  return children(node).find((child) => acceptedKinds.has(kind(child))) || null;
}

function findAllKinds(node, acceptedKinds) {
  const result = [];
  const seen = new Set();
  for (const nodeKind of acceptedKinds) {
    for (const found of node.findAll({ rule: { kind: nodeKind } })) {
      if (seen.has(found.id())) continue;
      seen.add(found.id());
      result.push(found);
    }
  }
  return result;
}

function typeNode(node) {
  const field = nodeField(node, 'type');
  if (field) return field;
  return children(node).find((child) => TYPE_KINDS.has(kind(child))) || null;
}

function nameNode(node) {
  return nodeField(node, 'name') || null;
}

function nameText(node) {
  return text(nameNode(node));
}

function parseImports(nodes) {
  const explicitTypes = new Map();
  const wildcardPackages = new Set();
  const staticMembers = new Map();
  const staticWildcards = new Set();
  const imports = [];

  for (const node of nodes) {
    if (kind(node) !== 'import_declaration') continue;
    const clean = text(node).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\r\n]*/g, ' ');
    const identifier = '[$_\\p{ID_Start}][$_\\p{ID_Continue}]*';
    const pattern = new RegExp(`^\\s*import\\s+(static\\s+)?(${identifier}(?:\\s*\\.\\s*(?:${identifier}|\\*))*)\\s*;\\s*$`, 'u');
    const match = pattern.exec(clean);
    if (!match) continue;
    const isStatic = Boolean(match[1]);
    const path = match[2].replace(/\s+/g, '');
    imports.push({ node, path, isStatic });
    if (isStatic) {
      if (path.endsWith('.*')) {
        staticWildcards.add(path.slice(0, -2));
      } else {
        const owner = path.substring(0, path.lastIndexOf('.'));
        const member = path.substring(path.lastIndexOf('.') + 1);
        if (owner && member) {
          if (!staticMembers.has(member)) staticMembers.set(member, new Set());
          staticMembers.get(member).add(owner);
        }
      }
      continue;
    }
    if (path.endsWith('.*')) {
      wildcardPackages.add(path.slice(0, -2));
      continue;
    }
    const simple = path.substring(path.lastIndexOf('.') + 1);
    if (!explicitTypes.has(simple)) explicitTypes.set(simple, new Set());
    explicitTypes.get(simple).add(path);
  }

  return { imports, explicitTypes, wildcardPackages, staticMembers, staticWildcards };
}

function readTypeImports(imports, simpleName) {
  return imports.explicitTypes.get(simpleName) || new Set();
}

function rawTypeName(node) {
  const value = text(node)
    .replace(/@[\w$.]+(?:\([^)]*\))?\s*/g, '')
    .trim();
  const base = value.split(/[<\[\s?&]/, 1)[0];
  return base.replace(/\.\.\.$/, '').trim();
}

function declarationName(node) {
  return nameText(node);
}

function directMembers(typeNode) {
  if (kind(typeNode) === 'class_body') return children(typeNode);
  const body = nodeField(typeNode, 'body') || directChild(typeNode, new Set([
    'annotation_type_body', 'class_body', 'enum_body', 'interface_body',
  ]));
  return children(body);
}

function directMethods(typeNode) {
  return directMembers(typeNode).filter((member) => kind(member) === 'method_declaration');
}

function directFields(typeNode) {
  return directMembers(typeNode).filter((member) => kind(member) === 'field_declaration');
}

function annotations(node) {
  const modifiers = nodeField(node, 'modifiers') || directChild(node, new Set(['modifiers']));
  return children(modifiers).filter((child) => ['annotation', 'marker_annotation'].includes(kind(child)));
}

function annotationName(annotation) {
  const name = nodeField(annotation, 'name');
  if (name) return text(name).replace(/^@/, '');
  const match = /^\s*@([\w$.]+)/.exec(text(annotation));
  return match?.[1] || '';
}

function annotationStatus(node, simpleName, expectedFqn, imports) {
  const candidates = annotations(node).map(annotationName)
    .filter((value) => value.split('.').at(-1) === simpleName);
  if (!candidates.length) return 'none';
  if (candidates.some((value) => value.includes('.') && value === expectedFqn)) return 'yes';

  let unknown = false;
  for (const candidate of candidates) {
    if (candidate.includes('.')) continue;
    const explicit = readTypeImports(imports, simpleName);
    if (explicit.size === 1) {
      if (explicit.has(expectedFqn)) return 'yes';
      continue;
    }
    if (explicit.size > 1) {
      if (explicit.has(expectedFqn)) unknown = true;
      continue;
    }
    const expectedPackage = expectedFqn.substring(0, expectedFqn.lastIndexOf('.'));
    if (imports.wildcardPackages.has(expectedPackage)
      && [...imports.wildcardPackages].filter((value) => value !== expectedPackage).length === 0) {
      return 'yes';
    }
    unknown = true;
  }
  return unknown ? 'unknown' : 'no';
}

function anyAnnotationStatus(node, names, imports) {
  const statuses = names.map(([simpleName, fqn]) => annotationStatus(node, simpleName, fqn, imports));
  if (statuses.includes('yes')) return 'yes';
  if (statuses.includes('unknown')) return 'unknown';
  return statuses.includes('no') ? 'no' : 'none';
}

function isClassLike(node) {
  return TYPE_DECLARATION_KINDS.has(kind(node));
}

function isAnonymousClassBody(node) {
  return kind(node) === 'class_body' && kind(node.parent?.()) === 'object_creation_expression';
}

function isInterfaceLike(node) {
  return ['annotation_type_declaration', 'interface_declaration'].includes(kind(node));
}

function enclosingClass(node) {
  return node.ancestors().find((ancestor) => isClassLike(ancestor) || isAnonymousClassBody(ancestor)) || null;
}

function enclosingMethod(node) {
  return node.ancestors().find((ancestor) => kind(ancestor) === 'method_declaration') || null;
}

function classFields(typeNode) {
  const result = [];
  for (const field of directFields(typeNode)) {
    const declaredType = typeNodeOfField(field);
    const variableNodes = children(field).filter((child) => kind(child) === 'variable_declarator');
    for (const variable of variableNodes) {
      const name = nameText(variable);
      if (name && declaredType) result.push({ name, type: declaredType, declaration: variable, field: true });
    }
  }
  return result;
}

function typeNodeOfField(node) {
  return typeNode(node);
}

function variableDeclarators(node) {
  return children(node).filter((child) => kind(child) === 'variable_declarator');
}

function argumentCount(invocation) {
  const args = nodeField(invocation, 'arguments');
  return children(args).length;
}

function methodArity(method) {
  const params = nodeField(method, 'parameters');
  return children(params).filter((child) => ['formal_parameter', 'spread_parameter'].includes(kind(child))).length;
}

function isVarargs(method) {
  const params = nodeField(method, 'parameters');
  return children(params).some((child) => kind(child) === 'spread_parameter' || text(child).includes('...'));
}

function methodMatchesArity(method, count) {
  const arity = methodArity(method);
  return isVarargs(method) ? count >= arity - 1 : count === arity;
}

function containsRange(outer, inner) {
  return outer && inner && outer.range().start.index <= inner.range().start.index
    && outer.range().end.index >= inner.range().end.index;
}

function hasStaticModifier(node) {
  const modifiers = nodeField(node, 'modifiers');
  return children(modifiers).some((child) => kind(child) === 'static')
    || /(?:^|\s)static(?:\s|$)/.test(text(modifiers));
}

function typeDeclarations(nodes) {
  const result = new Map();
  for (const node of nodes) {
    if (!isClassLike(node)) continue;
    const name = declarationName(node);
    if (!name) continue;
    if (!result.has(name)) result.set(name, new Set());
    result.get(name).add(kind(node) === 'enum_declaration' ? 'enum' : 'other');
  }
  return result;
}

function typeStatus(type, declarations, imports) {
  const raw = typeof type === 'string' ? type : rawTypeName(type);
  if (!raw) return 'none';
  const simple = raw.split('.').at(-1);
  if (raw === 'java.lang.Enum' || simple === 'Enum') return 'enum';
  const known = declarations.get(simple);
  if (known?.size === 1) return known.has('enum') ? 'enum' : 'not-enum';
  if (known?.has('enum')) return 'ambiguous';

  const explicit = readTypeImports(imports, simple);
  if (explicit.size && !explicit.has(`java.lang.${simple}`)) return 'unknown';
  if (raw.startsWith('java.lang.') && raw.split('.').length > 3) return 'unknown';
  if (PRIMITIVE_OR_COMMON_TYPES.has(simple)) return 'not-enum';
  if (raw.startsWith('java.lang.') && simple !== 'Enum') return 'not-enum';
  if (/^(?:boolean|byte|char|double|float|int|long|short|void)$/.test(simple)) return 'not-enum';

  if (explicit.size === 1 || explicit.size > 1 || raw.includes('.')) return 'unknown';
  if (imports.wildcardPackages.size > 0 || simple) return 'unknown';
  return 'none';
}

function candidateTypeStatus(type, declarations, imports) {
  const status = typeStatus(type, declarations, imports);
  if (status === 'enum') return 'enum';
  if (status === 'not-enum' || status === 'none') return 'not-enum';
  return 'unknown';
}

function blockAncestorSet(node) {
  return new Set(node.ancestors().filter((ancestor) => kind(ancestor) === 'block').map((ancestor) => ancestor.id()));
}

function variableDeclarationsForMethod(method, classNode, call) {
  const definitions = [];
  if (!method) return definitions;

  const parameters = nodeField(method, 'parameters');
  for (const parameter of children(parameters)) {
    if (!['formal_parameter', 'spread_parameter'].includes(kind(parameter))) continue;
    const name = nameText(parameter);
    const declaredType = typeNode(parameter);
    if (name && declaredType) definitions.push({ name, type: declaredType, declaration: parameter, depth: -1, index: -1 });
  }

  const callBlocks = blockAncestorSet(call);
  const methodBody = nodeField(method, 'body');
  const descendants = findAllKinds(methodBody || method, ['local_variable_declaration', 'resource']);
  for (const declaration of descendants) {
    const declaredType = typeNode(declaration);
    if (!declaredType) continue;
    const statementBlocks = blockAncestorSet(declaration);
    const matchingScope = [...statementBlocks].filter((id) => callBlocks.has(id));
    if (!matchingScope.length) continue;
    const range = declaration.range();
    if (range.start.index > call.range().start.index) continue;
    const depth = matchingScope.length;
    for (const variable of variableDeclarators(declaration)) {
      const name = nameText(variable);
      if (name) definitions.push({ name, type: declaredType, declaration: variable, depth,
        index: variable.range().start.index });
    }
  }

  for (const field of classFields(classNode)) definitions.push({ ...field, depth: -2, index: -2 });

  for (const loop of findAllKinds(methodBody || method, ['enhanced_for_statement'])) {
    const body = nodeField(loop, 'body');
    if (!containsRange(body, call)) continue;
    const name = nameText(loop);
    const declaredType = typeNode(loop);
    if (name && declaredType) definitions.push({ name, type: declaredType, declaration: loop,
      depth: blockAncestorSet(call).size + 1, index: loop.range().start.index });
  }

  for (const lambda of findAllKinds(methodBody || method, ['lambda_expression'])) {
    const body = nodeField(lambda, 'body');
    if (!containsRange(body, call)) continue;
    const parameters = nodeField(lambda, 'parameters');
    const lambdaParams = kind(parameters) === 'identifier' ? [parameters]
      : children(parameters).filter((item) => ['formal_parameter', 'spread_parameter'].includes(kind(item)));
    for (const parameter of lambdaParams) {
      const name = kind(parameter) === 'identifier' ? text(parameter) : nameText(parameter);
      if (!name) continue;
      let declaredType = typeNode(parameter);
      if (!declaredType) {
        const ownerCall = lambda.ancestors().find((ancestor) => kind(ancestor) === 'method_invocation'
          && containsRange(nodeField(ancestor, 'arguments'), lambda));
        const receiver = ownerCall && nodeField(ownerCall, 'object');
        const receiverType = collectionElementTypeForExpression(receiver, definitions, call, classNode, method);
        declaredType = genericResultType(receiverType, nameText(ownerCall)) || receiverType;
      }
      definitions.push({ name, type: declaredType, declaration: parameter,
        ambiguous: !declaredType, depth: blockAncestorSet(call).size + 1, index: lambda.range().start.index });
    }
  }
  return definitions;
}

function findVariableType(name, call, classNode, method) {
  if (!name || !classNode) return null;
  const definitions = variableDeclarationsForMethod(method, classNode, call)
    .filter((item) => item.name === name);
  if (!definitions.length) return null;
  definitions.sort((a, b) => b.depth - a.depth || b.index - a.index);
  const best = definitions[0];
  const equallyScoped = definitions.filter((item) => item.depth === best.depth && item.index === best.index);
  const typeTexts = new Set(equallyScoped.map((item) => text(item.type)));
  return { type: best.type, ambiguous: best.ambiguous === true || typeTexts.size > 1 };
}

function findClassFieldType(name, classNode) {
  const matches = classFields(classNode).filter((item) => item.name === name);
  if (!matches.length) return null;
  const types = new Set(matches.map((item) => text(item.type)));
  return { type: matches[0].type, ambiguous: types.size > 1 };
}

function findDefinitionType(name, definitions) {
  const matches = definitions.filter((item) => item.name === name)
    .sort((a, b) => b.depth - a.depth || b.index - a.index);
  return matches[0]?.type || null;
}

function genericArguments(type) {
  if (!type) return [];
  if (kind(type) === 'array_type') {
    const base = children(type).find((child) => TYPE_KINDS.has(kind(child)));
    return base ? [base] : [];
  }
  const argumentsNode = findAllKinds(type, ['type_arguments'])[0];
  return children(argumentsNode);
}

function genericResultType(type, methodName) {
  if (!type) return null;
  const args = genericArguments(type);
  if (!args.length) return null;
  const raw = rootTypeName(type).split('.').at(-1);
  if (['get', 'getOrDefault'].includes(methodName) && raw === 'Map') return args[1] || null;
  return args[0] || null;
}

function collectionElementTypeForExpression(expression, definitions, call, classNode, method, depth = 0) {
  if (!expression || depth > 5) return null;
  const expressionKind = kind(expression);
  if (expressionKind === 'identifier') return findDefinitionType(text(expression), definitions);
  if (expressionKind === 'field_access' && kind(nodeField(expression, 'object')) === 'this') {
    return findDefinitionType(text(nodeField(expression, 'field')), definitions);
  }
  if (expressionKind === 'array_access') {
    const array = nodeField(expression, 'array') || children(expression)[0];
    return collectionElementTypeForExpression(array, definitions, call, classNode, method, depth + 1);
  }
  if (expressionKind !== 'method_invocation') return null;
  const owner = nodeField(expression, 'object');
  const name = nameText(expression);
  if (!owner) {
    const matches = directMethods(classNode).filter((item) => nameText(item) === name
      && methodMatchesArity(item, argumentCount(expression)));
    const types = matches.map(typeNode).filter(Boolean);
    return types.length && types.every((item) => text(item) === text(types[0])) ? types[0] : null;
  }
  if (['stream', 'findFirst', 'findAny', 'get'].includes(name)) {
    const ownerType = kind(owner) === 'method_invocation'
      ? collectionElementTypeForExpression(owner, definitions, call, classNode, method, depth + 1)
      : collectionElementTypeForExpression(owner, definitions, call, classNode, method, depth + 1);
    return name === 'stream' || ['findFirst', 'findAny', 'get'].includes(name)
      ? genericResultType(ownerType, name) || ownerType : null;
  }
  const ownerType = collectionElementTypeForExpression(owner, definitions, call, classNode, method, depth + 1);
  return genericResultType(ownerType, name);
}

function enumTypeByName(name, declarations, imports) {
  if (!name) return 'not-enum';
  const simple = name.split('.').at(-1);
  const status = typeStatus(name, declarations, imports);
  if (status === 'enum') return 'enum';
  if (status === 'not-enum') return 'not-enum';
  return declarations.has(simple) || imports.explicitTypes.has(simple) || name.includes('.') || /^[A-Z]/.test(simple)
    ? 'unknown' : 'not-enum';
}

function staticWildcardConstantStatus(name, declarations, imports, classNodes) {
  if (!/^[A-Z][A-Z0-9_]*$/.test(name) || !imports.staticWildcards.size) return 'not-enum';
  const statuses = [...imports.staticWildcards].map((owner) => enumTypeByName(owner, declarations, imports));
  for (const declaration of classNodes.filter((node) => kind(node) === 'enum_declaration')) {
    if (!imports.staticWildcards.has(declarationName(declaration))
      && ![...imports.staticWildcards].some((owner) => owner.split('.').at(-1) === declarationName(declaration))) continue;
    const body = directChild(declaration, new Set(['enum_body']));
    if (children(body).some((constant) => kind(constant) === 'enum_constant' && nameText(constant) === name)) return 'enum';
  }
  return statuses.includes('unknown') ? 'unknown' : 'not-enum';
}

function inferExpressionEnumStatus(expression, call, context, declarations, imports, classNodes, depth = 0) {
  if (!expression || depth > 5) return 'unknown';
  const expressionKind = kind(expression);

  if (expressionKind === 'parenthesized_expression') {
    return inferExpressionEnumStatus(children(expression)[0], call, context, declarations, imports, classNodes, depth + 1);
  }
  if (expressionKind === 'cast_expression') {
    const declaredType = typeNode(expression);
    return declaredType ? candidateTypeStatus(declaredType, declarations, imports) : 'unknown';
  }
  if (expressionKind === 'string_literal' || expressionKind === 'character_literal'
    || expressionKind.endsWith('_integer_literal') || expressionKind.endsWith('_floating_point_literal')
    || expressionKind === 'true' || expressionKind === 'false' || expressionKind === 'null_literal') return 'not-enum';

  if (expressionKind === 'identifier') {
    const importedOwners = imports.staticMembers.get(text(expression));
    if (importedOwners?.size) {
      const statuses = [...importedOwners].map((owner) => enumTypeByName(owner, declarations, imports));
      if (statuses.every((status) => status === 'enum')) return 'enum';
      if (statuses.some((status) => status !== 'not-enum')) return 'unknown';
      return 'not-enum';
    }
    const wildcardStatus = staticWildcardConstantStatus(text(expression), declarations, imports, classNodes);
    if (wildcardStatus !== 'not-enum') return wildcardStatus;
    const variable = findVariableType(text(expression), call, context.classNode, context.methodNode);
    if (variable) {
      if (variable.ambiguous) return 'unknown';
      return candidateTypeStatus(variable.type, declarations, imports);
    }
    const simple = text(expression).split('.').at(-1);
    return declarations.has(simple) || imports.explicitTypes.has(simple)
      ? enumTypeByName(text(expression), declarations, imports) : 'unknown';
  }

  if (expressionKind === 'field_access') {
    const object = nodeField(expression, 'object');
    const field = nodeField(expression, 'field');
    if (!object || !field) return 'unknown';
    if (kind(object) === 'this') {
      const variable = findClassFieldType(text(field), context.classNode);
      if (!variable) return 'unknown';
      return variable.ambiguous ? 'unknown' : candidateTypeStatus(variable.type, declarations, imports);
    }
    if (kind(object) === 'identifier') {
      const ownerStatus = enumTypeByName(text(object), declarations, imports);
      if (ownerStatus !== 'not-enum') return ownerStatus;
      const receiverVariable = findVariableType(text(object), call, context.classNode, context.methodNode);
      if (receiverVariable && ENUM_LIKE_MEMBER.test(text(field))) return 'unknown';
    }
    return 'unknown';
  }

  if (expressionKind === 'array_access') {
    const definitions = variableDeclarationsForMethod(context.methodNode, context.classNode, call);
    const array = nodeField(expression, 'array') || children(expression)[0];
    const arrayType = collectionElementTypeForExpression(array, definitions, call, context.classNode, context.methodNode);
    const elementType = genericResultType(arrayType, 'get') || arrayType;
    return elementType ? candidateTypeStatus(elementType, declarations, imports) : 'unknown';
  }

  if (expressionKind === 'method_invocation') {
    const owner = nodeField(expression, 'object');
    const name = nameText(expression);
    if (owner) {
      if (['get', 'getOrDefault', 'stream', 'findFirst', 'findAny'].includes(name)) {
        const definitions = variableDeclarationsForMethod(context.methodNode, context.classNode, call);
        const resultType = collectionElementTypeForExpression(expression, definitions, call,
          context.classNode, context.methodNode);
        return resultType ? candidateTypeStatus(resultType, declarations, imports) : 'unknown';
      }
      return 'unknown';
    }
    const matches = directMethods(context.classNode).filter((method) => nameText(method) === name
      && methodMatchesArity(method, argumentCount(expression)));
    const types = matches.map(typeNode).filter(Boolean);
    if (!types.length) return 'unknown';
    const statuses = types.map((type) => candidateTypeStatus(type, declarations, imports));
    if (statuses.every((status) => status === 'enum')) return 'enum';
    if (statuses.every((status) => status === 'not-enum')) return 'not-enum';
    return 'unknown';
  }

  return 'unknown';
}

function ordinalIsCompared(call) {
  let current = call;
  for (let hops = 0; hops < 3; hops += 1) {
    current = current.parent?.() || null;
    if (!current) break;
    if (kind(current) === 'binary_expression') return true;
    if (['expression_statement', 'method_declaration'].includes(kind(current))) break;
  }
  return false;
}

function enclosingTypeHasSupertype(typeNode) {
  if (isAnonymousClassBody(typeNode)) return true;
  const supertype = nodeField(typeNode, 'superclass');
  const interfaces = nodeField(typeNode, 'interfaces');
  return Boolean(supertype || interfaces);
}

function rootTypeName(type) {
  return rawTypeName(type);
}

function catchTypeText(parameter) {
  const type = directChild(parameter, new Set(['catch_type']))
    || children(parameter).find((child) => TYPE_KINDS.has(kind(child)));
  return text(type);
}

function hasCatchParameterReference(body, parameterName) {
  if (!parameterName) return false;
  const candidates = findAllKinds(body, ['identifier']).filter((node) => text(node) === parameterName);
  for (const candidate of candidates) {
    const parent = candidate.parent?.();
    const grandparent = parent?.parent?.();
    if (kind(parent) === 'field_access' && nodeField(parent, 'field')?.id() === candidate.id()) continue;
    if (['variable_declarator', 'formal_parameter', 'spread_parameter', 'catch_formal_parameter'].includes(kind(parent))) continue;
    if (kind(grandparent) === 'field_access' && nodeField(grandparent, 'field')?.id() === candidate.id()) continue;
    return true;
  }
  return false;
}

function hasLogCall(body) {
  return findAllKinds(body, ['method_invocation']).some((node) => LOG_METHODS.has(nameText(node)));
}

function rawTypeMatchesRequestCandidate(type, imports) {
  const raw = rootTypeName(type);
  if (!raw) return 'none';
  if (raw === 'java.util.Map') return 'yes';
  if (raw.endsWith('.JsonNode')) return 'yes';
  if (raw === 'Map') {
    const explicit = readTypeImports(imports, 'Map');
    if ([...explicit].some((value) => value === 'java.util.Map')) return 'yes';
    if (explicit.size) return 'no';
    if (imports.wildcardPackages.has('java.util')) return 'yes';
    return 'unknown';
  }
  if (raw === 'JsonNode') {
    const explicit = readTypeImports(imports, 'JsonNode');
    if (explicit.size) return 'yes';
    return 'unknown';
  }
  return 'none';
}

function hasPOType(type) {
  if (!type) return [];
  return findAllKinds(type, ['type_identifier', 'scoped_type_identifier', 'identifier'])
    .filter((node) => text(node).split('.').at(-1).endsWith('PO'));
}

function packageName(root) {
  const declaration = children(root).find((node) => kind(node) === 'package_declaration');
  const scoped = declaration && children(declaration).find((node) => ['identifier', 'scoped_identifier'].includes(kind(node)));
  return text(scoped);
}

function topLevelClasses(root) {
  return children(root).filter(isClassLike);
}

const CONTROLLER_ANNOTATIONS = [
  ['RestController', 'org.springframework.web.bind.annotation.RestController'],
  ['Controller', 'org.springframework.stereotype.Controller'],
  ['Controller', 'org.springframework.web.bind.annotation.Controller'],
];
const ADVICE_ANNOTATIONS = [
  ['RestControllerAdvice', 'org.springframework.web.bind.annotation.RestControllerAdvice'],
  ['ControllerAdvice', 'org.springframework.web.bind.annotation.ControllerAdvice'],
];

function reportControllerCandidate(ctx, rule, classNode, candidateNodes, status) {
  if (status !== 'unknown') return;
  for (const node of candidateNodes) {
    ctx.unresolved(rule, node || classNode, 'Controller annotation unresolved');
  }
}

function inspectJ10(ctx, calls, classNodes, imports) {
  const declarations = typeDeclarations(classNodes);
  for (const call of calls) {
    const methodName = nameText(call);
    const object = nodeField(call, 'object');
    if (!object) continue;
    const classNode = enclosingClass(call);
    const methodNode = enclosingMethod(call);
    const context = { classNode, methodNode };

    if (methodName === 'equals' && argumentCount(call) === 1) {
      const receiverStatus = inferExpressionEnumStatus(object, call, context, declarations, imports, classNodes);
      if (receiverStatus === 'enum') ctx.issue('J10', call, 'enum equals()');
      else if (receiverStatus === 'unknown') ctx.unresolved('J10', call, 'equals() enum type unresolved');
      continue;
    }

    if (methodName === 'ordinal' && argumentCount(call) === 0 && ordinalIsCompared(call)) {
      const receiverStatus = inferExpressionEnumStatus(object, call, context, declarations, imports, classNodes);
      if (receiverStatus === 'enum') ctx.issue('J10', call, 'enum ordinal() comparison');
      else if (receiverStatus === 'unknown') ctx.unresolved('J10', call, 'ordinal() owner unresolved');
    }
  }
}

function inspectJ11(ctx, imports) {
  const configured = Array.isArray(ctx.settings?.EXPLICIT_UTILITY_CLASSES)
    ? ctx.settings.EXPLICIT_UTILITY_CLASSES.filter((value) => typeof value === 'string')
    : DEFAULT_UTILITY_CLASSES;
  const utilityClasses = new Set(configured);
  for (const { node, path, isStatic } of imports.imports) {
    if (!isStatic || path.endsWith('.*')) continue;
    const className = path.substring(0, path.lastIndexOf('.'));
    if (className.endsWith('Util') || utilityClasses.has(className)) {
      ctx.issue('J11', node, 'static utility import');
    }
  }
}

function inspectJ12(ctx, calls, imports, optIn) {
  if (!optIn) return;
  for (const call of calls.filter((node) => !nodeField(node, 'object'))) {
    const classNode = enclosingClass(call);
    if (!classNode) continue;
    const name = nameText(call);
    const candidates = directMethods(classNode).filter((method) => nameText(method) === name
      && methodMatchesArity(method, argumentCount(call)));
    if (!candidates.length) continue;

    const instanceCandidates = candidates.filter((method) => !hasStaticModifier(method));
    if (!instanceCandidates.length) {
      if (enclosingTypeHasSupertype(classNode) && candidates.length) {
        ctx.unresolved('J12', call, `${name}() owner unresolved`);
      }
      continue;
    }
    if (instanceCandidates.length !== candidates.length) {
      ctx.unresolved('J12', call, `${name}() owner unresolved`);
      continue;
    }

    const staticImports = imports.staticMembers.get(name);
    const hasStaticWildcard = imports.imports.some((entry) => entry.isStatic && entry.path.endsWith('.*'));
    if (staticImports?.size || hasStaticWildcard) {
      ctx.unresolved('J12', call, `${name}() owner unresolved`);
      continue;
    }
    if (isAnonymousClassBody(classNode)) {
      if (candidates.length === 1 && methodArity(candidates[0]) === 0 && argumentCount(call) === 0) {
        ctx.issue('J12', call, 'add this.');
      } else {
        ctx.unresolved('J12', call, `${name}() owner unresolved`);
      }
      continue;
    }
    if (enclosingTypeHasSupertype(classNode)) {
      ctx.unresolved('J12', call, `${name}() owner unresolved`);
      continue;
    }
    const enclosingMethodNode = enclosingMethod(call);
    if (enclosingMethodNode && hasStaticModifier(enclosingMethodNode)) {
      ctx.unresolved('J12', call, `${name}() owner unresolved`);
      continue;
    }
    ctx.issue('J12', call, 'add this.');
  }
}

function inspectJ13(ctx, classNodes, imports) {
  for (const classNode of classNodes) {
    const methods = directMethods(classNode);
    const candidates = methods.flatMap((method) => hasPOType(typeNode(method)).map((type) => ({ method, type })));
    if (!candidates.length) continue;
    const status = anyAnnotationStatus(classNode, CONTROLLER_ANNOTATIONS, imports);
    if (status === 'yes') {
      for (const { type } of candidates) ctx.issue('J13', type, 'Controller returns PO');
    } else if (status === 'unknown') {
      reportControllerCandidate(ctx, 'J13', classNode, candidates.map(({ type }) => type), status);
    }
  }
}

function inspectJ14(ctx, methods, imports) {
  const handler = ['ExceptionHandler', 'org.springframework.web.bind.annotation.ExceptionHandler'];
  for (const method of methods) {
    const handlerStatus = annotationStatus(method, handler[0], handler[1], imports);
    if (handlerStatus === 'none' || handlerStatus === 'no') continue;
    const owner = enclosingClass(method);
    if (!owner) continue;
    const adviceStatus = anyAnnotationStatus(owner, ADVICE_ANNOTATIONS, imports);
    if (adviceStatus === 'yes') continue;
    const controllerStatus = anyAnnotationStatus(owner, CONTROLLER_ANNOTATIONS, imports);
    if (controllerStatus === 'no' || controllerStatus === 'none') continue;
    if (handlerStatus === 'unknown') {
      ctx.unresolved('J14', nameNode(method) || method, '@ExceptionHandler unresolved');
    } else if (controllerStatus === 'yes' && adviceStatus === 'none') {
      ctx.issue('J14', nameNode(method) || method, 'controller-local exception handler');
    } else if (controllerStatus === 'unknown' || adviceStatus === 'unknown') {
      ctx.unresolved('J14', nameNode(method) || method, 'Controller/Advice annotation unresolved');
    }
  }
}

function inspectJ15(ctx, classNodes, imports, optIn) {
  if (!optIn) return;
  for (const classNode of classNodes) {
    const candidates = [];
    for (const method of directMethods(classNode)) {
      const params = children(nodeField(method, 'parameters'))
        .filter((node) => ['formal_parameter', 'spread_parameter'].includes(kind(node)));
      for (const parameter of params) {
        const parameterType = typeNode(parameter);
        const typeStatusValue = rawTypeMatchesRequestCandidate(parameterType, imports);
        if (typeStatusValue === 'none' || typeStatusValue === 'no') continue;
        const requestBodyStatus = annotationStatus(parameter, 'RequestBody',
          'org.springframework.web.bind.annotation.RequestBody', imports);
        if (requestBodyStatus === 'none' || requestBodyStatus === 'no') continue;
        candidates.push({ parameter, typeStatus: typeStatusValue, requestBodyStatus });
      }
    }
    if (!candidates.length) continue;
    const controllerStatus = anyAnnotationStatus(classNode, CONTROLLER_ANNOTATIONS, imports);
    if (controllerStatus === 'no' || controllerStatus === 'none') continue;
    for (const { parameter, typeStatus: bodyTypeStatus, requestBodyStatus } of candidates) {
      if (controllerStatus === 'unknown') {
        ctx.unresolved('J15', parameter, 'Controller annotation unresolved');
      } else if (requestBodyStatus === 'unknown') {
        ctx.unresolved('J15', parameter, '@RequestBody unresolved');
      } else if (bodyTypeStatus === 'unknown') {
        ctx.unresolved('J15', parameter, 'request body type unresolved');
      } else {
        ctx.issue('J15', parameter, 'Use typed request body');
      }
    }
  }
}

function inspectJ16(ctx, root) {
  const suffixByPackage = {
    controller: 'Controller',
    mapper: 'Mapper',
    manage: 'Manage',
    param: 'Param',
    dto: 'DTO',
    vo: 'VO',
    po: 'PO',
    converter: 'Converter',
    impl: 'Impl',
    service: 'Service',
  };
  const pkg = packageName(root);
  const required = suffixByPackage[pkg.split('.').at(-1)];
  if (!required) return;
  for (const type of topLevelClasses(root)) {
    if (pkg.split('.').at(-1) === 'service' && !isInterfaceLike(type)) continue;
    const name = declarationName(type);
    if (name && !name.endsWith(required)) {
      ctx.issue('J16', nameNode(type) || type, `Expected suffix ${required}`);
    }
  }
}

function inspectJ18(ctx, root, imports) {
  const pkg = packageName(root);
  const firstClass = topLevelClasses(root)[0];
  if (pkg.endsWith('.config') || declarationName(firstClass).endsWith('Config')) return;
  for (const { node, path } of imports.imports) {
    const fqn = path.replace(/^static\s+/, '');
    if (fqn.startsWith('com.baomidou.mybatisplus.extension.plugins.')
      && !fqn.startsWith('com.baomidou.mybatisplus.extension.plugins.pagination.')) {
      ctx.issue('J18', node, 'MyBatis-Plus plugin outside config');
    }
  }
}

function inspectJ19(ctx, sections, detectSilentSwallow) {
  for (const section of sections) {
    const parameter = directChild(section, new Set(['catch_formal_parameter']));
    const body = nodeField(section, 'body') || children(section).find((child) => kind(child) === 'block');
    if (!parameter || !body) continue;

    const inner = text(body).replace(/^\s*\{/, '').replace(/\}\s*$/, '').trim();
    if (!inner) {
      ctx.issue('J19', section, 'empty catch');
      continue;
    }
    if (!detectSilentSwallow || /\bInterruptedException\b/.test(catchTypeText(parameter))) continue;
    const parameterName = nameText(parameter);
    if (hasCatchParameterReference(body, parameterName) || hasLogCall(body) || /\bthrow\b/.test(text(body))) continue;
    ctx.issue('J19', section, 'silent catch');
  }
}

export function inspectJ10J19(ctx) {
  if (!ctx?.root || typeof ctx.issue !== 'function' || typeof ctx.unresolved !== 'function') {
    throw new TypeError('inspectJ10J19 requires root, issue, and unresolved');
  }

  const root = ctx.root;
  const classNodes = findAllKinds(root, TYPE_DECLARATION_KINDS);
  const methods = findAllKinds(root, ['method_declaration']);
  const calls = findAllKinds(root, ['method_invocation']);
  const catchSections = findAllKinds(root, ['catch_clause']);
  const importNodes = findAllKinds(root, ['import_declaration']);
  const imports = parseImports(importNodes);
  const optIn = ctx.settings?.OPT_IN !== false;
  const detectSilentSwallow = ctx.settings?.DETECT_SILENT_SWALLOW === true;

  inspectJ10(ctx, calls, classNodes, imports);
  inspectJ11(ctx, imports);
  inspectJ12(ctx, calls, imports, optIn);
  inspectJ13(ctx, classNodes, imports);
  inspectJ14(ctx, methods, imports);
  inspectJ15(ctx, classNodes, imports, optIn);
  inspectJ16(ctx, root);
  inspectJ18(ctx, root, imports);
  inspectJ19(ctx, catchSections, detectSilentSwallow);
}
