import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fileUrls } from "@/db/schema";
import { createStandardResponse } from "@/lib/utils";

export const Route = createFileRoute("/f/$fileId/")({
    server: {
        handlers: {
            GET: async ({ params }) => {
                const { fileId } = params as { fileId: string };

                if (!fileId) {
                    return new Response(
                        JSON.stringify(
                            createStandardResponse(
                                false,
                                null,
                                "Missing required query parameters",
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
                    .from(fileUrls)
                    .where(eq(fileUrls.id, fileId))
                    .limit(1);

                if (!res || res.length === 0) {
                    return new Response(
                        JSON.stringify(
                            createStandardResponse(
                                false,
                                null,
                                "File not found",
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

                return Response.redirect(res[0].url, 302);
            },
        },
    },
});
