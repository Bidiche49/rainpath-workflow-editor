# Script de démo — roster patients curaté

> Données issues du seed `apps/api/prisma/seed.ts`. **Déterministe** : `pnpm db:reset`
> rejoue exactement le même roster (18 patients nommés, dates relatives à « maintenant »).
> Lancer l'app : `pnpm dev` (front + back). Dashboard sur `/`.

## Comment naviguer

- Le **nom de chaque patient encode son comportement** : « Termine », « Bloque »,
  « Demarrer », « Finit », « Debut », ou le canal de branche (« Whatsapp », « Sms »).
- On clique un patient **depuis le dashboard** (la ligne ouvre
  `/workflows/:id/preview?patientId=…`). L'id de workflow est un cuid non figé, donc on
  passe toujours par le dashboard, jamais par une URL en dur.
- Dans la preview : nœuds `done` (vert/plein), `current` (surligné), `pending` (planifié),
  futurs/branches mortes **grisés**. Bouton **« Simuler l'étape suivante »**.

## Stats dashboard attendues (cartes du haut)

| Carte | Valeur attendue |
|---|---|
| En cours | 9 |
| Bloqués | 3 |
| Relances cette semaine | 11 |
| Terminés | 6 |

(9 patients ont une relance `sent`/`failed` dans les 7 derniers jours → la carte
« Relances cette semaine » est non nulle.)

---

## Workflow « Scénario type J+7 » (7 patients, avec conditions Oui/Non)

| Patient | Statut dashboard | À vérifier dans la preview | Simuler ? |
|---|---|---|---|
| **Julie Termine** | Terminé (vert) | Parcours **tout vert** via la branche **Non** : email → (cond. Non) → courrier → Fin. Branches WhatsApp/SMS grisées. | Bouton désactivé (terminé). |
| **Hugo Termine** | Terminé (vert) | Repli : email **en échec** (rouge) → WhatsApp envoyé → courrier → Fin. Montre « 1er canal raté puis repli ». | Désactivé. |
| **Marc Bloque** | Bloqué (orange) | Email en échec puis WhatsApp **ignoré** (skipped), rien de planifié → parcours figé. | Désactivé (rien de planifié). |
| **Sophie Whatsapp** ⭐ | En cours (bleu) | Branche **Oui/Oui** : email échec → WhatsApp envoyé → **courrier planifié** (gris). Route WhatsApp surlignée, branche SMS morte grisée. | **1 clic** : le courrier passe Planifié→Envoyé (succès, **pas de doublon**) PUIS le nœud **Fin** devient vert. |
| **Karim Sms** ⭐ | En cours (bleu) | Branche **Oui/Non** : email échec → **SMS** envoyé → courrier planifié. Route SMS surlignée, branche WhatsApp morte grisée. | **1 clic** → courrier Envoyé → **Fin** verte. |
| **Lea Debut** | En cours (bleu) | Début de parcours : email échec → **WhatsApp planifié**. Position courante sur la condition WhatsApp, futurs (courrier, Fin) grisés, branche SMS morte. | ⚠️ **Ne pas simuler ici** : le frontier est avant les conditions → l'app forke `Oui/Non` aléatoirement (comportement connu de l'app, pas du seed). Pour la démo « simuler plusieurs étapes », utiliser **Noah Debut** (SMS prioritaire). |
| **Paul Demarrer** | En cours (bleu) | À démarrer : seul l'**email est planifié** (gris). Tout le reste grisé, position au départ. | 1 clic consomme l'email (Planifié→Envoyé). Au-delà, conditions → fork aléatoire. |

**Démo branches (point fort du J+7)** : ouvrir **Sophie Whatsapp** puis **Karim Sms** côte à
côte → même condition d'entrée (email rejeté), deux routes différentes surlignées, la branche
non prise reste grise. C'est la démonstration du surlignage de route + branches mortes.

---

## Workflow « Relance SMS prioritaire » (6 patients, linéaire — AUCUNE condition)

