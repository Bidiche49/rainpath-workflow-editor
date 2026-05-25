import { z } from 'zod';

/**
 * Canonical graph schemas for the workflow editor.
 *
 * The graph is persisted as a JSON column on `Workflow` and is the native
 * shape consumed by `@xyflow/react` (controlled mode). It is validated by Zod
 * on both write and read (see ADR-002).
 */

/** All node types supported by the editor. */
export const NODE_TYPES = [
  'start',
  'end',
  'email',
  'sms',
  'whatsapp',
  'letter',
  'wait',
  'condition',
] as const;

export const NodeTypeSchema = z.enum(NODE_TYPES);
export type NodeType = z.infer<typeof NodeTypeSchema>;

/** Channels that produce an outbound (simulated) message to the patient. */
export const CHANNEL_NODE_TYPES = ['email', 'sms', 'whatsapp', 'letter'] as const;
export const ChannelNodeTypeSchema = z.enum(CHANNEL_NODE_TYPES);
export type ChannelNodeType = z.infer<typeof ChannelNodeTypeSchema>;

/** Execution highlighting status, used by the read-only patient preview. */
export const NodeStatusSchema = z.enum(['pending', 'current', 'done']);
export type NodeStatus = z.infer<typeof NodeStatusSchema>;

export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type Position = z.infer<typeof PositionSchema>;

export const ViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number().positive(),
});
export type Viewport = z.infer<typeof ViewportSchema>;

export const WAIT_UNITS = ['minutes', 'hours', 'days'] as const;
export const WaitUnitSchema = z.enum(WAIT_UNITS);
export type WaitUnit = z.infer<typeof WaitUnitSchema>;

export const DelaySchema = z.object({
  value: z.number().int().positive(),
  unit: WaitUnitSchema,
});
export type Delay = z.infer<typeof DelaySchema>;

/** Fields shared by every node's `data` payload. */
const baseNodeData = {
  label: z.string().optional(),
  status: NodeStatusSchema.optional(),
};

/**
 * Notification payload for channel nodes.
 *
 * Cross-field rule (ADR-004): when `notifySecretariat` is disabled, an email
 * override makes no sense and must be absent. The refinement lives here on the
 * `data` schema rather than on the node itself, so each node stays a plain
 * `ZodObject` and remains usable inside `z.discriminatedUnion`.
 */
export const ChannelNodeDataSchema = z
  .object({
    ...baseNodeData,
    content: z.string().optional(),
    notifySecretariat: z.boolean().default(true),
    notificationEmailOverride: z.string().email().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.notifySecretariat === false && data.notificationEmailOverride !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'notificationEmailOverride doit être absent quand notifySecretariat est désactivé',
        path: ['notificationEmailOverride'],
      });
    }
  });
export type ChannelNodeData = z.infer<typeof ChannelNodeDataSchema>;

const makeNode = <T extends NodeType, D extends z.ZodTypeAny>(type: T, data: D) =>
  z.object({
    id: z.string().min(1),
    type: z.literal(type),
    position: PositionSchema,
    data,
  });

export const StartNodeSchema = makeNode('start', z.object({ ...baseNodeData }));
export const EndNodeSchema = makeNode('end', z.object({ ...baseNodeData }));

export const EmailNodeSchema = makeNode('email', ChannelNodeDataSchema);
export const SmsNodeSchema = makeNode('sms', ChannelNodeDataSchema);
export const WhatsAppNodeSchema = makeNode('whatsapp', ChannelNodeDataSchema);
export const LetterNodeSchema = makeNode('letter', ChannelNodeDataSchema);

export const WaitNodeSchema = makeNode(
  'wait',
  z.object({
    ...baseNodeData,
    delay: DelaySchema.default({ value: 1, unit: 'days' }),
  }),
);

export const ConditionNodeSchema = makeNode(
  'condition',
  z.object({
    ...baseNodeData,
    condition: z.string().default('Condition ?'),
  }),
);

/** Discriminated union over the top-level `type` field. */
export const NodeSchema = z.discriminatedUnion('type', [
  StartNodeSchema,
  EndNodeSchema,
  EmailNodeSchema,
  SmsNodeSchema,
  WhatsAppNodeSchema,
  LetterNodeSchema,
  WaitNodeSchema,
  ConditionNodeSchema,
]);
export type WorkflowNode = z.infer<typeof NodeSchema>;

/**
 * Edge between two nodes. `sourceHandle` carries the branch id for condition
 * nodes (`"yes"` / `"no"`); it is `null`/absent for linear edges, matching the
 * `@xyflow/react` edge shape.
 */
export const EdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().nullish(),
  targetHandle: z.string().nullish(),
  label: z.string().optional(),
  type: z.string().optional(),
  animated: z.boolean().optional(),
});
export type WorkflowEdge = z.infer<typeof EdgeSchema>;

export const WorkflowGraphSchema = z.object({
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
  viewport: ViewportSchema,
});
export type WorkflowGraph = z.infer<typeof WorkflowGraphSchema>;
