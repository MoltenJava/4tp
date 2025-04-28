import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { supabase } from '../utils/supabaseClient';

// TODO: Add navigation prop type
const ForgotPasswordScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    // Note: Supabase redirects to your site URL specified in Supabase Auth settings
    // Make sure this is configured correctly for the password reset flow.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Optionally specify where the user should be redirected after clicking the link
      // redirectTo: 'myapp://reset-password', // Example using deep linking
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Password reset email sent! Please check your inbox.');
      navigation.goBack(); // Go back to login screen
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.instructions}>Enter your email address below to receive password reset instructions.</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Button
        title={loading ? 'Sending...' : 'Send Reset Email'}
        onPress={handlePasswordReset}
        disabled={loading}
      />
       <View style={styles.spacer} />
      <Button
        title="Back to Login"
        onPress={() => navigation.goBack()}
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
    marginBottom: 15,
  },
   instructions: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: 'gray',
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

export default ForgotPasswordScreen; 