> Sans condition, **toute simulation est 100% déterministe** ici.

| Patient | Statut dashboard | À vérifier | Simuler ? |
|---|---|---|---|
| **Agnes Termine** | Terminé (vert) | SMS → email → courrier, tout vert → Fin. | Désactivé. |
| **Lucas Termine** | Terminé (vert) | SMS **en échec** puis email + courrier OK (la séquence linéaire continue). | Désactivé. |
| **Bruno Bloque** | Bloqué (orange) | SMS envoyé puis email **en échec**, rien de planifié. | Désactivé. |
| **Diane Finit** ⭐ | En cours (bleu) | SMS + email envoyés, **courrier planifié** (gris). | **1 clic** → courrier Envoyé → **Fin** verte. |
| **Noah Debut** ⭐ | En cours (bleu) | SMS envoyé, **email planifié**. Futurs (courrier, Fin) grisés. | **Plusieurs clics déterministes** : clic 1 → email Envoyé ; clic 2 → courrier Envoyé (créé) ; le nœud **Fin** s'allume. Démo « simuler étape par étape ». |
| **Emma Demarrer** | En cours (bleu) | À démarrer : seul le **SMS planifié**. Tout grisé, départ. | Clics successifs : SMS → email → courrier → Fin (déterministe). |

---

## Workflow « Relance express WhatsApp » (5 patients, 1 condition après WhatsApp)

| Patient | Statut dashboard | À vérifier | Simuler ? |
|---|---|---|---|
| **Chloe Termine** | Terminé (vert) | WhatsApp → email de secours envoyés → Fin (branche « Oui, sans réponse »). | Désactivé. |
| **Eva Termine** | Terminé (vert) | WhatsApp **en échec** → email de secours OK → Fin. | Désactivé. |
| **Sami Bloque** | Bloqué (orange) | WhatsApp **en échec**, rien de planifié, bloqué sur WhatsApp. | Désactivé. |
| **Ines Finit** | En cours (bleu) | WhatsApp envoyé, **email de secours planifié** (gris). | Clic : si la condition « sans réponse ? » forke **Oui** → email Envoyé → **Fin**. Si **Non** (réputé avoir répondu) → clic sans effet, **recliquer** suffit. Caveat condition de l'app. |
| **Tom Demarrer** | En cours (bleu) | À démarrer : seul le **WhatsApp planifié**. Tout grisé, départ. | 1 clic consomme le WhatsApp ; au-delà, condition → fork. |

---

## Scénario de présentation recommandé (≈ 3 min)

1. **Dashboard** : commenter les 4 cartes (9 en cours / 3 bloqués / 11 cette semaine / 6 terminés).
2. **Filtre « Terminés »** → ouvrir **Julie Termine** : parcours tout vert, branche Non.
3. **Filtre « Bloqués »** → ouvrir **Marc Bloque** : échec + étape ignorée, badge orange.
4. **Le clou — `Sophie Whatsapp`** : montrer le courrier planifié (gris) → **1 clic « Simuler »** →
   Planifié devient Envoyé (pas de doublon dans le journal) **et** la **Fin** passe au vert.
5. **Branches** : ouvrir **Karim Sms** juste après → même entrée, route SMS au lieu de WhatsApp,
   branche morte grisée.
6. **Étape par étape — `Noah Debut`** (SMS prioritaire) : enchaîner 2–3 clics « Simuler » jusqu'à
   la Fin, 100% déterministe (pas de condition).

## Invariants garantis par le seed (bloc de validation final)

À chaque `pnpm db:reset` / `db:seed`, le seed **échoue bruyamment** si un invariant casse :

- tous les logs `pending` sont dans le **futur**, tous les autres dans le **passé** ;
- chaque workflow couvre **≥ 1 en cours / ≥ 1 bloqué / ≥ 1 terminé** ;
- **≥ 3 patients** ont une relance `sent`/`failed` dans les 7 derniers jours.
