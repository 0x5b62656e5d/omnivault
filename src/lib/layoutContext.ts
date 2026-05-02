import { createContext, useContext } from "react";

type LayoutContextValue = {
    sidebarOpen: boolean;
    setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
    toggleSidebar: () => void;
};

export const LayoutContext = createContext<LayoutContextValue | null>(null);

export function useLayout() {
    const context = useContext(LayoutContext);

    if (!context) {
        throw new Error("Layout must be used in LayoutProvider");
    }

    return context;
}
