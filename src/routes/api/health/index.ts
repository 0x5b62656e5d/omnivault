import { createFileRoute } from "@tanstack/react-router";
import { createStandardResponse } from "@/lib/utils";

export const Route = createFileRoute("/api/health/")({
    server: {
        handlers: {
            GET: () => {
                return new Response(
                    JSON.stringify(
                        createStandardResponse(
                            true,
                            `OK - ${new Date().toISOString()}`,
                            "Server is healthy",
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
            },
        },
    },
});
