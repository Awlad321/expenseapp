import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { AuthStackParamList } from '../../../app/routes/types';
import { useAuth } from '../../../app/providers/AuthContext';
import { AppText } from '../../../shared/components/AppText';
import { FormInput } from '../../../shared/components/FormInput';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { Screen } from '../../../shared/components/Screen';
import { spacing } from '../../../shared/theme/theme';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters'),
});

type FormValues = z.infer<typeof schema>;
type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      await register(values.name, values.email, values.password);
    } catch {
      Alert.alert('Registration failed', 'Try a different email address.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <View style={styles.copy}>
          <AppText variant="title">Create account</AppText>
          <AppText muted>Start with secure access, then add your real money sources.</AppText>
        </View>
        <View style={styles.form}>
          <Controller control={control} name="name" render={({ field }) => (
            <FormInput label="Name" value={field.value} onChangeText={field.onChange} error={errors.name?.message} />
          )} />
          <Controller control={control} name="email" render={({ field }) => (
            <FormInput label="Email" keyboardType="email-address" autoCapitalize="none" value={field.value} onChangeText={field.onChange} error={errors.email?.message} />
          )} />
          <Controller control={control} name="password" render={({ field }) => (
            <FormInput label="Password" secureTextEntry value={field.value} onChangeText={field.onChange} error={errors.password?.message} />
          )} />
          <PrimaryButton loading={loading} onPress={handleSubmit(onSubmit)}>Register</PrimaryButton>
          <Pressable onPress={() => navigation.goBack()} style={styles.link}>
            <AppText muted>Already have an account?</AppText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xl,
  },
  copy: {
    gap: spacing.sm,
  },
  form: {
    gap: spacing.lg,
  },
  link: {
    alignItems: 'center',
  },
});
