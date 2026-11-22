import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import * as ts from 'typescript';

/**
 * Static guard for tenant isolation (T33). Every repository that holds
 * business data takes `businessId` as its first argument, and services may
 * only call the methods a repository declares, never TypeORM's inherited
 * `find`/`save`/`remove`, which carry no tenant.
 */

const SRC = join(__dirname, '..', '..');

/** Repositories of identity data, which is keyed by user, not business. */
const IDENTITY_REPOSITORIES = new Set([
  'UsersRepository',
  'SessionsRepository',
  'AuthTokensRepository',
  'BackupCodesRepository',
  'UserProfileRepository',
  // Looks up a member row by (businessId, userId) for PrincipalService.
  'TeamMemberRepository',
]);

/** Deliberate cross-tenant methods, each with its reason. */
const CROSS_TENANT_METHODS = new Set([
  // The scheduled digest visits every tenant in turn.
  'NotificationsRepository.findAllBusinessIds',
]);

const ALWAYS_ALLOWED = new Set(['transaction']);

function sourceFiles(dir: string, suffixes: string[]): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path, suffixes);
    return suffixes.some((s) => name.endsWith(s)) && !name.endsWith('.spec.ts')
      ? [path]
      : [];
  });
}

function parse(path: string) {
  return ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
}

const isPrivate = (m: ts.ClassElement) =>
  ts.getCombinedModifierFlags(m) &
  (ts.ModifierFlags.Private | ts.ModifierFlags.Protected);

interface RepoInfo {
  file: string;
  methods: Map<string, ts.MethodDeclaration>;
}

function tenantRepositories(): Map<string, RepoInfo> {
  const repos = new Map<string, RepoInfo>();
  for (const file of sourceFiles(SRC, ['.repository.ts'])) {
    parse(file).forEachChild((node) => {
      if (!ts.isClassDeclaration(node) || !node.name) return;
      const name = node.name.text;
      if (IDENTITY_REPOSITORIES.has(name)) return;
      const methods = new Map<string, ts.MethodDeclaration>();
      for (const m of node.members) {
        if (ts.isMethodDeclaration(m) && ts.isIdentifier(m.name)) {
          if (!isPrivate(m)) methods.set(m.name.text, m);
        }
      }
      repos.set(name, { file: relative(SRC, file), methods });
    });
  }
  return repos;
}

describe('tenant repositories', () => {
  const repos = tenantRepositories();

  it('finds the tenant repositories', () => {
    expect([...repos.keys()]).toEqual(
      expect.arrayContaining([
        'InventoryRepository',
        'SalesRepository',
        'NotificationsRepository',
        'ReportsRepository',
        'TeamRepository',
        'AuditRepository',
        'AnalyticsRepository',
        'InsightRepository',
      ]),
    );
  });

  it('take businessId as the first argument of every method', () => {
    const violations: string[] = [];
    for (const [repo, { file, methods }] of repos) {
      for (const [name, method] of methods) {
        if (ALWAYS_ALLOWED.has(name)) continue;
        if (CROSS_TENANT_METHODS.has(`${repo}.${name}`)) continue;
        const first = method.parameters[0];
        const firstName =
          first && ts.isIdentifier(first.name) ? first.name.text : undefined;
        if (firstName !== 'businessId') {
          violations.push(`${file}: ${repo}.${name}(${firstName ?? ''}...)`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('are only used through the methods they declare', () => {
    const violations: string[] = [];
    const callers = sourceFiles(SRC, [
      '.service.ts',
      '.listener.ts',
      '.controller.ts',
      '.engine.ts',
    ]);
    for (const file of callers) {
      const source = parse(file);
      // Constructor parameter name -> tenant repository class.
      const injected = new Map<string, string>();
      const visit = (node: ts.Node) => {
        if (ts.isConstructorDeclaration(node)) {
          for (const p of node.parameters) {
            const type =
              p.type && ts.isTypeReferenceNode(p.type) ? p.type : null;
            const typeName =
              type && ts.isIdentifier(type.typeName) ? type.typeName.text : '';
            if (repos.has(typeName) && ts.isIdentifier(p.name)) {
              injected.set(p.name.text, typeName);
            }
          }
        }
        if (
          ts.isPropertyAccessExpression(node) &&
          ts.isPropertyAccessExpression(node.expression) &&
          node.expression.expression.kind === ts.SyntaxKind.ThisKeyword
        ) {
          const repo = injected.get(node.expression.name.text);
          const method = node.name.text;
          if (repo && !repos.get(repo)!.methods.has(method)) {
            violations.push(`${relative(SRC, file)}: ${repo}.${method}`);
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    expect(violations).toEqual([]);
  });
});
