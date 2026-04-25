import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "@/db";
import { env } from "@/env/server";

export const auth = betterAuth({
    baseUrl: env.BASE_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
        provider: "pg",
    }),
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        discord: {
            clientId: env.DISCORD_CLIENT_ID,
            clientKey: env.DISCORD_CLIENT_KEY,
            clientSecret: env.DISCORD_CLIENT_SECRET,
        },
        github: {
            clientId: env.GITHUB_CLIENT_ID,
            clientKey: env.GITHUB_CLIENT_KEY,
            clientSecret: env.GITHUB_CLIENT_SECRET,
        },
    },
    plugins: [tanstackStartCookies()],
});
