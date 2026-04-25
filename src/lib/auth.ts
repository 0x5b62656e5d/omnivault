import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { env } from "@/env/server";

export const auth = betterAuth({
    baseUrl: env.BASE_URL,
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
