import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
    createRootRouteWithContext,
    HeadContent,
    Scripts,
    useNavigate,
    useRouter,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { NotFound } from "@/components/notFound";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth.functions";
import { authClient } from "@/lib/auth-client";
import { opengraphTags, twitterTags } from "@/lib/seo";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";
import { useState } from "react";

interface MyRouterContext {
    queryClient: QueryClient;
    user: {
        id: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
    } | null;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
    head: () => ({
        meta: [
            {
                charSet: "utf-8",
            },
            {
                name: "viewport",
                content: "width=device-width, initial-scale=1",
            },
            {
                title: "Omnivault",
            },
            {
                name: "description",
                content: "",
            },
            ...opengraphTags,
            ...twitterTags,
            {
                name: "manifest",
                content: "https://omnivault.benkou.dev/manifest.json",
            },
            {
                name: "keywords",
                content:
                    "omnivault, s3, storage, cloud, buckets, self-hosted, storage manager",
            },
            {
                name: "robots",
                content: "index, follow",
            },
        ],
        links: [
            {
                rel: "stylesheet",
                href: appCss,
            },
        ],
    }),
    loader: async () => {
        const session = await getSession();

        return { user: session ? session.user : null };
    },
    shellComponent: RootDocument,
    notFoundComponent: NotFound,
});

function RootDocument({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    const router = useRouter();
    const { user } = Route.useLoaderData();
    const [showSignout, setShowSignout] = useState(true);

    const toggleSignout = () => {
        setShowSignout(!showSignout);
    };

    const handleSignout = async () => {
        await authClient.signOut();
        await router.invalidate();
        navigate({ to: "/signin" });
    };

    const handleSignin = async () => {
        navigate({ to: "/signin" });
    };

    return (
        <html lang="en">
            <head>
                <HeadContent />
            </head>
            <body>
                <header className="flex justify-between items-center p-4">
                    <div className="flex gap-1">
                        <h1>
                            <a href="/dashboard">Dashboard</a>
                        </h1>
                    </div>
                    <div className="flex gap-1">
                        {user ? (
                            <div className="relative">
                                <div onClick={toggleSignout} className="hover:cursor-pointer flex flex-col justify-start items-center">
                                    <p className="text-sm">Logged in as</p>
                                    <div className="flex gap-1 items-center">
                                        <img
                                            src={user.image || ""}
                                            alt={user.name}
                                            className="rounded-full size-12"
                                        />
                                        <p className="text-lg">{user.name}</p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    onClick={handleSignout}
                                    hidden={showSignout}
                                    className="absolute right-0 top-full mt-2"
                                >
                                    Sign out
                                </Button>
                            </div>
                        ) : (
                            <Button type="button" onClick={handleSignin}>
                                Sign in
                            </Button>
                        )}
                    </div>
                </header>
                {children}
                <TanStackDevtools
                    config={{
                        position: "bottom-right",
                    }}
                    plugins={[
                        {
                            name: "Tanstack Router",
                            render: <TanStackRouterDevtoolsPanel />,
                        },
                        TanStackQueryDevtools,
                    ]}
                />
                <Scripts />
            </body>
        </html>
    );
}
