import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <AppNavigator />
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}
