import { createContext, useContext } from 'react';

export type AppBuild = { appVersion?: string; buildNumber?: string };
// Supplied by the installed native binary, never package.json or a network call.
export const AppBuildContext = createContext<AppBuild>({});
export const useAppBuild = () => useContext(AppBuildContext);
