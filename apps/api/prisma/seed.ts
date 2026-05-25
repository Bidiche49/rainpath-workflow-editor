import { fakerFR as faker } from '@faker-js/faker';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  WorkflowGraphSchema,
  WorkflowSettingsSchema,
  type ActionStatus,
  type ChannelNodeType,
  type WorkflowGraph,
  type WorkflowSettings,
} from '@rainpath/schemas';

const prisma = new PrismaClient();

/** Deterministic-ish output across runs without being byte-identical. */
faker.seed(42);

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

interface Patient {
  id: string;
  fullName: string;
}

/** Readable, stable-ish patient id (no Patient table exists — id carries identity). */
function makePatient(): Patient {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const slug = `${firstName}.${lastName}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]+/g, '.');
  return {
    id: `pat_${slug}_${faker.string.alphanumeric(4)}`,
    fullName: `${firstName} ${lastName}`,
  };
}

/** A step a patient can walk through, mapping a graph channel node to a channel. */
interface JourneyStep {
  nodeId: string;
  channel: ChannelNodeType;
}

const J7_JOURNEY: JourneyStep[] = [
  { nodeId: 'email', channel: 'email' },
  { nodeId: 'whatsapp', channel: 'whatsapp' },
  { nodeId: 'letter', channel: 'letter' },
];
const SMS_FIRST_JOURNEY: JourneyStep[] = [
  { nodeId: 'sms', channel: 'sms' },
  { nodeId: 'email', channel: 'email' },
  { nodeId: 'letter', channel: 'letter' },
];
const WHATSAPP_JOURNEY: JourneyStep[] = [
  { nodeId: 'whatsapp', channel: 'whatsapp' },
  { nodeId: 'email', channel: 'email' },
];

interface LogDraft {
  nodeId: string;
  channel: ChannelNodeType;
  status: ActionStatus;
  message: string;
  notify: boolean;
}

type ActionLogCreate = Prisma.ActionLogCreateManyInput;

/** Spread `count` dates over the last `spanDays` days, oldest first. */
function spreadDates(count: number, spanDays: number): Date[] {
  const now = Date.now();
  const start = faker.number.int({ min: spanDays - 6, max: spanDays });
  const dates: Date[] = [];
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.max(0, start - i * faker.number.int({ min: 2, max: 4 }));
    dates.push(new Date(now - daysAgo * 24 * 60 * 60 * 1000));
  }
  return dates;
}

function draftToCreate(
  patient: Patient,
  workflowId: string,
  draft: LogDraft,
  occurredAt: Date,
): ActionLogCreate {
  const recordsSend = draft.status === 'sent' || draft.status === 'failed';
  return {
    patientId: patient.id,
    workflowId,
    nodeId: draft.nodeId,
    channel: draft.channel,
    status: draft.status,
    message: draft.message,
    ...(draft.notify && recordsSend ? { notifiedTo: NOTIFICATION_EMAIL } : {}),
    occurredAt,
  };
}

/**
 * Build a coherent in-progress story: the patient has gone through `done`
 * channel steps (all `sent`, the first occasionally `failed`), and the next
 * step in the journey is `pending` (scheduled). Always yields ≥ 2 logs.
 */
function inProgressStory(patient: Patient, journey: JourneyStep[]): LogDraft[] {
  const drafts: LogDraft[] = [];
  const done = faker.number.int({ min: 1, max: journey.length - 1 });
  const firstFailed = faker.datatype.boolean(0.25);

  for (let i = 0; i < done; i++) {
    const step = journey[i];
    if (!step) break;
    const status: ActionStatus = i === 0 && firstFailed ? 'failed' : 'sent';
    drafts.push({
      nodeId: step.nodeId,
      channel: step.channel,
      status,
      message:
        status === 'failed'
          ? `Relance ${step.channel} en échec pour ${patient.fullName}`
          : `Relance ${step.channel} envoyée à ${patient.fullName}`,
      notify: true,
    });
  }

  const next = journey[done];
  if (next) {
    drafts.push({
      nodeId: next.nodeId,
      channel: next.channel,
      status: 'pending',
      message: `Relance ${next.channel} planifiée pour ${patient.fullName}`,
      notify: false,
    });
  }

  return drafts;
}

async function main(): Promise<void> {
  // Idempotency: wipe relations then rows so `db:seed` is safe to re-run.
  await prisma.actionLog.deleteMany();
  await prisma.workflow.deleteMany();

  const j7 = await prisma.workflow.create({
    data: {
      name: 'Scénario type J+7',
      description:
        'Email à J+7, repli WhatsApp/SMS, courrier à J+15, fin à J+30 (scénario du brief).',
      graph: asJson(buildJ7Graph()),
      settings: asJson(settings),
    },
  });
  const smsFirst = await prisma.workflow.create({
    data: {
      name: 'Relance SMS prioritaire',
      description: "SMS d'abord, puis email à 3 jours, puis courrier à J+7.",
      graph: asJson(buildSmsFirstGraph()),
      settings: asJson(settings),
    },
  });
  const whatsappExpress = await prisma.workflow.create({
    data: {
      name: 'Relance express WhatsApp',
      description: 'WhatsApp immédiat avec repli email si aucune réponse.',
      graph: asJson(buildWhatsAppExpressGraph()),
      settings: asJson(settings),
    },
  });

  const logs: ActionLogCreate[] = [];
  const pushStory = (patient: Patient, workflowId: string, drafts: LogDraft[]): void => {
    const dates = spreadDates(drafts.length, 28);
    drafts.forEach((draft, i) => {
      logs.push(draftToCreate(patient, workflowId, draft, dates[i] ?? new Date()));
    });
  };

  // --- Workflow J+7: 7 patients including the two special cases. ---
  const blocked = makePatient();
  pushStory(blocked, j7.id, [
    {
      nodeId: 'email',
      channel: 'email',
      status: 'failed',
      message: `Email rejeté pour ${blocked.fullName} (adresse invalide)`,
      notify: true,
    },
    {
      nodeId: 'whatsapp',
      channel: 'whatsapp',
      status: 'skipped',
      message: `WhatsApp ignoré pour ${blocked.fullName} (aucun numéro WhatsApp)`,
      notify: false,
    },
  ]);

  const completed = makePatient();
  pushStory(completed, j7.id, [
    {
      nodeId: 'email',
      channel: 'email',
      status: 'failed',
      message: `Email rejeté pour ${completed.fullName}`,
      notify: true,
    },
    {
      nodeId: 'whatsapp',
      channel: 'whatsapp',
      status: 'sent',
      message: `WhatsApp envoyé à ${completed.fullName}`,
      notify: true,
    },
    {
      nodeId: 'letter',
      channel: 'letter',
      status: 'sent',
      message: `Courrier postal envoyé à ${completed.fullName}`,
      notify: true,
    },
  ]);

  for (let i = 0; i < 5; i++) {
    const patient = makePatient();
    pushStory(patient, j7.id, inProgressStory(patient, J7_JOURNEY));
  }

  // --- Workflow SMS-first: 4 in-progress patients. ---
  for (let i = 0; i < 4; i++) {
    const patient = makePatient();
    pushStory(patient, smsFirst.id, inProgressStory(patient, SMS_FIRST_JOURNEY));
  }

  // --- Workflow WhatsApp express: 4 in-progress patients. ---
  for (let i = 0; i < 4; i++) {
    const patient = makePatient();
    pushStory(patient, whatsappExpress.id, inProgressStory(patient, WHATSAPP_JOURNEY));
  }

  await prisma.actionLog.createMany({ data: logs });

  const workflowCount = await prisma.workflow.count();
  const logCount = await prisma.actionLog.count();
  const patientCount = new Set(logs.map((log) => log.patientId)).size;
  console.log(
    `Seed terminé : ${workflowCount} workflows, ${patientCount} patients, ${logCount} action logs.`,
  );
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
