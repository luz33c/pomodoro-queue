import { defineRelations } from "drizzle-orm";

import * as schema from "#/schema/index";

export const relations = defineRelations(schema);
