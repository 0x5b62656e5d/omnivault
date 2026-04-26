import { createFileRoute, redirect } from "@tanstack/react-router";
import { FaDiscord, FaGithub } from "react-icons/fa";
import { SiRailway } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth.functions";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/signin/")({
    beforeLoad: async ({ location }) => {
        const session = await getSession();

        if (session) {
            redirect({
                to: "/",
                search: { redirect: location.href },
            });
        }
    },
    component: RouteComponent,
});

function RouteComponent() {
    const signinWithGithub = async (
        _event: React.MouseEvent<HTMLButtonElement>,
    ) => {
        await authClient.signIn.social({
            provider: "github",
            callbackURL: "/",
        });
    };

    const signinWithDiscord = async (
        _event: React.MouseEvent<HTMLButtonElement>,
    ) => {
        await authClient.signIn.social({
            provider: "discord",
            callbackURL: "/",
        });
    };

    const signinWithRailway = async (
        _event: React.MouseEvent<HTMLButtonElement>,
    ) => {
        await authClient.signIn.social({
            provider: "railway",
            callbackURL: "/",
        });
    };

    return (
        <div className="flex flex-col justify-center items-center m-4 p-4 gap-4">
            <p>You must sign in.</p>
            <Button onClick={signinWithGithub} type="button">
                <FaGithub /> Sign in with Github
            </Button>
            <Button onClick={signinWithDiscord} type="button">
                <FaDiscord /> Sign in with Discord
            </Button>
            <Button onClick={signinWithRailway} type="button">
                <SiRailway /> Sign in with Railway
            </Button>
        </div>
    );
}
