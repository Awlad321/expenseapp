import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { LinearGradient } from 'expo-linear-gradient';
import type { AuthStackParamList } from '../../../app/routes/types';
import { useAuth } from '../../../app/providers/AuthContext';
import { AppText } from '../../../shared/components/AppText';
import { FormInput } from '../../../shared/components/FormInput';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { Screen } from '../../../shared/components/Screen';
import { colors, radius, spacing } from '../../../shared/theme/theme';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;
type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      await signIn(values.email, values.password);
    } catch {
      Alert.alert('Login failed', 'Check your email and password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <LinearGradient colors={['#1B4D3E', '#12343A']} style={styles.hero}>
          <AppText variant="title">ExpensApp</AppText>
          <AppText muted>Track income, expenses, and transfers without mixing the numbers.</AppText>
        </LinearGradient>
        <View style={styles.form}>
          <Controller control={control} name="email" render={({ field }) => (
            <FormInput label="Email" keyboardType="email-address" autoCapitalize="none" value={field.value} onChangeText={field.onChange} error={errors.email?.message} />
          )} />
          <Controller control={control} name="password" render={({ field }) => (
            <FormInput label="Password" secureTextEntry value={field.value} onChangeText={field.onChange} error={errors.password?.message} />
          )} />
          <PrimaryButton loading={loading} onPress={handleSubmit(onSubmit)}>Login</PrimaryButton>
          <Pressable onPress={() => navigation.navigate('Register')} style={styles.link}>
            <AppText muted>New here? <AppText style={styles.linkText}>Create account</AppText></AppText>
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
  hero: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    minHeight: 170,
    justifyContent: 'flex-end',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  form: {
    gap: spacing.lg,
  },
  link: {
    alignItems: 'center',
  },
  linkText: {
    color: colors.primary,
  },
});
