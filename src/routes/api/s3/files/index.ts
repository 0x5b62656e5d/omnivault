import {
    CreateMultipartUploadCommand,
    DeleteObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { s3buckets, s3credentials } from "@/db/schema";
import { getSession } from "@/lib/auth.functions";
import { decrypt } from "@/lib/encryption";
import { createClient } from "@/lib/s3/client";
import { PART_SIZE } from "@/lib/types";
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

                const {
                    fileName,
                    fileSize,
                    contentType,
                    providerId,
                    bucketId,
                } = await request.json();

                if (
                    !fileName ||
                    typeof fileSize !== "number" ||
                    !contentType ||
                    !providerId ||
                    !bucketId
                ) {
                    return new Response(
                        JSON.stringify(
                            createStandardResponse(
                                false,
                                null,
                                "Missing required fields in request body",
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

                const client = createClient(row.bucket.region, {
                    accessKeyId: decrypt(row.credential.accessKeyId),
                    secretAccessKey: decrypt(row.credential.secretAccessKey),
                    endpointUrl: row.credential.endpointUrl || undefined,
                    region: row.credential.region,
                });

                if (fileSize <= 50 * 1024 * 1024) {
                    try {
                        const signedUrl = await getSignedUrl(
                            createClient(row.bucket.region, {
                                accessKeyId: decrypt(
                                    row.credential.accessKeyId,
                                ),
                                secretAccessKey: decrypt(
                                    row.credential.secretAccessKey,
                                ),
                                endpointUrl:
                                    row.credential.endpointUrl || undefined,
                                region: row.credential.region,
                            }),
                            new PutObjectCommand({
                                Bucket: row.bucket.name,
                                Key: fileName,
                                ContentType: contentType,
                            }),
                            { expiresIn: 3600 },
                        );

                        return new Response(
                            JSON.stringify(
                                createStandardResponse(
                                    true,
                                    signedUrl,
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
                }

                try {
                    const res = await client.send(
                        new CreateMultipartUploadCommand({
                            Bucket: row.bucket.name,
                            Key: fileName,
                            ContentType: contentType,
                        }),
                    );

                    const partCount = Math.ceil(fileSize / PART_SIZE);

                    const parts = await Promise.all(
                        Array.from({ length: partCount }, async (_, index) => {
                            const partNumber = index + 1;
                            const signedUrl = await getSignedUrl(
                                client,
                                new UploadPartCommand({
                                    Bucket: row.bucket.name,
                                    Key: fileName,
                                    UploadId: res.UploadId,
                                    PartNumber: partNumber,
                                }),
                                { expiresIn: 24 * 60 * 60 },
                            );

                            return {
                                partNumber,
                                signedUrl,
                            };
                        }),
                    );

                    return new Response(
                        JSON.stringify(
                            createStandardResponse(
                                true,
                                {
                                    uploadId: res.UploadId,
                                    key: fileName,
                                    partSize: PART_SIZE,
                                    parts,
                                },
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
