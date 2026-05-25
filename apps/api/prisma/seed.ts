import { Prisma, PrismaClient } from '@prisma/client';
import {
  CHANNEL_NODE_TYPES,
  WorkflowGraphSchema,
  WorkflowSettingsSchema,
  type ActionStatus,
  type ChannelNodeType,
  type WorkflowGraph,
  type WorkflowSettings,
} from '@rainpath/schemas';

const prisma = new PrismaClient();

const NOTIFICATION_EMAIL = 'secretariat@labo-anapath.fr';
const settings: WorkflowSettings = WorkflowSettingsSchema.parse({
  notificationEmail: NOTIFICATION_EMAIL,
});

const asJson = (value: WorkflowGraph | WorkflowSettings): Prisma.InputJsonValue =>
  value as unknown as Prisma.InputJsonValue;

/**
 * Workflow #1 — the exact scenario from the brief, modelled as a graph:
 * "À J+7, email. Si email inconnu OU rejeté → WhatsApp si dispo, sinon SMS.
 *  À J+15 si rien → courrier. Si rien à J+30 → fin."
 */
function buildJ7Graph(): WorkflowGraph {
  return WorkflowGraphSchema.parse({
    nodes: [
      { id: 'start', type: 'start', position: { x: 280, y: 0 }, data: { label: 'Examen réalisé' } },
      {
        id: 'wait7',
        type: 'wait',
        position: { x: 280, y: 110 },
        data: { label: 'Attendre J+7', delay: { value: 7, unit: 'days' } },
      },
      {
        id: 'email',
        type: 'email',
        position: { x: 280, y: 230 },
        data: {
          label: 'Email de relance',
          content: 'Bonjour, merci de bien vouloir régulariser le règlement de votre examen.',
          notifySecretariat: true,
        },
      },
      {
        id: 'cond-email',
        type: 'condition',
        position: { x: 280, y: 360 },
        data: {
          label: 'Email rejeté ou inconnu ?',
          condition: "L'email est-il rejeté ou inconnu ?",
        },
      },
      {
        id: 'cond-whatsapp',
        type: 'condition',
        position: { x: 540, y: 470 },
        data: {
          label: 'Patient sur WhatsApp ?',
          condition: 'Le patient dispose-t-il de WhatsApp ?',
        },
      },
      {
        id: 'whatsapp',
        type: 'whatsapp',
        position: { x: 720, y: 590 },
        data: {
          label: 'Message WhatsApp',
          content: 'Bonjour, un règlement est en attente pour votre examen.',
          notifySecretariat: true,
        },
      },
      {
        id: 'sms',
        type: 'sms',
        position: { x: 540, y: 590 },
        data: {
          label: 'SMS immédiat',
          content: 'Règlement en attente pour votre examen. Merci de nous contacter.',
          notifySecretariat: true,
        },
      },
      {
        id: 'wait15',
        type: 'wait',
        position: { x: 280, y: 590 },
        data: { label: 'Attendre J+15', delay: { value: 15, unit: 'days' } },
      },
      {
        id: 'letter',
        type: 'letter',
        position: { x: 280, y: 710 },
        data: {
          label: 'Courrier postal',
          content: 'Relance écrite concernant le règlement de votre examen.',
          notifySecretariat: true,
        },
      },
      {
        id: 'wait30',
        type: 'wait',
        position: { x: 280, y: 830 },
        data: { label: 'Attendre J+30', delay: { value: 30, unit: 'days' } },
      },
      { id: 'end', type: 'end', position: { x: 280, y: 950 }, data: { label: 'Fin du workflow' } },
    ],
    edges: [
      { id: 'e-start-wait7', source: 'start', target: 'wait7' },
      { id: 'e-wait7-email', source: 'wait7', target: 'email' },
      { id: 'e-email-cond', source: 'email', target: 'cond-email' },
      {
        id: 'e-cond-wa',
        source: 'cond-email',
        target: 'cond-whatsapp',
        sourceHandle: 'yes',
        label: 'Oui',
      },
      {
        id: 'e-cond-wait15',
        source: 'cond-email',
        target: 'wait15',
        sourceHandle: 'no',
        label: 'Non',
      },
      {
        id: 'e-wa-yes',
        source: 'cond-whatsapp',
        target: 'whatsapp',
        sourceHandle: 'yes',
        label: 'Oui',
      },
      { id: 'e-wa-no', source: 'cond-whatsapp', target: 'sms', sourceHandle: 'no', label: 'Non' },
      { id: 'e-whatsapp-wait15', source: 'whatsapp', target: 'wait15' },
      { id: 'e-sms-wait15', source: 'sms', target: 'wait15' },
      { id: 'e-wait15-letter', source: 'wait15', target: 'letter' },
      { id: 'e-letter-wait30', source: 'letter', target: 'wait30' },
      { id: 'e-wait30-end', source: 'wait30', target: 'end' },
    ],
    viewport: { x: 0, y: 0, zoom: 0.85 },
  });
}

