import type { Writable } from "svelte/store";
import { writable, get } from "svelte/store";

export type StoreName = `${"CHAT" | "THEME" | "SETTINGS"}_STORE`;

export const createStorage = <T>(key: StoreName, initValue: T): Writable<T> => {
    const storage = writable(initValue);

    const storedValueStr = localStorage.getItem(key);
    if (storedValueStr != null) storage.set(JSON.parse(storedValueStr));

    storage.subscribe(($storage) => {
        if ([null, undefined].includes($storage)) {
            localStorage.removeItem(key);
        } else {
            localStorage.setItem(key, JSON.stringify($storage));
        }
    });

    // TODO -- need to add a way to remove the listener
    window.addEventListener("storage", () => {
        const storedValueStr = localStorage.getItem(key);
        if (storedValueStr == null) return;

        const localValue: T = JSON.parse(storedValueStr);
        if (localValue !== get(storage)) storage.set(localValue);
    });

    return storage;
};
