import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { s3credentials } from "@/db/schema";
import { getSession } from "@/lib/auth.functions";
import { encrypt } from "@/lib/encryption";
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

                const { name, accessKeyId, secretAccessKey, endpointUrl } =
                    body;

                await db.insert(s3credentials).values({
                    name,
                    accessKeyId: encrypt(accessKeyId),
                    secretAccessKey: encrypt(secretAccessKey),
                    endpointUrl,
                    ownedBy: session.user.id,
                });

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
