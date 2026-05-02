import type { IconType } from "react-icons";
import { FaAws, FaCloudflare, FaDigitalOcean } from "react-icons/fa";
import { GrStorage } from "react-icons/gr";
import {
    SiBackblaze,
    SiGooglecloud,
    SiUpcloud,
    SiVultr,
    SiWasabi,
} from "react-icons/si";
import { VscAzure } from "react-icons/vsc";

export const ICON_LIST: Record<string, IconType> = {
    "amazonaws.com": FaAws,
    "googleapis.com": SiGooglecloud,
    "windows.net": VscAzure,
    "backblazeb2.com": SiBackblaze,
    "cloudflarestorage.com": FaCloudflare,
    "digitaloceanspaces.com": FaDigitalOcean,
    "upcloudobjects.com": SiUpcloud,
    "vultrobjects.com": SiVultr,
    "wasabisys.com": SiWasabi,
};

export const getProviderIcon = (
    endpoint: string,
    size: number | undefined = undefined,
) => {
    for (const key in ICON_LIST) {
        if (endpoint === "") {
            const Icon = ICON_LIST["amazonaws.com"];
            return <Icon size={size} />;
        } else if (endpoint.includes(key)) {
            const Icon = ICON_LIST[key];
            return <Icon size={size} />;
        }
    }

    return <GrStorage size={size} />;
};
