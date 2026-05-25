# Architecture — RainPath Workflow Editor

Ce document recense les décisions structurantes du projet.
Chaque ADR (Architecture Decision Record) suit le format : Contexte → Décision → Conséquences → Alternatives.

---

## ADR-001 — Choix de la stack technique

**Statut** : Accepté
**Date** : 2026-05-25

### Contexte

Le brief impose React + TypeScript en front, NestJS + Prisma en back, base SQL au choix. Restent à arbitrer : librairie de graphe, UI kit, validation, runner de tests, gestionnaire de paquets.

### Décision

- **Librairie de graphe** : `@xyflow/react` v12 (anciennement React Flow). Standard de facto pour les workflow editors type n8n. TypeScript first, controlled mode, custom nodes en React, format JSON natif via `toObject()` / `fromObject()`. Augmenté de `dagre` pour l'auto-layout au rechargement.
- **UI kit** : Tailwind + shadcn/ui + lucide-react + sonner. Les composants vivent dans le repo (`components/ui/`), zéro vendor lock-in, accessibilité gratuite via Radix UI primitives, rendu pro out-of-the-box.
- **Validation** : Zod côté front ET back, schemas partagés via workspace `@rainpath/schemas`.
- **Tests** : Vitest (front + schemas), Jest (back, natif NestJS).
- **Gestionnaire** : pnpm workspaces (rapide, lean disk, support workspaces propre).
- **Base** : SQLite (suffisant pour le périmètre, zéro setup).

### Conséquences

- Stack idiomatique, très bien couverte par les agents IA — risque d'hallucination faible.
- Composants UI typés bout-en-bout, schemas Zod source de vérité runtime.
- Pas de mismatch front/back sur les types : un seul package partagé.

### Alternatives considérées

- **Rete.js** : API instable, courbe d'apprentissage trop coûteuse pour le périmètre temps.
- **JointJS / GoJS** : commerciales ou orientées diagramming UML, hors scope.
- **react-diagrams** (projectstorm) : projet en stand-by depuis 2021, red flag maintenance.
- **Mantine** au lieu de shadcn : plus opinionated, runtime CSS, moins flexible.
- **Postgres** au lieu de SQLite : surdimensionné pour ce périmètre, zéro valeur ajoutée.

---

## ADR-002 — Stockage JSON column versionné, validé par Zod

**Statut** : Accepté
**Date** : 2026-05-25

### Contexte

Le graphe d'un workflow est composé de nodes hétérogènes (Email, SMS, WhatsApp, Letter, Wait, Condition, Start, End) reliés par des edges. Deux options de modélisation :

1. Tables relationnelles `Node` et `Edge` avec foreign keys vers `Workflow`.
2. Colonne JSON sur `Workflow` contenant `{ nodes, edges, viewport }`.

### Décision

Colonne JSON `graph` sur `Workflow`, validée par `WorkflowGraphSchema` Zod à l'écriture ET à la lecture. Plus une colonne JSON séparée `settings` pour les réglages workflow (email du secrétariat notamment).

Pour anticiper l'évolution :

- `Workflow.schemaVersion: number` (default `1`).
- Fonctions de migration `migrateGraph(v1 → v2)`, `migrateGraph(v2 → v3)` dans `packages/schemas/src/migrations/`.
- Lecture systématique : `schemaVersion → migrate → parse(latest)`.

### Conséquences

- Persistance en 1 requête (write/read), pas de plomberie mapper.
- Format natif `@xyflow/react` directement persistable via `toObject()` / `fromObject()`.
- Évolution du schéma sans casser l'existant grâce au versioning + migrations.
- Trade-off : pas de query SQL granulaire sur les nodes individuels (non requis dans le scope).
- Si requis plus tard, des colonnes calculées peuvent extraire les métadonnées clés (canaux utilisés, count nodes, etc.).

### Alternatives considérées

- **Tables relationnelles `Node`/`Edge`** : 2 à 3 fois plus long à coder, valeur ajoutée nulle dans le scope du brief.
- **JSON sans validation** : bombe à retardement, refusé d'office.
- **JSON sans versioning** : migration future impossible sans casser les rows existantes.

---

## ADR-003 — React Flow en controlled mode obligatoire

**Statut** : Accepté
**Date** : 2026-05-25

### Contexte

`@xyflow/react` peut être utilisé en mode uncontrolled (la lib gère son state interne) ou controlled (le state vit en dehors, passé en props). Le mode uncontrolled est plus simple à amorcer mais expose à :

- Perte de state au remount du composant.
- Difficulté à tester la logique d'édition isolément.
- Couplage entre persistance et instance de canvas.

### Décision

Controlled mode systématique. Le state `{ nodes, edges, viewport }` vit dans un hook custom `useWorkflowEditor` testable en isolation. Le composant `WorkflowCanvas` n'est qu'une couche de rendu sur ce state.

### Conséquences

- Hook `useWorkflowEditor` testable à plat (Vitest + `renderHook`), coverage ≥ 90%.
- Persistance triviale : on sérialise le state en JSON pour le save, on désérialise au load.
- Le mode preview (patient view) consomme le même state avec un flag `mode: 'preview'` et une prop optionnelle `executionState`.

### Alternatives considérées

- **Uncontrolled** : refusé pour les raisons listées en contexte. Marginalement plus rapide à amorcer, mais coûte du refactor obligatoire dès qu'on veut tester ou persister proprement.

---

## ADR-004 — Notification secrétariat : config workflow + override par node

**Statut** : Accepté
**Date** : 2026-05-25

### Contexte

Chaque action de relance (Email, SMS, WhatsApp, Courrier) peut déclencher en parallèle une notification interne vers le secrétariat du laboratoire pour suivi. Besoins identifiés :

- Un email par défaut configuré au niveau du workflow.
- Possibilité de surcharger par node pour les cas exceptionnels.
- Friction UX pour décourager les overrides qui complexifient le suivi global.

### Décision

- `Workflow.settings.notificationEmail: string` — email par défaut au niveau workflow.
- Sur chaque node action : `data.notifySecretariat: boolean` (default `true`), `data.notificationEmailOverride?: string` (optionnel).
- Règle Zod : si `notifySecretariat === false`, alors `notificationEmailOverride` doit être absent.
- UI : disclosure repliée par défaut « Personnaliser pour cette étape » + alert shadcn warning « Déconseillé pour le suivi global ».
- Indicateur visuel sur le canvas : icône `Bell` discrète si notify ON, icône `AlertTriangle` orange par-dessus si override en place.

### Conséquences

- Le chef de labo voit du premier coup d'œil les nodes qui dérogent au défaut workflow.
- Cohérence garantie côté backend par validation Zod.
- Pas d'envoi réel (hors scope brief), mais le squelette est prêt pour un futur `IChannelSender`.

### Alternatives considérées

- **Pas de notification du tout** : trop pauvre métier pour un produit qui parle de « suivi des relances ».
- **Notification globale uniquement, sans override** : trop rigide, des cas exceptionnels existent en pratique laboratoire.
- **Notification par node uniquement, sans défaut workflow** : explosion de la configuration, suivi global cassé.

---

## Notes transverses

- Aucun envoi réel de message dans le périmètre. La couche d'intégration (`IChannelSender`) est volontairement laissée comme stub testable, persistant les « envois simulés » dans la table `ActionLog`.
- Aucune authentification dans le périmètre. L'API n'a ni `AuthModule` ni guard global.
- Pas de cron ni d'exécution de workflow en arrière-plan. La progression des patients est simulée via un bouton « Simuler l'étape suivante » sur la patient view, qui insère une ligne `ActionLog` cohérente.
