import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { s3credentials } from "@/db/schema";
import { getSession } from "@/lib/auth.functions";
import { decrypt } from "@/lib/encryption";
import { loadBucketRegions, loadBuckets } from "@/lib/s3/buckets";
import { createStandardResponse } from "@/lib/utils";

export const Route = createFileRoute("/api/s3/buckets/refetch/$providerId/")({
    server: {
        handlers: {
            POST: async ({ params }) => {
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

                const { providerId } = params;

                const row = await db
                    .select()
                    .from(s3credentials)
                    .where(
                        and(
                            eq(s3credentials.ownedBy, session.user.id),
                            eq(s3credentials.id, providerId),
                        ),
                    )
                    .limit(1);

                if (row.length === 0) {
                    return new Response(
                        JSON.stringify(
                            createStandardResponse(
                                false,
                                null,
                                "Bucket not found",
                                null,
                            ),
                        ),
                        {
                            headers: {
                                "Content-Type": "application/json",
                            },
                            status: 404,
                        },
                    );
                }

                const buckets = await loadBuckets(row[0].region, {
                    accessKeyId: decrypt(row[0].accessKeyId),
                    secretAccessKey: decrypt(row[0].secretAccessKey),
                    endpointUrl: row[0].endpointUrl || undefined,
                    region: row[0].region,
                });

                const bucketNames =
                    buckets.Buckets?.map(bucket => bucket.Name || "") || [];

                if (bucketNames) {
                    await loadBucketRegions(
                        session.user.id,
                        {
                            accessKeyId: decrypt(row[0].accessKeyId),
                            secretAccessKey: decrypt(row[0].secretAccessKey),
                            endpointUrl: row[0].endpointUrl || undefined,
                            region: row[0].region,
                        },
                        ...bucketNames,
                    );
                }

                return new Response(
                    JSON.stringify(
                        createStandardResponse(true, null, null, null),
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
