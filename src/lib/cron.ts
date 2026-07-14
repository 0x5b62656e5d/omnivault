import { lte } from "drizzle-orm";
import { definePlugin } from "nitro";
import { db } from "@/db";
import { fileUrls } from "@/db/schema";

export default definePlugin(() => {
    if (typeof Bun !== "undefined") {
        console.log("Initializing background cron jobs...");

        Bun.cron("0 * * * *", async () => {
            try {
                console.log("Running fileUrl cleanup cron");

                await db
                    .delete(fileUrls)
                    .where(lte(fileUrls.expiresAt, new Date()));
            } catch (error) {
                console.error("Error running cron task:", error);
            }
        });
    } else {
        console.warn("Bun.cron is only supported when running with Bun.");
    }
});
