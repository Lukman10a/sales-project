/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-db-in-controllers',
      comment:
        'Controllers must not import database drivers, TypeORM, entities, or repositories.',
      severity: 'error',
      from: { path: '^src/.*\\.controller\\.ts$' },
      to: {
        dependencyTypesNot: ['type-only'],
        path: [
          '^src/entities/',
          '^src/.*\\.repository\\.ts$',
          '^src/database/',
          '^node_modules/(typeorm|@nestjs/typeorm)',
        ],
      },
    },
    {
      name: 'no-db-in-services',
      comment:
        'Services must query data only through the colocated repository layer.',
      severity: 'error',
      from: { path: '^src/.*\\.service\\.ts$' },
      to: {
        dependencyTypesNot: ['type-only'],
        path: [
          '^src/entities/',
          '^src/database/',
          '^node_modules/(typeorm|@nestjs/typeorm)',
        ],
      },
    },
    {
      name: 'no-business-logic-in-repositories',
      comment:
        'Repositories must not depend on controllers, guards, services, or business-layer libraries (bcrypt, jwt, event-emitter).',
      severity: 'error',
      from: { path: '^src/.*\\.repository\\.ts$' },
      to: {
        path: [
          '^src/.*\\.controller\\.ts$',
          '^src/.*\\.guard\\.ts$',
          '^src/.*\\.service\\.ts$',
          '^node_modules/(bcrypt|@nestjs/jwt|@nestjs/event-emitter)',
        ],
      },
    },
    {
      name: 'no-business-logic-in-entities',
      comment:
        'Entities must only import TypeORM decorators and sibling entities.',
      severity: 'error',
      from: { path: '^src/entities/.*\\.entity\\.ts$' },
      to: {
        path: [
          '^src/.*\\.service\\.ts$',
          '^src/.*\\.repository\\.ts$',
          '^src/.*\\.controller\\.ts$',
        ],
      },
    },
    {
      name: 'no-circular-dependencies',
      severity: 'error',
      comment:
        'The dependency graph must stay acyclic (entity relation cycles are inherent to TypeORM and excluded).',
      from: { pathNot: '^src/entities/' },
      to: { circular: true, pathNot: '^src/entities/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
    },
  },
};