import 'react-native-gesture-handler'; // Required for React Navigation
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation/AppNavigator'; // Import the navigator (exported as default)

export default function App() {
  return (
    <>
      <StatusBar style="auto" />
      <RootNavigator />
    </>
  );
}

// Remove the default styles as they are no longer needed here
// const styles = StyleSheet.create({...});
