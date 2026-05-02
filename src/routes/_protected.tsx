import { useQuery } from "@tanstack/react-query";
import {
    createFileRoute,
    Link,
    Outlet,
    redirect,
    useLocation,
    useNavigate,
} from "@tanstack/react-router";
import type { InferSelectModel } from "drizzle-orm";
import { useState } from "react";
import { Loader } from "@/components/loader";
import { Button } from "@/components/ui/button";
import type { s3credentials } from "@/db/schema";
import { getSession } from "@/lib/auth.functions";
import { useLayout } from "@/lib/layoutContext";

export const Route = createFileRoute("/_protected")({
    beforeLoad: async ({ location }) => {
        const session = await getSession();

        if (!session) {
            throw redirect({
                to: "/signin",
                search: { redirect: location.href },
            });
        }

        return { user: session.user };
    },
    component: Component,
});

function Component() {
    return (
        <div className="relative flex flex-col lg:flex-row w-full min-h-full p-4">
            <div className="w-full">
                <Outlet />
            </div>
        </div>
    );
}
