import { DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { s3buckets, s3credentials } from "@/db/schema";
import { getSession } from "@/lib/auth.functions";
import { decrypt } from "@/lib/encryption";
import { createClient } from "@/lib/s3/client";
import { createStandardResponse } from "@/lib/utils";

export const Route = createFileRoute("/api/s3/files/")({
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
                const bucketId = url.searchParams.get("bucketId");

                if (!providerId || !bucketId) {
                    return new Response(
                        JSON.stringify(
                            createStandardResponse(
                                false,
                                null,
                                "Missing required query parameter",
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
                    .select({
                        credential: s3credentials,
                        bucket: s3buckets,
                    })
                    .from(s3buckets)
                    .innerJoin(
                        s3credentials,
                        eq(s3buckets.parentCredential, s3credentials.id),
                    )
                    .where(
                        and(
                            eq(s3buckets.id, bucketId),
                            eq(s3buckets.parentCredential, providerId),
                            eq(s3credentials.ownedBy, session.user.id),
                        ),
                    )
                    .limit(1);

                if (!row) {
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

                try {
                    const client = createClient(row.bucket.region, {
                        accessKeyId: decrypt(row.credential.accessKeyId),
                        secretAccessKey: decrypt(
                            row.credential.secretAccessKey,
                        ),
                        endpointUrl: row.credential.endpointUrl || undefined,
                        region: row.credential.region,
                    });

                    const res = await client.send(
                        new ListObjectsV2Command({
                            Bucket: row.bucket.name,
                        }),
                    );

                    return new Response(
                        JSON.stringify(
                            createStandardResponse(
                                true,
                                res.Contents || [],
                                null,
                                null,
                            ),
                        ),
                        {
                            headers: {
                                "Content-Type": "application/json",
                            },
                            status: 200,
                        },
                    );
                } catch (error) {
                    console.error("Error generating signed URL:", error);
                    return new Response(
                        JSON.stringify(
                            createStandardResponse(
                                false,
                                null,
                                "Error generating signed URL",
                                null,
                            ),
                        ),
                        {
                            headers: {
                                "Content-Type": "application/json",
                            },
                            status: 500,
                        },
                    );
                }
            },
            DELETE: async ({ request }) => {
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
                const bucketId = url.searchParams.get("bucketId");
                const fileId = url.searchParams.get("fileId");

                if (!providerId || !bucketId || !fileId) {
                    return new Response(
                        JSON.stringify(
                            createStandardResponse(
                                false,
                                null,
                                "Missing required query parameter",
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
                    .select({
                        credential: s3credentials,
                        bucket: s3buckets,
                    })
                    .from(s3buckets)
                    .innerJoin(
                        s3credentials,
                        eq(s3buckets.parentCredential, s3credentials.id),
                    )
                    .where(
                        and(
                            eq(s3buckets.id, bucketId),
                            eq(s3buckets.parentCredential, providerId),
                            eq(s3credentials.ownedBy, session.user.id),
                        ),
                    )
                    .limit(1);

                if (!row) {
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

                try {
                    const client = createClient(row.bucket.region, {
                        accessKeyId: decrypt(row.credential.accessKeyId),
                        secretAccessKey: decrypt(
                            row.credential.secretAccessKey,
                        ),
                        endpointUrl: row.credential.endpointUrl || undefined,
                        region: row.credential.region,
                    });

                    await client.send(
                        new DeleteObjectCommand({
                            Bucket: row.bucket.name,
                            Key: fileId,
                        }),
                    );

                    return new Response(null, {
                        headers: {
                            "Content-Type": "application/json",
                        },
                        status: 204,
                    });
                } catch (error) {
                    console.error("Error generating signed URL:", error);
                    return new Response(
                        JSON.stringify(
                            createStandardResponse(
                                false,
                                null,
                                "Error generating signed URL",
                                null,
                            ),
                        ),
                        {
                            headers: {
                                "Content-Type": "application/json",
                            },
                            status: 500,
                        },
                    );
                }
            },
        },
    },
});
