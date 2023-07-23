import { createStorage } from "./storage";

export type ThemeName = `${string}_THEME`;
export type ThemeVariant = "LIGHT" | "DARK";

export type Theme = {
    name: ThemeName;
    variant: ThemeVariant;
    vars: {
        "--primary": string;
        "--primary-light": string;
        "--primary-dark": string;
        "--background": string;
        "--background-accent": string;
        "--background-hover": string;
        "--background-focus": string;
        "--surface": string;
        "--error": string;
        "--on-primary": string;
        "--on-background": string;
        "--on-surface": string;
        "--on-error": string;
        "--border": string;
        "--border-color": string;
        "--border-radius": string;
        "--shadow": string;
        "--shadow-light": string;
    };
};

export const themes: Theme[] = [
    {
        name: "LIGHT_THEME",
        variant: "LIGHT",
        vars: {
            "--primary": "#a93aff",
            "--primary-light": "#ce5eff",
            "--primary-dark": "#8400ff",
            "--background": "#ffffff",
            "--background-accent": "#eeeeee",
            "--background-hover": "#dddddd",
            "--background-focus": "#cccccc",
            "--surface": "#ffffff",
            "--error": "#b00020",
            "--on-primary": "#ffffff",
            "--on-background": "#444444",
            "--on-surface": "#000000",
            "--on-error": "#ffffff",
            "--shadow": "0 0 1rem rgba(0, 0, 0, 0.3)",
            "--shadow-light": "0 0 0.5rem rgba(0, 0, 0, 0.3)",
            "--border": "1px solid #000000",
            "--border-color": "#aaaaaa",
            "--border-radius": "0.5rem",
        },
    },
    {
        name: "DARK_THEME",
        variant: "DARK",
        vars: {
            "--primary": "#a93aff",
            "--primary-light": "#ce5eff",
            "--primary-dark": "#8400ff",
            "--background": "#151515",
            "--background-accent": "#222222",
            "--background-hover": "#333333",
            "--background-focus": "#333333",
            "--surface": "#222222",
            "--error": "#b00020",
            "--on-primary": "#ffffff",
            "--on-background": "#bbbbbb",
            "--on-surface": "#aaaaaa",
            "--on-error": "#ffffff",
            "--shadow": "0 0 1rem rgba(0, 0, 0, 0.3)",
            "--shadow-light": "0 0 0.5rem rgba(0, 0, 0, 0.3)",
            "--border": "1px solid #000000",
            "--border-color": "#555555",
            "--border-radius": "0.5rem",
        },
    },
];

const getOSTheme = (): ThemeName => {
    const prefersDarkMq = window.matchMedia("(prefers-color-scheme: dark)");
    return prefersDarkMq.matches ? "DARK_THEME" : "LIGHT_THEME";
};

const getTheme = (name: ThemeName): Theme =>
    themes.find((theme) => theme.name === name);

export const themeStore = createStorage<Theme>(
    "THEME_STORE",
    getTheme(getOSTheme())
);

export const switchTheme = (name: ThemeName) => {
    themeStore.set(getTheme(name));
};

export const applyTheme = (theme: Theme) => {
    return Object.entries(theme.vars).reduce(
        (rules, [prop, val]) => `${rules}${prop}:${val};`,
        ""
    );
};
