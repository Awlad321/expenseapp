import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, radius, spacing } from '../theme/theme';

export function StartupSplash() {
  const scale = useRef(new Animated.Value(0.86)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const floatOne = useRef(new Animated.Value(0)).current;
  const floatTwo = useRef(new Animated.Value(0)).current;
  const floatThree = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 9,
        stiffness: 110,
        mass: 0.8,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ),
      Animated.loop(
        Animated.stagger(220, [
          Animated.sequence([
            Animated.timing(floatOne, {
              toValue: 1,
              duration: 1800,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(floatOne, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(floatTwo, {
              toValue: 1,
              duration: 1800,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(floatTwo, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(floatThree, {
              toValue: 1,
              duration: 1800,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(floatThree, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      ),
    ]).start();
  }, [floatOne, floatThree, floatTwo, opacity, pulse, scale]);

  const haloScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.18],
  });
  const haloOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.22, 0.04],
  });
  const moneyOneStyle = buildMoneyStyle(floatOne, -48, -86, -28);
  const moneyTwoStyle = buildMoneyStyle(floatTwo, 0, -118, 0);
  const moneyThreeStyle = buildMoneyStyle(floatThree, 50, -92, 26);

  return (
    <LinearGradient colors={['#12090F', '#23111A', '#120B11']} style={styles.screen}>
      <Animated.View style={[styles.halo, { opacity: haloOpacity, transform: [{ scale: haloScale }] }]} />
      <Animated.View style={[styles.logoWrap, { opacity, transform: [{ scale }] }]}>
        <View style={styles.scene}>
          <Animated.View style={[styles.flyingMoney, moneyOneStyle]}>
            <Ionicons name="cash-outline" size={26} color="#F7D774" />
          </Animated.View>
          <Animated.View style={[styles.flyingMoney, moneyTwoStyle]}>
            <Ionicons name="cash-outline" size={24} color="#9AE6B4" />
          </Animated.View>
          <Animated.View style={[styles.flyingMoney, moneyThreeStyle]}>
            <Ionicons name="cash-outline" size={22} color="#7DD3FC" />
          </Animated.View>
          <LinearGradient colors={['#F59E0B', '#B45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logo}>
            <Ionicons name="briefcase-outline" size={46} color={colors.background} />
          </LinearGradient>
        </View>
        <View style={styles.copy}>
          <AppText variant="title">ExpensApp</AppText>
          <View style={styles.banner}>
            <AppText muted style={styles.bannerText}>awlad getting poor each time he opens the app</AppText>
          </View>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

function buildMoneyStyle(value: Animated.Value, xOffset: number, yOffset: number, rotateDeg: number) {
  return {
    opacity: value.interpolate({
      inputRange: [0, 0.12, 0.82, 1],
      outputRange: [0, 1, 0.85, 0],
    }),
    transform: [
      {
        translateX: value.interpolate({
          inputRange: [0, 1],
          outputRange: [0, xOffset],
        }),
      },
      {
        translateY: value.interpolate({
          inputRange: [0, 1],
          outputRange: [0, yOffset],
        }),
      },
      {
        rotate: value.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${rotateDeg}deg`],
        }),
      },
      {
        scale: value.interpolate({
          inputRange: [0, 0.4, 1],
          outputRange: [0.7, 1, 0.88],
        }),
      },
    ],
  };
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  halo: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#F97316',
  },
  logoWrap: {
    alignItems: 'center',
    gap: spacing.xl,
  },
  scene: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  logo: {
    width: 104,
    height: 104,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 10,
  },
  flyingMoney: {
    position: 'absolute',
    bottom: 44,
  },
  copy: {
    alignItems: 'center',
    gap: spacing.xs,
    width: 280,
  },
  banner: {
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bannerText: {
    textAlign: 'center',
  },
});