/** Workflow #2 — SMS-first then escalate to email and letter. */
function buildSmsFirstGraph(): WorkflowGraph {
  return WorkflowGraphSchema.parse({
    nodes: [
      { id: 'start', type: 'start', position: { x: 250, y: 0 }, data: { label: 'Départ' } },
      {
        id: 'sms',
        type: 'sms',
        position: { x: 250, y: 120 },
        data: {
          label: 'SMS de relance',
          content: 'Merci de régulariser votre examen.',
          notifySecretariat: true,
        },
      },
      {
        id: 'wait3',
        type: 'wait',
        position: { x: 250, y: 240 },
        data: { label: 'Attendre 3 jours', delay: { value: 3, unit: 'days' } },
      },
      {
        id: 'email',
        type: 'email',
        position: { x: 250, y: 360 },
        data: {
          label: 'Email de relance',
          content: 'Relance par email concernant votre règlement.',
          notifySecretariat: true,
        },
      },
      {
        id: 'wait7',
        type: 'wait',
        position: { x: 250, y: 480 },
        data: { label: 'Attendre J+7', delay: { value: 7, unit: 'days' } },
      },
      {
        id: 'letter',
        type: 'letter',
        position: { x: 250, y: 600 },
        data: {
          label: 'Courrier postal',
          content: 'Relance écrite finale.',
          notifySecretariat: true,
        },
      },
      { id: 'end', type: 'end', position: { x: 250, y: 720 }, data: { label: 'Fin' } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'sms' },
      { id: 'e2', source: 'sms', target: 'wait3' },
      { id: 'e3', source: 'wait3', target: 'email' },
      { id: 'e4', source: 'email', target: 'wait7' },
      { id: 'e5', source: 'wait7', target: 'letter' },
      { id: 'e6', source: 'letter', target: 'end' },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  });
}

/** Workflow #3 — WhatsApp express with a single email fallback. */
function buildWhatsAppExpressGraph(): WorkflowGraph {
  return WorkflowGraphSchema.parse({
    nodes: [
      { id: 'start', type: 'start', position: { x: 250, y: 0 }, data: { label: 'Départ' } },
      {
        id: 'whatsapp',
        type: 'whatsapp',
        position: { x: 250, y: 120 },
        data: {
          label: 'WhatsApp',
          content: 'Bonjour, règlement en attente pour votre examen.',
          notifySecretariat: true,
        },
      },
      {
        id: 'cond',
        type: 'condition',
        position: { x: 250, y: 250 },
        data: { label: 'Sans réponse ?', condition: 'Aucune réponse après 48h ?' },
      },
      {
        id: 'email',
        type: 'email',
        position: { x: 480, y: 370 },
        data: { label: 'Email de secours', content: 'Relance par email.', notifySecretariat: true },
      },
      { id: 'end', type: 'end', position: { x: 250, y: 500 }, data: { label: 'Fin' } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'whatsapp' },
      { id: 'e2', source: 'whatsapp', target: 'cond' },
      { id: 'e3', source: 'cond', target: 'email', sourceHandle: 'yes', label: 'Oui' },
      { id: 'e4', source: 'cond', target: 'end', sourceHandle: 'no', label: 'Non' },
      { id: 'e5', source: 'email', target: 'end' },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  });
}

// ---------------------------------------------------------------------------
// Curated demo roster — deterministic, named patients (no faker).
//
// Patient identity lives in the id (`pat_<first>.<last>_<wf>`): the dashboard
// rebuilds the display name from it, so the surname encodes the archetype
// ("Termine", "Bloque", "Demarrer"…) and the presenter knows exactly who to
// click. Every date is computed relative to "now" at seed time, so the demo is
// always coherent: `pending` logs land in the FUTURE (a scheduled action that
// has not happened yet), every other status lands in the PAST.
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.now();
const ago = (days: number): Date => new Date(NOW - days * DAY_MS);
const ahead = (days: number): Date => new Date(NOW + days * DAY_MS);

/**
 * French channel labels for log messages — mirrors the editor's node catalog
 * (`letter` reads "courrier", never the raw English "letter").
 */
const CHANNEL_LABELS: Record<ChannelNodeType, string> = {
  email: 'email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  letter: 'courrier',
};

const lbl = (channel: ChannelNodeType): string => CHANNEL_LABELS[channel];

interface RawLog {
  nodeId: string;
  channel: ChannelNodeType;
  status: ActionStatus;
  occurredAt: Date;
  message: string;
  /** Whether the secretariat was notified (only meaningful for sent/failed). */
  notify: boolean;
}

/** An already-sent relance (past). */
const sent = (name: string, nodeId: string, channel: ChannelNodeType, days: number): RawLog => ({
  nodeId,
  channel,
  status: 'sent',
  occurredAt: ago(days),
  message: `Relance ${lbl(channel)} envoyée à ${name}`,
  notify: true,
});

/** A failed relance (past) — drives the "Bloqués" card and the red badge. */
const failed = (
  name: string,
  nodeId: string,
  channel: ChannelNodeType,
  days: number,
  reason: string,
): RawLog => ({
  nodeId,
  channel,
  status: 'failed',
  occurredAt: ago(days),
  message: `Relance ${lbl(channel)} en échec pour ${name} (${reason})`,
  notify: true,
});

/** A skipped step (past) — a branch the patient was not eligible for. */
const skipped = (
  name: string,
  nodeId: string,
  channel: ChannelNodeType,
  days: number,
  reason: string,
): RawLog => ({
  nodeId,
  channel,
  status: 'skipped',
  occurredAt: ago(days),
  message: `Relance ${lbl(channel)} ignorée pour ${name} (${reason})`,
  notify: false,
});

/** A scheduled relance (FUTURE) — the next action "Simuler" will consume. */
const planned = (name: string, nodeId: string, channel: ChannelNodeType, days: number): RawLog => ({
  nodeId,
  channel,
  status: 'pending',
  occurredAt: ahead(days),
  message: `Relance ${lbl(channel)} planifiée pour ${name}`,
  notify: false,
});

interface SeedPatient {
  id: string;
  name: string;
  logs: RawLog[];
}

/** Build a patient; `build` receives the display name so messages stay in sync. */
function patient(id: string, name: string, build: (name: string) => RawLog[]): SeedPatient {
  return { id, name, logs: build(name) };
}

// --- Workflow J+7 (conditions Oui/Non) -------------------------------------
// 7 patients. The two in-progress branch patients (Sophie / Karim) take
// DIFFERENT condition forks (WhatsApp = Oui, SMS = Non) yet both sit on a
// post-condition frontier, so "Simuler" is fully deterministic for them.
const j7Patients: SeedPatient[] = [
  // #1 Terminé — branche "Non" (email accepté, pas de rejet) : email + courrier,
  // tout vert, aucun échec. Le parcours le plus simple à présenter.
  patient('pat_julie.termine_j7', 'Julie Termine', (n) => [
    sent(n, 'email', 'email', 20),
    sent(n, 'letter', 'letter', 13),
  ]),
  // #1bis Terminé avec repli — 1er canal en échec (email rejeté) puis repli
  // WhatsApp réussi, courrier final. Illustre "le 1er failed puis repli sent".
  patient('pat_hugo.termine_j7', 'Hugo Termine', (n) => [
    failed(n, 'email', 'email', 24, 'adresse e-mail rejetée'),
    sent(n, 'whatsapp', 'whatsapp', 17),
    sent(n, 'letter', 'letter', 10),
  ]),
  // #2 Bloqué — email rejeté puis WhatsApp ignoré (aucun numéro) : aucune
  // relance planifiée, parcours figé → carte "Bloqués", badge rouge.
  patient('pat_marc.bloque_j7', 'Marc Bloque', (n) => [
    failed(n, 'email', 'email', 4, 'adresse e-mail rejetée'),
    skipped(n, 'whatsapp', 'whatsapp', 2, 'aucun numéro WhatsApp'),
  ]),
  // #3 En cours → simulable jusqu'à la FIN en 1 clic — branche Oui/Oui (WhatsApp).
  // Frontier = whatsapp (post-condition) → "Simuler" consomme le courrier
  // planifié puis atteint la Fin verte, sans fork aléatoire.
  patient('pat_sophie.whatsapp_j7', 'Sophie Whatsapp', (n) => [
    failed(n, 'email', 'email', 10, 'adresse e-mail rejetée'),
    sent(n, 'whatsapp', 'whatsapp', 3),
    planned(n, 'letter', 'letter', 1),
  ]),
  // #3bis En cours → simulable jusqu'à la FIN — branche Oui/Non (SMS).
  // Même mécanique que Sophie mais via SMS : démontre la route alternative et
  // la branche WhatsApp morte (grisée).
  patient('pat_karim.sms_j7', 'Karim Sms', (n) => [
    failed(n, 'email', 'email', 11, 'adresse e-mail rejetée'),
    sent(n, 'sms', 'sms', 5),
    planned(n, 'letter', 'letter', 2),
  ]),
  // #4 En cours → début de parcours — email rejeté, WhatsApp planifié. Sert la
  // démo VISUELLE (position courante sur la condition, futur grisé, branche SMS
  // morte). Frontier pré-condition : ne pas cliquer "Simuler" (fork aléatoire).
  patient('pat_lea.debut_j7', 'Lea Debut', (n) => [
    failed(n, 'email', 'email', 2, 'adresse e-mail rejetée'),
    planned(n, 'whatsapp', 'whatsapp', 3),
  ]),
  // #5 À démarrer — seul le 1er canal (email) est planifié : tout grisé, départ.
  patient('pat_paul.demarrer_j7', 'Paul Demarrer', (n) => [planned(n, 'email', 'email', 1)]),
];

// --- Workflow SMS-first (linéaire, AUCUNE condition) ------------------------
// 6 patients. Sans condition, toute simulation est déterministe : c'est ici que
// se fait la démo "simuler plusieurs étapes d'affilée" (Noah).
const smsFirstPatients: SeedPatient[] = [
  // #1 Terminé — SMS, email, courrier tous envoyés, tout vert.
  patient('pat_agnes.termine_sms', 'Agnes Termine', (n) => [
    sent(n, 'sms', 'sms', 18),
    sent(n, 'email', 'email', 14),
    sent(n, 'letter', 'letter', 10),
  ]),
  // #1bis Terminé avec 1er canal en échec — SMS échoué, email puis courrier
  // aboutissent quand même. Journey linéaire → termine malgré l'échec initial.
  patient('pat_lucas.termine_sms', 'Lucas Termine', (n) => [
    failed(n, 'sms', 'sms', 21, 'numéro injoignable'),
    sent(n, 'email', 'email', 16),
    sent(n, 'letter', 'letter', 11),
  ]),
  // #2 Bloqué — SMS envoyé, email en échec, rien de planifié → carte "Bloqués".
  patient('pat_bruno.bloque_sms', 'Bruno Bloque', (n) => [
    sent(n, 'sms', 'sms', 6),
    failed(n, 'email', 'email', 3, 'adresse e-mail rejetée'),
  ]),
  // #3 En cours → simulable jusqu'à la FIN en 1 clic — SMS + email envoyés,
  // courrier planifié. "Simuler" consomme le courrier puis atteint la Fin verte.
  patient('pat_diane.finit_sms', 'Diane Finit', (n) => [
    sent(n, 'sms', 'sms', 5),
    sent(n, 'email', 'email', 1),
    planned(n, 'letter', 'letter', 2),
  ]),
  // #4 En cours → début de parcours — SMS envoyé, email planifié. Comme la
  // journey est sans condition, "Simuler" enchaîne email → courrier → Fin de
  // façon 100% déterministe : la démo "plusieurs étapes" se fait ici.
  patient('pat_noah.debut_sms', 'Noah Debut', (n) => [
    sent(n, 'sms', 'sms', 1),
    planned(n, 'email', 'email', 1),
  ]),
  // #5 À démarrer — seul le SMS est planifié : tout grisé, départ.
  patient('pat_emma.demarrer_sms', 'Emma Demarrer', (n) => [planned(n, 'sms', 'sms', 1)]),
];

// --- Workflow WhatsApp express (2 canaux, 1 condition après WhatsApp) -------
// 5 patients. Seuls 2 canaux (WhatsApp, email) → #3 et #4 fusionnent.
const whatsappPatients: SeedPatient[] = [
  // #1 Terminé — WhatsApp puis email de secours envoyés (branche "Oui, sans
  // réponse"). Après l'email il ne reste que la Fin → terminé.
  patient('pat_chloe.termine_wa', 'Chloe Termine', (n) => [
    sent(n, 'whatsapp', 'whatsapp', 12),
    sent(n, 'email', 'email', 8),
  ]),
  // #1bis Terminé avec repli — WhatsApp non distribué puis email réussi.
  patient('pat_eva.termine_wa', 'Eva Termine', (n) => [
    failed(n, 'whatsapp', 'whatsapp', 15, 'message non distribué'),
    sent(n, 'email', 'email', 9),
  ]),
  // #2 Bloqué — WhatsApp en échec, rien de planifié → carte "Bloqués".
  patient('pat_sami.bloque_wa', 'Sami Bloque', (n) => [
    failed(n, 'whatsapp', 'whatsapp', 4, 'message non distribué'),
  ]),
  // #3 En cours → simulable — WhatsApp envoyé, email de secours planifié.
  // La condition "sans réponse ?" forke : "Oui" → un clic consomme l'email et
  // atteint la Fin ; "Non" → le clic est sans effet (patient réputé avoir
  // répondu), recliquer suffit. (Voir script de démo.)
  patient('pat_ines.finit_wa', 'Ines Finit', (n) => [
    sent(n, 'whatsapp', 'whatsapp', 2),
    planned(n, 'email', 'email', 2),
  ]),
  // #5 À démarrer — seul le WhatsApp est planifié : tout grisé, départ.
  patient('pat_tom.demarrer_wa', 'Tom Demarrer', (n) => [planned(n, 'whatsapp', 'whatsapp', 1)]),
];

type ActionLogCreate = Prisma.ActionLogCreateManyInput;

/** Flatten a roster into ActionLog rows for a given workflow. */
function toCreates(patients: SeedPatient[], workflowId: string): ActionLogCreate[] {
  return patients.flatMap((pt) =>
    pt.logs.map((log) => {
      const recordsSend = log.status === 'sent' || log.status === 'failed';
      return {
        patientId: pt.id,
        workflowId,
        nodeId: log.nodeId,
        channel: log.channel,
        status: log.status,
        message: log.message,
        ...(log.notify && recordsSend ? { notifiedTo: NOTIFICATION_EMAIL } : {}),
        occurredAt: log.occurredAt,
      };
    }),
  );
}

// ---------------------------------------------------------------------------
// Validation helpers — replicate the dashboard's status derivation
// (apps/web/.../derive-patients.ts) so the seed self-checks that every workflow
// surfaces ≥ 1 terminé / ≥ 1 bloqué / ≥ 1 en cours.
// ---------------------------------------------------------------------------

const CHANNEL_TYPES = new Set<string>(CHANNEL_NODE_TYPES);

/** True when a channel node is still reachable downstream of `fromNodeId`. */
function hasDownstreamChannel(graph: WorkflowGraph, fromNodeId: string): boolean {
  const typeById = new Map(graph.nodes.map((node) => [node.id, node.type]));
  const targets = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const list = targets.get(edge.source);
    if (list) list.push(edge.target);
    else targets.set(edge.source, [edge.target]);
  }
  const seen = new Set<string>();
  const queue = [...(targets.get(fromNodeId) ?? [])];
  while (queue.length > 0) {
    const id = queue.shift();
    if (id === undefined || seen.has(id)) continue;
    seen.add(id);
    if (CHANNEL_TYPES.has(typeById.get(id) ?? '')) return true;
    queue.push(...(targets.get(id) ?? []));
  }
  return false;
}

type UiStatus = 'en_cours' | 'bloque' | 'termine';

/** Mirrors `derivePatients`: pending → en_cours; else journeyOver → termine; else failure → bloque. */
function deriveStatus(graph: WorkflowGraph, logs: RawLog[]): UiStatus {
  if (logs.some((log) => log.status === 'pending')) return 'en_cours';
  const latest = [...logs].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0];
  if (!latest) return 'en_cours';
  if (!hasDownstreamChannel(graph, latest.nodeId)) return 'termine';
  if (logs.some((log) => log.status === 'failed')) return 'bloque';
  return 'en_cours';
}

