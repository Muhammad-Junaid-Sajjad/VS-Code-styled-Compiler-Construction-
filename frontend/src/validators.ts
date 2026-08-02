/** Runtime response validator at the client boundary (T008a, FR-015).
 * A malformed /api/compile payload fails loudly instead of breaking a panel.
 */
import { z } from 'zod';
import type { TreeNode } from './types/contract';

const diagnosticSchema = z.object({
  level: z.enum(['error', 'warning']),
  message: z.string(),
  line: z.number(),
  col: z.number(),
});

const tokenSchema = z.object({
  token: z.string(),
  class: z.string(),
  line: z.number(),
  col: z.number(),
});

const symbolSchema = z.object({
  name: z.string(),
  type: z.string(),
  scope: z.string(),
  value: z.string().nullable(),
  line: z.number(),
});

const treeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
  z.object({ label: z.string(), cls: z.string(), children: z.array(treeNodeSchema) })
);

export const compileResponseSchema = z.object({
  success: z.boolean(),
  language: z.enum(['c', 'python']),
  tokens: z.array(tokenSchema),
  parse_tree: treeNodeSchema.nullable(),
  symbol_table: z.array(symbolSchema),
  ir_code: z.array(z.any()),
  errors: z.array(diagnosticSchema),
  warnings: z.array(diagnosticSchema),
  phases: z.object({
    lexer: z.string(),
    parser: z.string(),
    semantic: z.string(),
    irgen: z.string(),
  }),
  raw_output: z.string(),
});

export type ValidatedCompileResponse = z.infer<typeof compileResponseSchema>;
