import { s3buckets } from '@/db/schema';
import { getSession } from '@/lib/auth.functions';
import { createStandardResponse } from '@/lib/utils';
import { createFileRoute } from '@tanstack/react-router'
import { and, eq } from "drizzle-orm";
import { db } from '@/db';

export const Route = createFileRoute("/api/s3/buckets/customUrl/")({
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
                                "Missing providerId or bucketId query parameter",
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
                            eq(s3buckets.parentCredential, providerId),
                            eq(s3buckets.id, bucketId),
                        ),
                    )
                    .execute();

                if (res.length === 0) {
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
                
                return new Response(
                    JSON.stringify(
                        createStandardResponse(
                            true,
                            res[0].customUrl,
                            null,
                            null
                        ),
                    ),
                    {
                        headers: {
                            "Content-Type": "application/json",
                        },
                        status: 200,
                    },
                );
            }
        }
    }
});