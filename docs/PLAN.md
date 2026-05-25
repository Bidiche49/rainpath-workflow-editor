# Sprint Plan — RainPath Workflow Editor

> Plan d'exécution du mini-projet technique. Cible 3h45-4h30 end-to-end.
> Conventions repo : `CLAUDE.md`. Décisions techniques : `docs/ARCHITECTURE.md`.
> Cible coverage tests : ≥ 85% global.

## Vision

Livrer un éditeur visuel de workflows de relance patient, avec :

1. Éditeur graphique fluide (drag, zoom, multi-select, auto-layout au reload)
2. Persistance CRUD via API NestJS + SQLite, schemas Zod versionnés
3. Notification secrétariat configurable (workflow + override par node)
4. Dashboard de suivi des relances (stats + table patients)
5. Patient view avec timeline et simulation d'étape (bonus brief)
6. Tests 85%+ coverage, README §7-compliant

## Stratégie d'exécution

| Phase | Mode | Durée | Justification |
|---|---|---|---|
| 0 — Fondation | Blast, 1 session Claude Code | ~75 min | Scaffolding bas risque |
| 1 — Cœur | 2 tracks parallèles (backend + frontend) | ~73 min | Schemas Zod figés en Phase 0, tracks indépendantes |
| 2 — Intégration | Ticket-par-ticket | ~92 min | Bugs d'intégration sensibles, supervision étroite |
| 3 — Polish | Blast | ~55 min | Routine, faible risque |

## Format des tickets

Chaque ticket = un commit. Format de commit : Conventional Commits FR (titre) + EN (body), cf `.gitmessage`.

Chaque ticket porte : ID, titre, temps cible, dépendances, acceptance criteria, message de commit attendu.

---

## Phase 0 — Fondation (sérielle, ~75 min)

### F-01 — Init pnpm workspaces
- **Temps** : 10 min — **Dépendances** : aucune
- **Acceptance** : `pnpm-workspace.yaml` créé (packages: `apps/*`, `packages/*`). `package.json` racine privé avec scripts placeholder (`dev`, `build`, `test`, `typecheck`, `lint`, `db:reset`, `db:seed`). `pnpm install` passe.
- **Commit** : `chore(repo): init pnpm workspaces avec structure apps et packages`

### F-02 — Configs partagées TS / ESLint / Prettier
- **Temps** : 8 min — **Dépendances** : F-01
- **Acceptance** : `tsconfig.base.json` strict (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes). ESLint flat config racine partagé. Prettier config racine partagée. `.prettierignore`. `pnpm lint` passe sur stubs.
- **Commit** : `chore(repo): tsconfig strict, ESLint flat config et Prettier partagés`

### F-03 — Husky + lint-staged + commitlint
- **Temps** : 5 min — **Dépendances** : F-02
- **Acceptance** : pre-commit hook lance prettier+eslint sur staged uniquement. commit-msg hook valide Conventional Commits (commitlint config qui autorise types feat/fix/refactor/chore/test/docs/style/perf).
- **Commit** : `chore(repo): husky pre-commit avec lint-staged et commitlint`

### F-04 — Scaffold packages/schemas
- **Temps** : 20 min — **Dépendances** : F-02
- **Acceptance** : package `@rainpath/schemas` avec exports :
  - `NodeSchema` (discriminated union sur `type`: `start | end | email | sms | whatsapp | letter | wait | condition`)
  - `EdgeSchema` (avec `sourceHandle` pour conditions Y/N)
  - `WorkflowGraphSchema` (`{ nodes, edges, viewport }`)
  - `WorkflowSettingsSchema` (`{ notificationEmail }`)
  - `WorkflowSchema` (id, name, description, schemaVersion, graph, settings, createdAt, updatedAt)
  - `ActionLogSchema`, `ExecutionStateSchema`
  - Règle Zod cross-fields : si `notifySecretariat === false`, `notificationEmailOverride` doit être absent
  - Types TS dérivés exportés (`z.infer`)
  - Vitest tests : cas valides + cas invalides (au moins 8 tests). Coverage ≥ 90%.
- **Commit** : `feat(schemas): Zod canoniques pour workflow, graph, settings et action logs`

