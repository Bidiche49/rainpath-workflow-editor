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
pnpm test                # toutes les suites (sans coverage, rapide)
pnpm test:cov            # toutes les suites avec coverage + seuils 85%
pnpm --filter web test   # uniquement le front
pnpm --filter api test   # uniquement le back
```

Cible de coverage : ≥ 85% global, **verrouillée** par des seuils (`lines`,
`branches`, `functions`, `statements`) dans `apps/web/vitest.config.ts` et la
config Jest de `apps/api`. `pnpm test:cov` échoue si l'un d'eux passe sous 85%.

## Décisions clés

Voir [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) pour le détail des ADR :

- ADR-001 : Choix de la stack (React Flow vs alternatives, shadcn vs autres UI kits…)
- ADR-002 : Stockage JSON column versionné validé Zod
- ADR-003 : React Flow controlled mode obligatoire
- ADR-004 : Notification secrétariat (config workflow + override par node)

## Préparation entretien (§7 du brief)

### Ce qui me satisfait

- **La trajectoire de driving multi-agents.** Cowork a tenu la stratégie et le découpage du sprint. Claude Code a exécuté ticket par ticket. Claude Design a produit la direction visuelle, reprise par une analyse non-destructive du design (lecture des maquettes, extraction des tokens, jamais de réécriture aveugle des composants). Chaque agent est resté dans son rôle, sans empiéter sur les autres.
- **Des artefacts persistants qui ont servi de socle.** `CLAUDE.md`, `docs/ARCHITECTURE.md` et `docs/PLAN.md` ne sont pas décoratifs. Les agents les ont relus en début de chaque session et s'y sont référés en cours d'exécution. Les conventions et les décisions vivent dans le repo, pas dans une mémoire de conversation volatile.
- **Une architecture monorepo cohérente.** pnpm workspaces, avec les schemas Zod isolés dans `@rainpath/schemas` et consommés par le front comme le back via le workspace protocol. Une seule source de vérité runtime, zéro duplication de types, aucun risque de dérive front/back.
- **Des ADR défendables.** Les quatre décisions structurantes (ADR-001 à ADR-004) sont écrites avec contexte, alternatives écartées et conséquences. Je peux justifier chacune en entretien sans improviser.
- **Un récit produit qui tient debout.** Éditeur de workflow, puis dashboard de suivi, puis patient view, puis simulation d'étape. Le même graphe Zod traverse les quatre vues. La démo se raconte de bout en bout sans rupture.
- **La notification secrétariat, feature au-delà du brief.** Le brief ne la demandait pas. Un produit qui parle de « suivi des relances » sans notifier l'équipe interne est incohérent. La config workflow + override par node (ADR-004) répond à une intuition métier sur le suivi global du laboratoire.
- **Une couverture de tests ≥ 85% bâtie sur des modules purs.** La logique métier a été extraite dans des fonctions pures testables hors React : `derive-patients` (dérivation des patients depuis les logs), `preview-exec` (avancement de l'exécution simulée), `status-mapper` (mapping enum persisté → statut UI), `validation` (cohérence du graphe). Le coverage n'est pas cosmétique : il porte sur la logique qui compte.
- **Des décisions in-flight challengées plutôt qu'appliquées bêtement.** Trois exemples concrets : la détection de patient « bloqué » a été adaptée au comportement réel du seed (un échec dans l'historique vaut blocage) au lieu de la règle naïve « dernier log en échec » du ticket, qui n'aurait jamais rien flaggé. `computeNextStep` traverse les nodes structurels (Start, Wait, Condition) pour ne s'arrêter que sur un canal, respectant la contrainte du type `ChannelNodeType` du schéma. Le pattern Zod générique `<S extends z.ZodTypeAny>` a été introduit pour gérer proprement les schemas avec `.default()`, dont le type d'entrée diverge du type de sortie.

### Ce que j'aurais amélioré avec plus de temps

- **Enrichir `ActionStatusSchema`.** L'enum persisté (`pending | sent | failed | skipped`) est plus pauvre que le cycle de vie de présentation `LogStatus` (`sent | delivered | opened | rejected | scheduled`). Le dashboard mappe l'un vers l'autre via `apps/web/src/lib/status-mapper.ts`, mais sans distinction réelle `delivered`/`opened`. Côté backend, ajouter ces états (et les transitions) donnerait un suivi de relance granulaire. Le mapper centralise déjà la dette : il suffira de l'enrichir.
- **Table `Patient` dédiée.** Les patients sont aujourd'hui dérivés des `ActionLog` (le nom est reconstruit depuis l'`id`). Une vraie entité `Patient` (nom, contact, métadonnées) clarifierait le modèle et éviterait la reconstruction de nom.
- **Tests e2e Playwright.** Le parcours complet (créer → connecter → save → reload → dashboard → simuler) est aujourd'hui couvert par un smoke test manuel. Un test Playwright le verrouillerait contre les régressions.
- **Storybook.** Les custom nodes React Flow et les composants du design system mériteraient un Storybook : développement isolé, documentation visuelle, détection des régressions de rendu.
- **Migrations Zod réelles.** Le `schemaVersion` est en place sur `Workflow`, mais `migrateGraph` reste un stub. La trajectoire `v1 → v2` est prête côté infrastructure ; il manque une vraie migration pour la valider de bout en bout.
- **Auto-layout dagre on-demand.** Dagre n'est invoqué qu'au rechargement d'un workflow existant. Un bouton « Réorganiser » déclenchant le layout à la demande améliorerait le confort d'édition.
- **Validation du graphe côté backend.** Le backend valide la structure via Zod, mais pas la cohérence métier (atteignabilité, absence de cycle). Cette validation existe côté front ; la dupliquer côté serveur fermerait la porte aux payloads incohérents injectés hors UI.
- **Couche `IChannelSender` réelle.** L'envoi est simulé. Une implémentation `IChannelSender` branchée sur Twilio (SMS/WhatsApp) et SendGrid (email) en mode sandbox transformerait la simulation en envoi réel sans changer le reste de l'architecture.

### Ce qui est manquant ou incomplet

- Pas d'authentification ni de gestion de rôles (hors scope du brief).
- Pas de cron ni de file d'attente d'exécution réelle. La progression est simulée via un bouton.
- Pas de gestion d'erreurs provider, faute de provider réel.
- Internationalisation absente : interface en français uniquement.
- Logs et observabilité non outillés : pas de Pino structuré, pas de Sentry, pas de traces.
- Pas d'export PDF du parcours patient.

### Choix techniques que je défendrais

- **`@xyflow/react` v12 (ADR-001).** Standard de facto des éditeurs de workflow, TypeScript first, controlled mode natif. Rete.js, JointJS/GoJS et react-diagrams écartés et documentés (API instable, licence commerciale, maintenance en stand-by).
- **JSON column versionné validé Zod (ADR-002).** Persistance en une requête, format `@xyflow/react` directement sérialisable, évolution garantie par `schemaVersion` + trajectoire de migration. Les tables `Node`/`Edge` relationnelles auraient coûté 2 à 3 fois plus pour zéro valeur dans le scope.
- **Controlled mode React Flow (ADR-003).** Le state vit dans `useWorkflowEditor`, testable en isolation hors canvas. C'est ce qui rend possible le coverage ≥ 90% du hook et la persistance triviale.
- **shadcn/ui plutôt que Mantine ou MUI.** Les composants vivent dans le repo : ownership total, zéro vendor lock-in, accessibilité gratuite via les primitives Radix.
- **Notification secrétariat avec friction UX assumée (ADR-004).** L'override par node est volontairement enfoui derrière une disclosure et un warning, pour décourager les dérogations qui cassent le suivi global. C'est un choix produit, pas une contrainte technique.
- **Pattern Zod générique `<S extends z.ZodTypeAny>`.** Nécessaire pour composer des schemas avec `.default()`, dont le type d'entrée (champ optionnel) diverge du type de sortie (champ garanti). Sans ce générique, l'inférence casse sur les nodes à valeur par défaut.
- **Extraction systématique de modules purs.** `derive-patients`, `preview-exec`, `validation` et `status-mapper` isolent la logique métier de la couche React. Testabilité directe, réutilisation possible côté backend, et un coverage qui porte sur le code qui compte.

---

## Notes

Projet à but démonstratif, pas de licence définie.
