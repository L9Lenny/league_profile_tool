import { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react';

export interface Icon {
    id: number;
    name: string;
}

export function useIcons(addLog: (msg: string) => void) {
    const [allIcons, setAllIcons] = useState<Icon[]>(() => {
        try {
            const cached = localStorage.getItem("profile_icons");
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch { /* ignore */ }
        return [];
    });
    const [iconSearchTerm, setIconSearchTerm] = useState("");
    const [ddragonVersion, setDdragonVersion] = useState(() => localStorage.getItem("ddragon_version") || "14.3.1");
    const [visibleIconsCount, setVisibleIconsCount] = useState(100);
    const deferredSearchTerm = useDeferredValue(iconSearchTerm);
    const gridRef = useRef<HTMLDivElement>(null);

    // Removed the initial useEffect for loading cached icons as useState initializers handle this.
    // The fetchIcons useEffect will also update the state if cache is stale or empty.

    useEffect(() => {
        const controller = new AbortController();
        const fetchIcons = async () => {
            try {
                // 1. Get latest Data Dragon version
                const resV = await fetch("https://ddragon.leagueoflegends.com/api/versions.json", {
                    signal: controller.signal
                });
                if (!resV.ok) throw new Error("Failed to load Data Dragon versions");
                const versions = await resV.json();
                const latest = versions[0];
                
                // 2. Check cache before doing the heavy fetch
                const cachedVersion = localStorage.getItem("icon_data_version");
                const cachedIcons = localStorage.getItem("profile_icons");
                
                if (cachedVersion === latest && cachedIcons) {
                    const parsed = JSON.parse(cachedIcons);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setAllIcons(parsed);
                        setDdragonVersion(latest);
                        // Skip fetching from Community Dragon if version matches
                        return;
                    }
                }

                setDdragonVersion(latest);
                const locale = "en_gb";
                addLog(`Refreshing icon database (v${latest})...`);

                // 3. Fetch descriptive icon names from Community Dragon (Large file ~2.5MB)
                const resI = await fetch(`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/${locale}/v1/summoner-icons.json`, {
                    signal: controller.signal
                });
                if (!resI.ok) throw new Error(`Failed to load profile icons for ${locale} from Community Dragon`);
                const data = await resI.json();
                
                // 4. Map and Cache
                const icons = data.map((icon: any) => ({
                    id: icon.id,
                    name: icon.title || `Icon ${icon.id}`
                }));

                setAllIcons(icons);
                localStorage.setItem("ddragon_version", latest);
                localStorage.setItem("icon_data_version", latest);
                localStorage.setItem("profile_icons", JSON.stringify(icons));
                addLog(`Icon database updated: ${icons.length} items loaded.`);
            } catch (err) {
                if (!controller.signal.aborted) {
                    addLog(`Icon background refresh failed: ${err}`);
                    // Fallback to cache even if version mismatch if fetch failed
                    const cached = localStorage.getItem("profile_icons");
                    if (cached) setAllIcons(JSON.parse(cached));
                }
            }
        };
        fetchIcons();
        return () => controller.abort();
    }, [addLog]);

    const filteredIcons = useMemo(() => {
        const term = deferredSearchTerm.trim().toLowerCase();
        if (!term) return allIcons;
        return allIcons.filter(icon =>
            icon.name.toLowerCase().includes(term) ||
            icon.id.toString().includes(term)
        );
    }, [allIcons, deferredSearchTerm]);

    const visibleIcons = useMemo(() => {
        return filteredIcons.slice(0, visibleIconsCount);
    }, [filteredIcons, visibleIconsCount]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 100) {
            if (visibleIconsCount < filteredIcons.length) {
                setVisibleIconsCount(prev => prev + 100);
            }
        }
    };

    useEffect(() => {
        setVisibleIconsCount(100);
        if (gridRef.current) gridRef.current.scrollTop = 0;
    }, [deferredSearchTerm]);

    return {
        allIcons,
        iconSearchTerm,
        setIconSearchTerm,
        ddragonVersion,
        visibleIcons,
        handleScroll,
        gridRef
    };
}