### F-05 — Scaffold apps/api (NestJS + Prisma)
- **Temps** : 15 min — **Dépendances** : F-01
- **Acceptance** : NestJS app via CLI. Prisma init. `schema.prisma` avec :
  - Model `Workflow` (id String cuid, name, description?, schemaVersion Int @default(1), graph Json, settings Json, createdAt, updatedAt)
  - Model `ActionLog` (id, patientId, workflowId, nodeId, channel, status, message?, notifiedTo?, occurredAt)
  - Migration initiale appliquée. `prisma/seed.ts` skeleton (vide pour l'instant).
  - `pnpm --filter api dev` lance Nest sur :3000 avec route `/health` GET 200.
- **Commit** : `feat(api): scaffold NestJS, Prisma schema et migration initiale`

### F-06 — Scaffold apps/web (Vite + React + shadcn)
- **Temps** : 12 min — **Dépendances** : F-01
- **Acceptance** : Vite + React 18 + TS strict. Tailwind installé et configuré. shadcn init + composants : button, sheet, dialog, table, switch, input, alert, alert-dialog, tooltip, sonner. React Router v6 avec routes `/`, `/workflows`, `/workflows/:id/edit`, `/workflows/:id/preview`. Layout shell (topbar + main) visible. `pnpm --filter web dev` lance sur :5173.
- **Commit** : `feat(web): scaffold Vite, React, Tailwind, shadcn et routing`

### F-07 — Wiring monorepo (concurrently + workspace deps)
- **Temps** : 5 min — **Dépendances** : F-04, F-05, F-06
- **Acceptance** : `apps/api` et `apps/web` consomment `@rainpath/schemas` via workspace protocol. `pnpm dev` à la racine lance front + back en parallèle (via `concurrently` ou `turbo`). `pnpm test` lance toutes les suites. `pnpm typecheck` passe sur tout.
- **Commit** : `chore(repo): wiring final monorepo avec scripts unifiés`

---

## Phase 1 — Implémentation cœur (parallèle, ~73 min)

### Track A — Backend

#### A-01 — WorkflowModule CRUD
- **Temps** : 20 min — **Dépendances** : F-07
- **Acceptance** : module `Workflow` avec controller (POST /workflows, GET /workflows, GET /workflows/:id, PATCH /workflows/:id, DELETE /workflows/:id), service, DTO. `ZodValidationPipe` global qui valide les payloads contre `WorkflowSchema` partial selon la route. Payload invalide → 400 avec détail. 404 sur id inconnu. Pas de logique métier dans le controller.
- **Commit** : `feat(api): WorkflowModule CRUD avec validation Zod globale`

#### A-02 — ActionLogModule
- **Temps** : 10 min — **Dépendances** : A-01
- **Acceptance** : module `ActionLog` avec endpoints GET /action-logs?patientId=... et POST /action-logs. Types issus de `@rainpath/schemas`.
- **Commit** : `feat(api): ActionLogModule pour persistance des relances simulées`

#### A-03 — Seed complet
- **Temps** : 15 min — **Dépendances** : A-01, A-02
- **Acceptance** : `pnpm db:seed` crée 3 workflows (dont le scénario exact du brief en preset nommé "Scénario type J+7"), 15 patients fictifs répartis sur ces workflows à différents stades, ~50 ActionLog cohérents (un patient bloqué, un terminé, un en attente, etc.). Idempotent (db:reset wipe + migrate + seed).
- **Commit** : `feat(api): seed avec workflows démo, patients fictifs et action logs`

#### A-04 — Tests e2e backend
- **Temps** : 20 min — **Dépendances** : A-01, A-02
- **Acceptance** : Jest + supertest. Coverage workflow CRUD (cas nominal + erreurs 400/404). Coverage ActionLog. Validation Zod testée (payload invalide → 400). Coverage backend ≥ 85%. Tous tests verts.
- **Commit** : `test(api): e2e workflow et action log avec coverage 85%+`

### Track B — Frontend

#### B-01 — Hook useWorkflowEditor
- **Temps** : 25 min — **Dépendances** : F-07
- **Acceptance** : hook custom dans `apps/web/src/features/editor/hooks/useWorkflowEditor.ts`. State `{ nodes, edges, viewport, settings }`. Méthodes : `addNode(type, position)`, `removeNode(id)`, `updateNodeData(id, patch)`, `connectEdge(connection)`, `removeEdge(id)`, `setViewport(v)`, `updateSettings(patch)`. Validation cohérence (≥ 1 Start, ≥ 1 End atteignable depuis Start, pas de cycle infini). Tests Vitest `renderHook` ≥ 90% coverage.
- **Commit** : `feat(editor): hook useWorkflowEditor controlled mode avec validation`

#### B-02 — Custom nodes React Flow
- **Temps** : 25 min — **Dépendances** : B-01
- **Acceptance** : composants dans `apps/web/src/features/editor/nodes/` : StartNode, EndNode, EmailNode, SmsNode, WhatsAppNode, LetterNode, WaitNode, ConditionNode. Style Tailwind cohérent (icône lucide + label + status indicator + handles bien positionnés). ConditionNode a 2 handles de sortie avec ids `"yes"` et `"no"` + labels visuels. Tous typés via `@rainpath/schemas`.
- **Commit** : `feat(editor): custom nodes typés pour tous canaux et conditions`

#### B-03 — Canvas + sidebar drag-to-create
- **Temps** : 27 min — **Dépendances** : B-02
- **Acceptance** : composant `WorkflowCanvas` (React Flow setup : minimap, controls, background dots). Sidebar toolbar à gauche avec les types de nodes draggables. Drag d'un type vers le canvas → création à la position du curseur (conversion viewport coords via `useReactFlow`). Dagre auto-layout invoqué au mount initial après reload d'un workflow existant. Zoom/pan/multi-select fluides.
- **Commit** : `feat(editor): canvas React Flow avec drag-from-sidebar et dagre`

#### B-04 — NodeSidePanel avec notification
- **Temps** : 20 min — **Dépendances** : B-02
- **Acceptance** : `Sheet` shadcn s'ouvre sur sélection d'un node action. Édition props : `content` (textarea pour les messages), `delay` (pour WaitNode), `condition` (pour ConditionNode). Section "Notification interne" avec `Switch` `notifySecretariat` (default ON). Disclosure repliée "Personnaliser pour cette étape" avec `Alert` warning + `Input` email. Modifs propagées au state via `updateNodeData`.
- **Commit** : `feat(editor): NodeSidePanel avec édition props et notification secrétariat`

---

## Phase 2 — Intégration (sérielle, ~92 min)

### I-01 — API client typé
- **Temps** : 10 min — **Dépendances** : A-01, A-02, F-06
- **Acceptance** : `apps/web/src/lib/api/` avec fetch wrapper. Fonctions : `listWorkflows`, `getWorkflow`, `createWorkflow`, `updateWorkflow`, `deleteWorkflow`, `listActionLogs`, `createActionLog`. Types issus de `@rainpath/schemas`, validation Zod runtime sur les réponses. Erreurs propagées via toast sonner.
- **Commit** : `feat(web): API client typé bout-en-bout avec validation Zod runtime`

### I-02 — Page /workflows (liste)
- **Temps** : 15 min — **Dépendances** : I-01
- **Acceptance** : table shadcn (nom, description, nb nodes, updatedAt, actions). Bouton "Nouveau workflow" (crée + redirige vers /edit). Actions Ouvrir, Dupliquer, Supprimer (avec `AlertDialog` confirmation). Empty state si vide.
- **Commit** : `feat(web): page liste workflows avec actions CRUD`

### I-03 — Page /workflows/:id/edit
- **Temps** : 15 min — **Dépendances** : I-01, B-03, B-04
- **Acceptance** : layout full-screen (sidebar gauche toolbar, canvas central, side panel droit). Bouton Save explicite + Cmd+S. Delete key supprime sélection. Esc deselect. Dialog "Réglages workflow" (icône engrenage dans topbar) pour edit `settings.notificationEmail`. Toast feedback sur save/error.
- **Commit** : `feat(web): page éditeur workflow avec shortcuts et settings`

### I-04 — Dashboard /
- **Temps** : 20 min — **Dépendances** : I-01
- **Acceptance** : 4 cards stats (patients en cours / bloqués / relances cette semaine / terminés) calculées depuis ActionLog côté front. Table patients avec colonnes : nom, workflow associé, étape courante (badge + icône), statut, dernière action. Filtres par workflow et statut. Clic sur ligne → ouvre patient view.
- **Commit** : `feat(dashboard): landing avec stats et table patients`

### I-05 — Patient view /workflows/:id/preview
- **Temps** : 20 min — **Dépendances** : I-03
- **Acceptance** : canvas read-only (mode preview du `WorkflowCanvas`) avec highlighting des nodes (statut `current` / `done` / `pending`) propagé via `data.status`. Sidebar droite : timeline ActionLog (chronologique, icône par canal, status badge). Bouton "Simuler l'étape suivante" qui crée une ActionLog cohérente + avance `currentNodeId`. Bouton retour au workflow.
- **Commit** : `feat(patient-view): preview avec timeline ActionLog et simulation étape`

### I-06 — Validation visuelle graph
- **Temps** : 12 min — **Dépendances** : I-03
- **Acceptance** : badge rouge sur nodes orphelins (non atteignables depuis Start). Banner alert si pas de Start, pas de End atteignable, ou cycle infini. Tooltip explique l'erreur. Save autorisé mais toast warning si invalide.
- **Commit** : `feat(editor): validation visuelle cohérence du graphe`

---

## Phase 3 — Polish & livrable (sérielle, ~55 min)

### P-01 — Comblage coverage
- **Temps** : 15 min — **Dépendances** : Phase 2 complète
- **Acceptance** : `pnpm test --coverage` montre ≥ 85% global. Tests ajoutés ciblent les vrais trous (pas du test cosmétique).
- **Commit** : `test: comblage coverage à 85%+ global`

### P-02 — README §7
- **Temps** : 20 min — **Dépendances** : Phase 2 complète
- **Acceptance** : sections "Ce qui me satisfait" / "À améliorer" / "Manquant" / "Choix défendus" complétées. Références aux ADR de `docs/ARCHITECTURE.md`. Captures d'écran ajoutées dans `docs/screenshots/` (optionnel mais valorisant).
- **Commit** : `docs: README §7 préparation entretien`

### P-03 — Mise à jour CLAUDE.md État Actuel + ARCHITECTURE
- **Temps** : 5 min — **Dépendances** : P-01, P-02
- **Acceptance** : section "État actuel" de CLAUDE.md reflète l'état final. ADR mises à jour si des écarts vs plan initial.
- **Commit** : `docs: maj état actuel CLAUDE.md et ADR finales`

### P-04 — Smoke test manuel
- **Temps** : 10 min — **Dépendances** : Phase 2 complète
- **Acceptance** : parcours complet validé : créer workflow → ajouter nodes → connecter → save → reload → modifier settings → dashboard → patient view → simuler étape. Aucun bug bloquant.
- **Commit** : (si fixes) `fix: bugs détectés au smoke test`

### P-05 — Push final + vérif
- **Temps** : 5 min — **Dépendances** : tous P
- **Acceptance** : tous les commits pushés. README rendu propre sur GitHub. Lien public accessible. `mini_projet_technique.md` confirmé absent du tree distant.
- **Commit** : (n/a, push uniquement)

---

## Stretch goals (si temps après P-05)

| ID | Titre | Temps |
|---|---|---|
| S-01 | Onboarding driver.js skippable + relançable | 15 min |
| S-02 | Dark mode toggle | 5 min |
| S-03 | Export/Import JSON workflow | 10 min |

---

## Récap temps cumulé

| Phase | Cible | Cumul |
|---|---|---|
| 0 — Fondation | 75 min | 1h15 |
| 1 — Cœur (parallèle) | 73 min | 2h28 |
| 2 — Intégration | 92 min | 4h00 |
| 3 — Polish | 55 min | 4h55 |
| Stretchs | 30 min | 5h25 |

Cible réaliste : **3h45 - 4h30** (compression possible via batching Claude Code + skip de stretchs si tension).

## Dépendances visualisées

```
F-01 ─┬─ F-02 ─ F-03
      ├─ F-04 ─┐
      ├─ F-05 ─┼─ F-07 ─┬─ Track A: A-01 → A-02 → A-03/A-04
      └─ F-06 ─┘        └─ Track B: B-01 → B-02 → B-03/B-04
                                                      │
                                  Phase 2: I-01 → I-02, I-03, I-04
                                                      │
                                            I-05, I-06 (dépendent I-03)
                                                      │
                                  Phase 3: P-01 → P-02 → P-03 → P-04 → P-05
```
