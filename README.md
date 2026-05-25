# RainPath — Workflow Editor

Éditeur visuel de workflows de relance patient pour laboratoires d'anatomopathologie.
Un chef de laboratoire compose sa séquence de relance multi-canaux (Email, SMS, WhatsApp,
courrier postal), branche selon disponibilité des données patient et résultats d'envoi,
et suit l'avancement des patients via un dashboard.

> Projet réalisé dans le cadre du mini-projet technique d'entretien RainPath.
> Aucun envoi réel : les canaux sont simulés. Pas d'authentification dans le scope.

---

## Stack

- **Front** : Vite + React 18 + TypeScript + `@xyflow/react` v12 + shadcn/ui + Tailwind
- **Back** : NestJS v10 + Prisma + SQLite (JSON column pour le graphe)
- **Validation** : Zod, schemas partagés front / back via package workspace
- **Tests** : Vitest (front) + Jest (back)
- **Monorepo** : pnpm workspaces

Détail des choix et alternatives écartées : voir [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).
Contexte de driving des agents IA : voir [`CLAUDE.md`](./CLAUDE.md).

## Quick start

```bash
pnpm install
pnpm db:reset    # crée la DB SQLite, applique les migrations, seed les données factices
pnpm dev         # lance front + back en parallèle
```

- Front : http://localhost:5173
- Back : http://localhost:3000

## Structure

```
apps/
  web/              Frontend Vite + React
  api/              Backend NestJS + Prisma
packages/
  schemas/          Zod schemas partagés (source de vérité)
docs/
  ARCHITECTURE.md   Décisions techniques (ADR)
```

## Tests

```bash
pnpm test                # toutes les suites avec coverage
pnpm --filter web test   # uniquement le front
pnpm --filter api test   # uniquement le back
```

Cible de coverage : ≥ 85% global.

## Décisions clés

Voir [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) pour le détail des ADR :

- ADR-001 : Choix de la stack (React Flow vs alternatives, shadcn vs autres UI kits…)
- ADR-002 : Stockage JSON column versionné validé Zod
- ADR-003 : React Flow controlled mode obligatoire
- ADR-004 : Notification secrétariat (config workflow + override par node)

## Préparation entretien (§7 du brief)

### Ce qui me satisfait

_À compléter en fin de sprint._

### Ce que j'aurais amélioré avec plus de temps

_À compléter en fin de sprint._

### Ce qui est manquant ou incomplet

_À compléter en fin de sprint._

### Choix techniques que je défendrais

_À compléter en fin de sprint, en référence aux ADR du document Architecture._

---

## Notes

Projet à but démonstratif, pas de licence définie.
