import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { FaDiscord, FaGithub } from "react-icons/fa";
import { SiRailway } from "react-icons/si";
import { DeleteButton } from "@/components/deleteButton";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_protected/account/")({
    component: DashboardLayout,
});

function DashboardLayout() {
    const [providerList, setProviderList] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteConfirmation, setDeleteConfirmation] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadProviders = useCallback(async () => {
        setIsLoading(true);
        const accountList = await authClient.listAccounts();

        setProviderList(
            accountList.data?.map(account =>
                account.providerId.toLowerCase(),
            ) ?? [],
        );
        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadProviders();
    }, [loadProviders]);

    const linkGithub = async (link: boolean) => {
        if (link) {
            await authClient.linkSocial({
                provider: "github",
                callbackURL: "/account",
            });
        } else {
            await authClient.unlinkAccount({
                providerId: "github",
            });
        }

        await loadProviders();
    };

    const linkDiscord = async (link: boolean) => {
        if (link) {
            await authClient.linkSocial({
                provider: "discord",
                callbackURL: "/account",
            });
        } else {
            await authClient.unlinkAccount({
                providerId: "discord",
            });
        }

        await loadProviders();
    };

    const linkRailway = async (link: boolean) => {
        if (link) {
            await authClient.linkSocial({
                provider: "railway",
                callbackURL: "/account",
            });
        } else {
            await authClient.unlinkAccount({
                providerId: "railway",
            });
        }

        await loadProviders();
    };

    const deleteAccount = async () => {
        if (!deleteConfirmation) {
            setDeleteConfirmation(true);
            return;
        }

        setIsDeleting(true);

        await authClient.deleteUser({
            callbackURL: "/signin",
        });

        setIsDeleting(false);
    };

    return (
        <>
            <Outlet />
            <div className="m-4 flex flex-col justify-center items-center gap-4">
                {isLoading ? (
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
                ) : (
                    <>
                        <Button
                            onClick={() =>
                                linkGithub(!providerList.includes("github"))
                            }
                            type="button"
                        >
                            <FaGithub />{" "}
                            {providerList.includes("github")
                                ? "Unlink"
                                : "Link"}{" "}
                            Github account
                        </Button>
                        <Button
                            onClick={() =>
                                linkDiscord(!providerList.includes("discord"))
                            }
                            type="button"
                        >
                            <FaDiscord />{" "}
                            {providerList.includes("discord")
                                ? "Unlink"
                                : "Link"}{" "}
                            Discord account
                        </Button>
                        <Button
                            onClick={() =>
                                linkRailway(!providerList.includes("railway"))
                            }
                            type="button"
                        >
                            <SiRailway />{" "}
                            {providerList.includes("railway")
                                ? "Unlink"
                                : "Link"}{" "}
                            Railway account
                        </Button>
                        <DeleteButton
                            onClick={deleteAccount}
                            deleteConfirmationId={
                                deleteConfirmation ? "account" : null
                            }
                            idMatcher={"account"}
                            disabled={isDeleting}
                        />
                    </>
                )}
            </div>
        </>
    );
}
