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
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { IoIosWarning } from "react-icons/io";
import { NotFound } from "@/components/notFound";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth.functions";
import { authClient } from "@/lib/auth-client";
import { LayoutContext } from "@/lib/layoutContext";
import { opengraphTags, twitterTags } from "@/lib/seo";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";

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
                content:
                    "A unified dashboard to manage all your S3-compatible storage services.",
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
                    "omnivault, s3, storage, cloud, buckets, self-hosted, storage manager, s3 dashboard",
            },
            {
                name: "robots",
                content: "index, follow",
            },
        ],
        links: [
            {
                rel: "icon",
                href: "/icon.svg",
                type: "image/svg+xml",
            },
            {
                rel: "stylesheet",
                href: appCss,
            },
            {
                rel: "canonical",
                href: "https://omnivault.benkou.dev",
            },
        ],
    }),
    loader: async () => {
        const start = performance.now();
        const session = await getSession();
        console.log("rootsession", performance.now() - start);

        return { user: session ? session.user : null };
    },
    shellComponent: RootDocument,
    notFoundComponent: NotFound,
});

function RootDocument({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    const router = useRouter();
    const { user } = Route.useLoaderData();
    const [showAccountMenu, setShowAccountMenu] = useState(true);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const sidebarRef = useRef<HTMLDivElement | null>(null);
    const sidebarButtonRef = useRef<HTMLButtonElement | null>(null);

    const toggleAccountMenu = () => {
        setShowAccountMenu(!showAccountMenu);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setShowAccountMenu(true);
            }

            if (
                sidebarRef.current &&
                !sidebarRef.current.contains(event.target as Node) &&
                sidebarButtonRef.current &&
                !sidebarButtonRef.current.contains(event.target as Node)
            ) {
                setSidebarOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSignout = async () => {
        await authClient.signOut();
        await router.invalidate();
        navigate({ to: "/signin" });
    };

    const handleSignin = async () => {
        navigate({ to: "/signin" });
    };

    const toggleSidebar = () => {
        setSidebarOpen(prev => !prev);
    };

    return (
        <html lang="en">
            <head>
                <HeadContent />
            </head>
            <body className="min-h-screen w-full">
                <LayoutContext.Provider
                    value={{
                        sidebarOpen,
                        setSidebarOpen,
                        toggleSidebar,
                    }}
                >
                    <div className="flex min-h-screen flex-col">
                        <div className="flex items-center justify-center gap-2 py-2 px-4 text-center bg-orange-400/50">
                            <IoIosWarning />
                            <p>
                                Omnivault is still in development. Account data
                                may be deleted at any time.
                            </p>
                            <IoIosWarning />
                        </div>
                        <header className="hidden lg:flex justify-between items-center py-4 px-6 border-b-2">
                            <div className="flex gap-1">
                                <nav className="flex gap-4 items-center">
                                    <p
                                        onClick={() =>
                                            navigate({
                                                to: "/",
                                            })
                                        }
                                        className="hover:cursor-pointer"
                                    >
                                        <u>Dashboard</u>
                                    </p>
                                    <p
                                        onClick={() =>
                                            navigate({
                                                to: "/about",
                                            })
                                        }
                                        className="hover:cursor-pointer"
                                    >
                                        <u>About</u>
                                    </p>
                                    <p
                                        onClick={() =>
                                            navigate({
                                                to: "/account",
                                            })
                                        }
                                        className="hover:cursor-pointer"
                                    >
                                        <u>Manage account</u>
                                    </p>
                                </nav>
                            </div>
                            <nav className="flex gap-1">
                                {user ? (
                                    <div ref={menuRef} className="relative">
                                        <div
                                            onClick={toggleAccountMenu}
                                            className="hover:cursor-pointer flex flex-col justify-start items-center gap-1"
                                        >
                                            <p className="text-sm">
                                                Logged in as
                                            </p>
                                            <div className="flex gap-1 items-center">
                                                <img
                                                    src={user.image || ""}
                                                    alt={user.name}
                                                    className="rounded-full size-10"
                                                />
                                                <p className="text-xl">
                                                    {user.name}
                                                </p>
                                            </div>
                                        </div>
                                        <AnimatePresence>
                                            {!showAccountMenu && (
                                                <motion.div
                                                    initial={{
                                                        opacity: 0,
                                                        y: -8,
                                                    }}
                                                    animate={{
                                                        opacity: 1,
                                                        y: 0,
                                                    }}
                                                    exit={{ opacity: 0, y: -8 }}
                                                    transition={{
                                                        duration: 0.15,
                                                    }}
                                                    className="absolute flex flex-col gap-1 right-0 top-full mt-2 z-30"
                                                >
                                                    <Button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowAccountMenu(
                                                                true,
                                                            );
                                                            navigate({
                                                                to: "/account",
                                                            });
                                                        }}
                                                    >
                                                        Manage account
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        onClick={handleSignout}
                                                        variant="destructive"
                                                    >
                                                        Sign out
                                                    </Button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ) : (
                                    <Button
                                        type="button"
                                        onClick={handleSignin}
                                    >
                                        Sign in
                                    </Button>
                                )}
                            </nav>
                        </header>
                        <Button
                            ref={sidebarButtonRef}
                            type="button"
                            onClick={toggleSidebar}
                            className="px-4 py-2 m-4 lg:hidden w-fit"
                        >
                            Menu
                        </Button>
                        <main className="flex flex-1 min-h-0">
                            <Sidebar
                                user={user}
                                invalidateRouter={() => router.invalidate()}
                                ref={sidebarRef}
                            />
                            {children}
                        </main>
                    </div>
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
                </LayoutContext.Provider>
            </body>
        </html>
    );
}
