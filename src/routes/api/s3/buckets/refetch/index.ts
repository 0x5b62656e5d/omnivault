import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { s3credentials } from "@/db/schema";
import { getSession } from "@/lib/auth.functions";
import { decrypt } from "@/lib/encryption";
import { loadBucketRegions, loadBuckets } from "@/lib/s3/buckets";
import { createStandardResponse } from "@/lib/utils";

export const Route = createFileRoute("/api/s3/buckets/refetch/")({
    server: {
        handlers: {
            POST: async () => {
                const session = await getSession();

                if (!session) {
                    return new Response(
                        JSON.stringify(
                            createStandardResponse(
                                false,
                                null,
                                "Unauthorized",
                                null,
                            ),
                        ),
                        {
                            headers: {
                                "Content-Type": "application/json",
                            },
                            status: 401,
                        },
                    );
                }

                const res = await db
                    .select()
                    .from(s3credentials)
                    .where(eq(s3credentials.ownedBy, session.user.id));

                for (const credential of res) {
                    const buckets = await loadBuckets(credential.region, {
                        accessKeyId: decrypt(credential.accessKeyId),
                        secretAccessKey: decrypt(credential.secretAccessKey),
                        endpointUrl: credential.endpointUrl || undefined,
                        region: credential.region,
                    });

                    const bucketNames =
                        buckets.Buckets?.map(bucket => bucket.Name || "") || [];

                    if (bucketNames) {
                        await loadBucketRegions(
                            session.user.id,
                            {
                                accessKeyId: decrypt(credential.accessKeyId),
                                secretAccessKey: decrypt(
                                    credential.secretAccessKey,
                                ),
                                endpointUrl:
                                    credential.endpointUrl || undefined,
                                region: credential.region,
                            },
                            ...bucketNames,
                        );
                    }
                }

                return new Response(
                    JSON.stringify(
                        createStandardResponse(false, null, null, null),
                    ),
                    {
                        headers: {
                            "Content-Type": "application/json",
                        },
                        status: 200,
                    },
                );
            },
        },
    },
});
