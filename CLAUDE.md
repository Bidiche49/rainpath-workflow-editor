# RainPath Workflow Editor — instructions Claude Code

> Chargé à chaque session. Court par discipline.
> Sources de vérité : `package.json` (versions), `docs/ARCHITECTURE.md` (décisions),
> `apps/api/prisma/schema.prisma` (modèle DB), `packages/schemas/src/` (Zod canoniques).

## Identité projet

Éditeur visuel de workflows de relance patient pour laboratoires d'anatomopathologie.
Un chef de labo dessine une séquence de relance (Email/SMS/WhatsApp/Courrier postal,
délais, conditions), la sauvegarde, et suit l'avancement des patients via dashboard.
Aucun envoi réel : tout est simulé pour le périmètre de ce projet technique.

## Stack

- TypeScript 5.x strict + pnpm workspaces
- Front : Vite + React 18 + `@xyflow/react` v12 + shadcn/ui + Tailwind + dagre + sonner + React Router
- Back : NestJS v10 + Prisma + SQLite (JSON column pour `graph` et `settings`)
- Validation : Zod côté front ET back, schemas partagés via `@rainpath/schemas`
- Tests : Vitest (front + schemas) + Jest (back, natif Nest)

## Structure du repo

```
apps/
  web/              Vite + React + @xyflow/react + shadcn
  api/              NestJS + Prisma + SQLite (prisma/ à la racine du workspace)
packages/
  schemas/          Zod canoniques (source de vérité des types runtime)
docs/
  ARCHITECTURE.md   ADR + décisions structurantes
```

## Lectures obligatoires en début de session

1. `docs/ARCHITECTURE.md` — décisions structurantes + ADR
2. `package.json` racine et chaque workspace — versions exactes (NE JAMAIS halluciner)
3. `apps/api/prisma/schema.prisma` — modèle de données canonique
4. `packages/schemas/src/` — schemas Zod, source de vérité des types runtime

## Conventions non négociables

- Schemas Zod dans `packages/schemas/`, jamais inline dans le code métier
- Composants shadcn dans `apps/web/src/components/ui/` (générés, ne pas réécrire)
- React Flow **controlled mode obligatoire** (state externe via hook `useWorkflowEditor`)
- Migrations Prisma par feature, jamais de modif schema sans migration
- Conventional Commits **titre FR + body EN court** (cf `.gitmessage`)
- Tests colocalisés `*.spec.ts` (back, Jest) ou `*.test.ts` (front, Vitest)

## Anti-patterns spécifiques à éviter dans CE repo

- React Flow uncontrolled → casse persistance, undo/redo, tests
- Lecture du JSON column `graph` sans `WorkflowGraphSchema.parse()` Zod
- Duplication des schemas Zod front/back → toujours importer depuis `@rainpath/schemas`
- Hardcoder l'email du secrétariat → toujours via `Workflow.settings.notificationEmail`
- Renommer composants shadcn générés → casse les régénérations futures
- Mélanger `reactflow` (v11) et `@xyflow/react` (v12) → EXCLUSIVEMENT `@xyflow/react` v12
- Commit du fichier `mini_projet_technique.md` (brief privé, gitignored — NE JAMAIS tenter)

## Décision archi clé : stockage JSON + Zod versionné

- `Workflow.graph` est une colonne JSON validée Zod à l'écriture ET à la lecture
- `Workflow.schemaVersion: number` (default 1) pour évolution future
- Migrations de schema (v1 → v2…) dans `packages/schemas/src/migrations/`
- Lecture systématique : `schemaVersion → migrate(graph, version) → WorkflowGraphSchemaLatest.parse()`
- Détail : `docs/ARCHITECTURE.md` § ADR-002

## Commandes

- `pnpm dev` — front + back en parallèle
- `pnpm test` — toutes les suites avec coverage
- `pnpm typecheck` — `tsc --noEmit` sur tout
- `pnpm lint` — ESLint sur tout
- `pnpm db:reset` — wipe SQLite + migrate + seed
- `pnpm db:seed` — seed workflows + patients + action logs factices

## État actuel

_Mis à jour à chaque fin de phase du sprint._

- **Phase courante** : Fondation (init repo, scaffolding)
- **Dernier milestone** : —
- **Prochain blocker** : aucun. Tâche suivante : init Git + repo GitHub public via `gh cli`.
