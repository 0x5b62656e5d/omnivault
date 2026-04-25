import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
    server: {
        DATABASE_URL: z.url(),
        FRONTEND_URL: z.url(),
        ENCRYPTION_KEY: z.string(),
        ENCRYPTION_METHOD: z.string(),
        IV_LENGTH: z.coerce.number(),
        KDF_SALT: z.string(),
    },
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
});
