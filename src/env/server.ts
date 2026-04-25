import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
    server: {
        DATABASE_URL: z.url(),
        ENCRYPTION_KEY: z.string(),
        ENCRYPTION_METHOD: z.string(),
        IV_LENGTH: z.coerce.number(),
        KDF_SALT: z.string(),
        BASE_URL: z.url(),
        DISCORD_CLIENT_ID: z.string(),
        DISCORD_CLIENT_KEY: z.string(),
        DISCORD_CLIENT_SECRET: z.string(),
        GITHUB_CLIENT_ID: z.string(),
        GITHUB_CLIENT_KEY: z.string(),
        GITHUB_CLIENT_SECRET: z.string(),
        BETTER_AUTH_SECRET: z.string(),
    },
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
});
