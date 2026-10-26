import { z } from "zod";

import { type SHAPE_VERSIONS } from "#/sync/constants";

export type ShapeName = keyof typeof SHAPE_VERSIONS;

/**
 * Every synced write returns the Postgres transaction id that Electric streams back with the change,
 * or null when the request wrote nothing (a replayed create or delete).
 */
export const TxidOutputSchema = z.object({
  txid: z.number().int().nonnegative().nullable()
});

export type TxidOutput = z.infer<typeof TxidOutputSchema>;
