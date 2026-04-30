import {
    BucketAlreadyExists,
    BucketAlreadyOwnedByYou,
    CreateBucketCommand,
    DeleteBucketCommand,
    ListObjectsV2Command,
    S3ServiceException,
} from "@aws-sdk/client-s3";
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

                const client = createClient(row.region, {
                    accessKeyId: decrypt(row.accessKeyId),
                    secretAccessKey: decrypt(row.secretAccessKey),
                    endpointUrl: row.endpointUrl || undefined,
                    region: row.region,
                });

                try {
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
                            region: row.region,
                        },
                        bucketName,
                    );

                    return new Response(null, {
                        headers: {
                            "Content-Type": "application/json",
                        },
                        status: 204,
                    });
                } catch (error) {
                    const awsError = error as
                        | BucketAlreadyExists
                        | BucketAlreadyOwnedByYou
                        | S3ServiceException;

                    if (
                        awsError.name === "BucketAlreadyExists" ||
                        awsError.name === "BucketAlreadyOwnedByYou"
                    ) {
                        return new Response(
                            JSON.stringify(
                                createStandardResponse(
                                    false,
                                    null,
                                    "Bucket already exists",
                                    null,
                                ),
                            ),
                            {
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                status: 409,
                            },
                        );
                    } else if (awsError.name === "InvalidBucketName") {
                        return new Response(
                            JSON.stringify(
                                createStandardResponse(
                                    false,
                                    null,
                                    "Invalid bucket name",
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

                    console.error("Error creating bucket:", error);
                    return new Response(
                        JSON.stringify(
                            createStandardResponse(
                                false,
                                null,
                                "Error creating bucket",
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

                const body = await request.json();
                const { providerId, bucketId } = body;

                if (!providerId || !bucketId) {
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
                                "S3 credential not found",
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

                const client = createClient(row.credential.region, {
                    accessKeyId: decrypt(row.credential.accessKeyId),
                    secretAccessKey: decrypt(row.credential.secretAccessKey),
                    endpointUrl: row.credential.endpointUrl || undefined,
                    region: row.credential.region,
                });

                try {
                    const objects = await client.send(
                        new ListObjectsV2Command({
                            Bucket: row.bucket.name,
                        }),
                    );

                    if (objects.Contents && objects.Contents.length > 0) {
                        return new Response(
                            JSON.stringify(
                                createStandardResponse(
                                    false,
                                    null,
                                    "Bucket not empty",
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
                } catch (error) {
                    console.error("Error checking bucket:", error);
                    return new Response(
                        JSON.stringify(
                            createStandardResponse(
                                false,
                                null,
                                "Error checking bucket",
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

                try {
                    await client.send(
                        new DeleteBucketCommand({
                            Bucket: row.bucket.name,
                        }),
                    );

                    return new Response(null, {
                        headers: {
                            "Content-Type": "application/json",
                        },
                        status: 204,
                    });
                } catch (error) {
                    console.error("Error deleting bucket:", error);
                    return new Response(
                        JSON.stringify(
                            createStandardResponse(
                                false,
                                null,
                                "Error deleting bucket",
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
