import { CreateBucketCommand } from "@aws-sdk/client-s3";
import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { s3buckets, s3credentials } from "@/db/schema";
import { getSession } from "@/lib/auth.functions";
import { decrypt } from "@/lib/encryption";
import { loadBucketRegions } from "@/lib/s3/buckets";
import { createClient } from "@/lib/s3/client";
import { createStandardResponse } from "@/lib/utils";

export const Route = createFileRoute("/api/s3/buckets/")({
    server: {
        handlers: {
            GET: async ({ request }) => {
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

                const url = new URL(request.url);
                const providerId = url.searchParams.get("providerId");

                if (!providerId) {
                    return new Response(
                        JSON.stringify(
                            createStandardResponse(
                                false,
                                null,
                                "Missing providerId query parameter",
                                null,
                            ),
                        ),
                        {
                            headers: {
                                "Content-Type": "application/json",
                            },
                            status: 400,
                        },
                    );
                }

                const res = await db
                    .select()
                    .from(s3buckets)
                    .where(
                        and(
                            eq(s3buckets.ownedBy, session.user.id),
                            eq(s3buckets.parentCredential, providerId),
                        ),
                    );

                return new Response(
                    JSON.stringify(
                        createStandardResponse(true, res, null, null),
                    ),
                    {
                        headers: {
                            "Content-Type": "application/json",
                        },
                        status: 200,
                    },
                );
            },
            POST: async ({ request }) => {
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

                const body = await request.json();
                const { providerId, bucketName } = body;

                if (!providerId || !bucketName) {
                    return new Response(
                        JSON.stringify(
                            createStandardResponse(
                                false,
                                null,
                                "Missing required fields: providerId and bucketName",
                                null,
                            ),
                        ),
                        {
                            headers: {
                                "Content-Type": "application/json",
                            },
                            status: 400,
                        },
                    );
                }

                const [row] = await db
                    .select()
                    .from(s3credentials)
                    .where(
                        and(
                            eq(s3credentials.id, providerId),
                            eq(s3credentials.ownedBy, session.user.id),
                        ),
                    )
                    .limit(1);

                const client = createClient("auto", {
                    accessKeyId: decrypt(row.accessKeyId),
                    secretAccessKey: decrypt(row.secretAccessKey),
                    endpointUrl: row.endpointUrl || undefined,
                });

                await client.send(
                    new CreateBucketCommand({
                        Bucket: bucketName,
                    }),
                );

                await loadBucketRegions(
                    session.user.id,
                    {
                        accessKeyId: decrypt(row.accessKeyId),
                        secretAccessKey: decrypt(row.secretAccessKey),
                    },
                    bucketName,
                );

                return new Response(
                    JSON.stringify(
                        createStandardResponse(true, null, null, null),
                    ),
                    {
                        headers: {
                            "Content-Type": "application/json",
                        },
                        status: 204,
                    },
                );
            },
        },
    },
});
