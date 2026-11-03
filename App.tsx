import { AppBuildContext, type AppBuild } from './src/lib/appBuild';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App({ appVersion, buildNumber }: AppBuild) {
  return (
    <AppBuildContext.Provider value={{ appVersion, buildNumber }}>
      <SafeAreaProvider>
        <AppErrorBoundary>
          <AppNavigator />
        </AppErrorBoundary>
      </SafeAreaProvider>
    </AppBuildContext.Provider>
  );
}