async function main(): Promise<void> {
  // Idempotency: wipe relations then rows so `db:seed` is safe to re-run.
  await prisma.actionLog.deleteMany();
  await prisma.workflow.deleteMany();

  const j7Graph = buildJ7Graph();
  const smsFirstGraph = buildSmsFirstGraph();
  const whatsappGraph = buildWhatsAppExpressGraph();

  const j7 = await prisma.workflow.create({
    data: {
      name: 'Scénario type J+7',
      description:
        'Email à J+7, repli WhatsApp/SMS, courrier à J+15, fin à J+30 (scénario du brief).',
      graph: asJson(j7Graph),
      settings: asJson(settings),
    },
  });
  const smsFirst = await prisma.workflow.create({
    data: {
      name: 'Relance SMS prioritaire',
      description: "SMS d'abord, puis email à 3 jours, puis courrier à J+7.",
      graph: asJson(smsFirstGraph),
      settings: asJson(settings),
    },
  });
  const whatsappExpress = await prisma.workflow.create({
    data: {
      name: 'Relance express WhatsApp',
      description: 'WhatsApp immédiat avec repli email si aucune réponse.',
      graph: asJson(whatsappGraph),
      settings: asJson(settings),
    },
  });

  const rosters = [
    { workflow: j7, graph: j7Graph, patients: j7Patients },
    { workflow: smsFirst, graph: smsFirstGraph, patients: smsFirstPatients },
    { workflow: whatsappExpress, graph: whatsappGraph, patients: whatsappPatients },
  ];

  const logs: ActionLogCreate[] = rosters.flatMap(({ workflow, patients }) =>
    toCreates(patients, workflow.id),
  );
  await prisma.actionLog.createMany({ data: logs });

  // -------------------------------------------------------------------------
  // Validation — fails loudly (throws) so `db:reset` surfaces any incoherence.
  // -------------------------------------------------------------------------
  const fmt = (date: Date): string => date.toISOString().slice(0, 10);
  const minTime = (dates: Date[]): string =>
    dates.length ? fmt(new Date(Math.min(...dates.map((d) => d.getTime())))) : '—';
  const maxTime = (dates: Date[]): string =>
    dates.length ? fmt(new Date(Math.max(...dates.map((d) => d.getTime())))) : '—';

  const allLogs: RawLog[] = rosters.flatMap(({ patients }) => patients.flatMap((p) => p.logs));
  const pendingDates = allLogs.filter((l) => l.status === 'pending').map((l) => l.occurredAt);
  const pastDates = allLogs.filter((l) => l.status !== 'pending').map((l) => l.occurredAt);
  const pendingInFuture = pendingDates.every((d) => d.getTime() > NOW);
  const pastInPast = pastDates.every((d) => d.getTime() <= NOW);

  // "Relances cette semaine" stat: sent/failed in the last 7 days.
  const weekCutoff = NOW - 7 * DAY_MS;
  const relancesThisWeek = allLogs.filter(
    (l) => (l.status === 'sent' || l.status === 'failed') && l.occurredAt.getTime() >= weekCutoff,
  ).length;
  const patientsThisWeek = new Set(
    rosters.flatMap(({ patients }) =>
      patients
        .filter((p) =>
          p.logs.some(
            (l) =>
              (l.status === 'sent' || l.status === 'failed') &&
              l.occurredAt.getTime() >= weekCutoff,
          ),
        )
        .map((p) => p.id),
    ),
  ).size;

  const patientCount = rosters.reduce((sum, { patients }) => sum + patients.length, 0);

  console.log(
    `Seed terminé : ${rosters.length} workflows, ${patientCount} patients, ${logs.length} action logs.`,
  );

  let ok = true;
  for (const { workflow, graph, patients } of rosters) {
    const counts: Record<UiStatus, number> = { en_cours: 0, bloque: 0, termine: 0 };
    for (const p of patients) counts[deriveStatus(graph, p.logs)] += 1;
    const complete = counts.en_cours >= 1 && counts.bloque >= 1 && counts.termine >= 1;
    ok &&= complete;
    console.log(
      `  • ${workflow.name} (${patients.length} patients) : ` +
        `${counts.en_cours} en cours, ${counts.bloque} bloqué(s), ${counts.termine} terminé(s) — ` +
        `${complete ? 'OK' : 'KO (chaque workflow doit couvrir les 3 statuts)'}`,
    );
  }

  console.log(
    `  • ${pastDates.length} logs passés (sent/failed/skipped) du ${minTime(pastDates)} au ${maxTime(pastDates)} — tous dans le passé : ${pastInPast ? 'OK' : 'KO'}`,
  );
  console.log(
    `  • ${pendingDates.length} logs planifiés (pending) du ${minTime(pendingDates)} au ${maxTime(pendingDates)} — tous dans le futur : ${pendingInFuture ? 'OK' : 'KO'}`,
  );
  console.log(
    `  • ${relancesThisWeek} relances cette semaine sur ${patientsThisWeek} patients (≥ 3 attendu) : ${patientsThisWeek >= 3 ? 'OK' : 'KO'}`,
  );

  if (!ok || !pendingInFuture || !pastInPast || patientsThisWeek < 3) {
    throw new Error('Seed invalide : invariants de cohérence non respectés (voir lignes KO).');
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
