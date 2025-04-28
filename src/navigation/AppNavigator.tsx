import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, Button } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';
import LoginScreen from '../screens/LoginScreen';
import RegistrationScreen from '../screens/RegistrationScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import LocationSetupScreen from '../screens/LocationSetupScreen';
import ActivityFeedScreen from '../screens/ActivityFeedScreen';
import RepresentativeProfileScreen from '../screens/RepresentativeProfileScreen';
import BillDetailScreen from '../screens/BillDetailScreen';
import { Representative } from '../models/Representative';

// Define param lists for type safety
type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

type AppStackParamList = {
  LocationSetup: undefined;
  ActivityFeed: undefined;
  RepresentativeProfile: { representative: Representative };
  BillDetail: { billId: string };
};

const AuthStack = createStackNavigator<AuthStackParamList>();
const AppStack = createStackNavigator<AppStackParamList>();

// Auth Navigator (Login, Register, ForgotPassword)
const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegistrationScreen} />
    <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
  </AuthStack.Navigator>
);

// Main App Navigator (for authenticated users)
const AppNavigatorComponent = () => (
  <AppStack.Navigator initialRouteName="ActivityFeed">
    <AppStack.Screen name="LocationSetup" component={LocationSetupScreen} options={{ title: 'Set Location' }} />
    <AppStack.Screen name="ActivityFeed" component={ActivityFeedScreen} options={{ title: '4ThePeople Feed' }} />
    <AppStack.Screen name="RepresentativeProfile" component={RepresentativeProfileScreen} options={({ route }) => ({ title: route.params.representative.fullName || 'Profile' })} />
    <AppStack.Screen name="BillDetail" component={BillDetailScreen} options={{ title: 'Bill Details' }} />
  </AppStack.Navigator>
);

// Root navigator that switches based on auth state
const RootNavigator = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!loading) setLoading(false); // Ensure loading stops after initial check
      }
    );

    // Cleanup listener on unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []); // Run only once on mount

  // Optional: Show a loading indicator while checking session
  if (loading) {
     return (
       <View style={styles.container}>
         <Text>Loading...</Text>
       </View>
     );
  }

  return (
    <NavigationContainer>
      {session && session.user ? <AppNavigatorComponent /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Export the RootNavigator which handles the logic
export default RootNavigator; 