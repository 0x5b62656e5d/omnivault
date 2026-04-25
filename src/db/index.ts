import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "@/env/server";
import * as authSchema from "./auth-schema.ts";
import * as schema from "./schema.ts";

export const db = drizzle(env.DATABASE_URL, {
    schema: { ...schema, ...authSchema },
});
