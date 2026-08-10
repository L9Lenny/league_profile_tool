import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { withRetry } from './utils/retry';

export interface LcuInfo {
    port: string;
    token: string;
}

export interface MusicBioSettings {
    enabled: boolean;
    pollIntervalSec: number;
    template: string;
    idleText: string;
    lastfmApiKey: string;
    lastfmUsername: string;
}

export const DEFAULT_IDLE_BIO = "Not listening now";

export const defaultMusicBioSettings = (): MusicBioSettings => ({
    enabled: false,
    pollIntervalSec: 15,
    template: "Listening to {title} - {artist}",
    idleText: DEFAULT_IDLE_BIO,
    lastfmApiKey: "",
    lastfmUsername: "",
});

interface AppState {
    lcu: LcuInfo | null;
    setLcu: (lcu: LcuInfo | null) => void;
    lcuRequest: (method: string, endpoint: string, body?: unknown) => Promise<unknown>;
    musicBio: MusicBioSettings;
    setMusicBio: (updater: Partial<MusicBioSettings> | ((prev: MusicBioSettings) => MusicBioSettings)) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
    lcu: null,
    setLcu: (lcu) => set({ lcu }),
    lcuRequest: async (method, endpoint, body) => {
        const lcu = get().lcu;
        if (!lcu) throw new Error("LCU not connected");
        const payload: Record<string, unknown> = { method, endpoint, port: lcu.port, token: lcu.token };
        if (body !== undefined) payload.body = body;
        return withRetry(() => invoke("lcu_request", payload));
    },
    musicBio: defaultMusicBioSettings(),
    setMusicBio: (updater) => set((state) => ({
        musicBio: typeof updater === 'function'
            ? updater(state.musicBio)
            : { ...state.musicBio, ...updater }
    })),
}));
