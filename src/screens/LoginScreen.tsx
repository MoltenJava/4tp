import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { supabase } from '../utils/supabaseClient';

// TODO: Add navigation prop type if using React Navigation
const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert('Login Error', error.message);
    } else {
      // Navigation to the main app part will be handled by the auth state listener
      // console.log('Login successful');
    }
    setLoading(false);
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    Alert.alert('Apple Login', 'Apple login functionality not yet implemented.');
    // TODO: Implement Apple Sign In using supabase.auth.signInWithOAuth
    // This requires specific native configuration
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title={loading ? 'Logging in...' : 'Login'} onPress={handleLogin} disabled={loading} />
      <View style={styles.spacer} />
      <Button title="Login with Apple" onPress={handleAppleLogin} disabled={loading} />
      <View style={styles.spacer} />
      <Button
        title="Forgot Password?"
        onPress={() => navigation.navigate('ForgotPassword')}
        disabled={loading}
      />
      <View style={styles.spacer} />
      <Button
        title="Don't have an account? Register"
        onPress={() => navigation.navigate('Register')}
        disabled={loading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  spacer: {
    height: 15,
  },
});

export default LoginScreen; 