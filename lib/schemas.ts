import { z } from 'zod';
export const requirementSchema = z.object({
  id: z.string().max(100),
  name: z.string().trim().min(2).max(250),
  code: z.string().max(80).optional(),
  quantity: z.coerce.number().positive().max(100000),
  itemType: z.enum(['SEMIPRODUCT','MATERIAL','UNKNOWN']).optional(),
  sourceIndex: z.number().int().positive().optional(),
  heightCm: z.coerce.number().positive().max(20000).nullable().optional(),
  tolerancePct: z.coerce.number().min(0).max(100).optional(),
  widthCm: z.coerce.number().positive().max(20000).nullable().optional(),
  lengthCm: z.coerce.number().positive().max(20000).nullable().optional(),
  material: z.string().max(500).optional(),
  notes: z.string().max(1000).optional()
});
export const analyzeSchema=z.object({
  requestText:z.string().max(20000).default(''),
  items:z.array(requirementSchema).min(1).max(80)
});
export const proposalSchema=z.object({
  analysisRunId:z.string().uuid().nullable().optional(),
  proposalType:z.enum(['new_code','new_version','add_sop','review_existing']),
  baseProductKey:z.string().max(100).nullable().optional(),
  justification:z.string().trim().min(8).max(4000),
  suggestedChanges:z.record(z.unknown()).default({})
});
