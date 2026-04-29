import { S3ServiceException } from "@aws-sdk/client-s3";
import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { s3credentials } from "@/db/schema";
import { getSession } from "@/lib/auth.functions";
import { encrypt, hmacHash } from "@/lib/encryption";
import { loadBucketRegions, loadBuckets } from "@/lib/s3/buckets";
import { getRegion } from "@/lib/s3/client";
import { createStandardResponse } from "@/lib/utils";

export const Route = createFileRoute("/api/s3/accounts/")({
    server: {
        handlers: {
            GET: async () => {
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

                const {
                    name,
                    accessKeyId,
                    secretAccessKey,
                    endpointUrl,
                    region,
                } = body;

                if (!name || !accessKeyId || !secretAccessKey) {
                    return new Response(
                        JSON.stringify(
                            createStandardResponse(
                                false,
                                null,
                                "Missing required fields",
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

                const parsedRegion = region || getRegion(endpointUrl) || "auto";

                await db
                    .insert(s3credentials)
                    .values({
                        name,
                        accessKeyId: encrypt(accessKeyId),
                        secretAccessKey: encrypt(secretAccessKey),
                        endpointUrl,
                        accessKeyIdHash: hmacHash(accessKeyId),
                        region: parsedRegion,
                        ownedBy: session.user.id,
                    })
                    .onConflictDoNothing();

                try {
                    const buckets = await loadBuckets(parsedRegion, {
                        accessKeyId,
                        secretAccessKey,
                        endpointUrl,
                        region: parsedRegion,
                    });

                    const bucketNames =
                        buckets.Buckets?.map(bucket => bucket.Name || "") || [];

                    if (bucketNames) {
                        await loadBucketRegions(
                            session.user.id,
                            {
                                accessKeyId,
                                secretAccessKey,
                                endpointUrl,
                                region: parsedRegion,
                            },
                            ...bucketNames,
                        );
                    }
                } catch (error) {
                    if (error instanceof S3ServiceException) {
                        return new Response(
                            JSON.stringify(
                                createStandardResponse(
                                    false,
                                    null,
                                    "Invalid S3 credentials",
                                    null,
                                ),
                            ),
                            {
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                status: error.$metadata.httpStatusCode || 400,
                            },
                        );
                    } else {
                        console.error(
                            "Error validating S3 credentials:",
                            error,
                        );

                        return new Response(
                            JSON.stringify(
                                createStandardResponse(
                                    false,
                                    null,
                                    "Invalid S3 credentials",
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
                }

                return new Response(null, {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    status: 204,
                });
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

                const body = await request.json();

                const { id } = body;

                await db
                    .delete(s3credentials)
                    .where(
                        and(
                            eq(s3credentials.id, id),
                            eq(s3credentials.ownedBy, session.user.id),
                        ),
                    );

                return new Response(null, {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    status: 204,
                });
            },
        },
    },
});
