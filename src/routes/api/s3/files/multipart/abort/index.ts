import { AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { s3buckets, s3credentials } from "@/db/schema";
import { getSession } from "@/lib/auth.functions";
import { decrypt } from "@/lib/encryption";
import { createClient } from "@/lib/s3/client";
import { createStandardResponse } from "@/lib/utils";

export const Route = createFileRoute("/api/s3/files/multipart/abort/")({
    server: {
        handlers: {
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

                const { providerId, bucketId, uploadId, fileName } =
                    await request.json();

                if (!providerId || !bucketId || !uploadId || !fileName) {
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

                try {
                    await client.send(
                        new AbortMultipartUploadCommand({
                            Bucket: row.bucket.name,
                            Key: fileName,
                            UploadId: uploadId,
                        }),
                    );

                    return new Response(null, {
                        headers: {
                            "Content-Type": "application/json",
                        },
                        status: 204,
                    });
                } catch (error) {
                    console.error("Error aborting multipart upload:", error);
                    return new Response(
                        JSON.stringify(
                            createStandardResponse(
                                false,
                                null,
                                "Error aborting multipart upload",
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
