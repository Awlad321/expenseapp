import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { TransactionsStackParamList } from '../../../app/routes/types';
import { AppText } from '../../../shared/components/AppText';
import { Card } from '../../../shared/components/Card';
import { EmptyState } from '../../../shared/components/EmptyState';
import { FormInput } from '../../../shared/components/FormInput';
import { Header } from '../../../shared/components/Header';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { Screen } from '../../../shared/components/Screen';
import { SegmentedControl } from '../../../shared/components/SegmentedControl';
import { colors, radius, spacing } from '../../../shared/theme/theme';
import { useTheme } from '../../../shared/theme/ThemeContext';
import type { Category, CategoryTag, CategoryType, Transaction } from '../../../shared/types/api';
import { categoryService } from '../../categories/services/categoryService';
import { transactionService } from '../services/transactionService';
import { useResponsiveLayout } from '../../../shared/layout/responsive';

type Props = NativeStackScreenProps<TransactionsStackParamList, 'ManageCategories'>;
type ModalMode = 'create' | 'rename' | 'merge' | null;

export function ManageCategoriesScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const layout = useResponsiveLayout();
  const [type, setType] = useState<CategoryType>(route.params?.type ?? 'EXPENSE');
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [targetCategoryId, setTargetCategoryId] = useState(0);
  const [name, setName] = useState('');
  const [tag, setTag] = useState<CategoryTag>('GENERAL');
  const [saving, setSaving] = useState(false);

  async function load(nextType = type) {
    try {
      const [categoryData, transactionData] = await Promise.all([
        categoryService.list(nextType, { includeInactive: true }),
        transactionService.list({ type: nextType }),
      ]);
      setCategories(categoryData);
      setTransactions(transactionData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => {
    load();
  }, [type]));

  async function refresh() {
    setRefreshing(true);
    await load();
  }

  function openCreate() {
    setSelectedCategory(null);
    setTargetCategoryId(0);
    setName('');
    setTag('GENERAL');
    setModalMode('create');
  }

  function openRename(category: Category) {
    setSelectedCategory(category);
    setTargetCategoryId(0);
    setName(category.name);
    setTag(category.tag ?? 'GENERAL');
    setModalMode('rename');
  }

  function openMerge(category: Category) {
    setSelectedCategory(category);
    setTargetCategoryId(0);
    setName(category.name);
    setTag(category.tag ?? 'GENERAL');
    setModalMode('merge');
  }

  function closeModal() {
    setModalMode(null);
    setSelectedCategory(null);
    setTargetCategoryId(0);
    setName('');
    setTag('GENERAL');
  }

  async function saveCategory() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Category name required', 'Enter a category name.');
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'create') {
        await categoryService.create({ name: trimmed, type, tag });
      } else if (modalMode === 'rename' && selectedCategory) {
        await categoryService.update(selectedCategory.id, { name: trimmed, tag });
      } else {
        return;
      }
      closeModal();
      await load();
    } catch {
      Alert.alert('Could not save category', 'Check the category name and try again.');
    } finally {
      setSaving(false);
    }
  }

  async function archiveCategory(category: Category) {
    Alert.alert('Archive category', `Hide "${category.name}" from normal entry lists? Historical transactions will stay intact.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          try {
            await categoryService.archive(category.id);
            await load();
          } catch {
            Alert.alert('Could not archive category', 'Default categories cannot be archived.');
          }
        },
      },
    ]);
  }

  async function mergeCategory() {
    if (!selectedCategory || !targetCategoryId) {
      Alert.alert('Choose target category', 'Pick a category to merge into.');
      return;
    }

    setSaving(true);
    try {
      await categoryService.merge(selectedCategory.id, targetCategoryId);
      closeModal();
      await load();
    } catch {
      Alert.alert('Could not merge category', 'Only categories of the same type can be merged.');
    } finally {
      setSaving(false);
    }
  }

  const activeCategories = useMemo(() => categories.filter((item) => item.active !== false), [categories]);
  const archivedCategories = useMemo(() => categories.filter((item) => item.active === false), [categories]);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Header title="Categories" subtitle="Keep cash insights clean and consistent" rightIcon="add-outline" onRightPress={openCreate} />
      <SegmentedControl
        compact
        options={[
          { label: 'Expense', value: 'EXPENSE' },
          { label: 'Income', value: 'INCOME' },
        ]}
        value={type}
        onChange={(value) => {
          setType(value as CategoryType);
          setLoading(true);
        }}
      />

      {loading ? <ActivityIndicator color={colors.primary} /> : null}

      {!loading && activeCategories.length === 0 ? (
        <EmptyState icon="pricetags-outline" title="No categories" message="Add categories to keep your cash spending and income organized." />
      ) : null}

      {activeCategories.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="h2">Active</AppText>
          {activeCategories.map((category) => (
            <Card key={category.id}>
              <View style={styles.row}>
                <View style={styles.copy}>
                  <View style={styles.titleRow}>
                    <AppText>{category.name}</AppText>
                    {category.defaultCategory ? <Tag label="Default" /> : null}
                    <Tag label={category.tag ?? 'GENERAL'} />
                  </View>
                  <AppText variant="small" muted>{usageLabel(category, transactions)}</AppText>
                </View>
                <View style={styles.actions}>
                  <IconAction icon="create-outline" onPress={() => openRename(category)} color={theme.colors.primary} compact={layout.compact} />
                  {!category.defaultCategory ? <IconAction icon="git-merge-outline" onPress={() => openMerge(category)} color={theme.colors.accent} compact={layout.compact} /> : null}
                  {!category.defaultCategory ? <IconAction icon="archive-outline" onPress={() => archiveCategory(category)} color={theme.colors.danger} compact={layout.compact} /> : null}
                </View>
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      {archivedCategories.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="h2">Archived</AppText>
          {archivedCategories.map((category) => (
            <Card key={category.id}>
              <View style={styles.row}>
                <View style={styles.copy}>
                  <View style={styles.titleRow}>
                    <AppText>{category.name}</AppText>
                    <Tag label="Archived" />
                    <Tag label={category.tag ?? 'GENERAL'} />
                  </View>
                  <AppText variant="small" muted>{usageLabel(category, transactions)}</AppText>
                </View>
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      <Modal visible={modalMode !== null} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={[styles.backdrop, { backgroundColor: theme.scheme === 'dark' ? 'rgba(0,0,0,0.52)' : 'rgba(7,17,19,0.28)' }]}>
          <View style={[styles.panel, { width: '100%', maxWidth: layout.tablet ? 560 : 440, padding: layout.compact ? spacing.md : spacing.lg, backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.modalHeader}>
              <AppText variant="h2">
                {modalMode === 'create' ? `Add ${type === 'EXPENSE' ? 'expense' : 'income'} category` : modalMode === 'rename' ? 'Rename category' : 'Merge category'}
              </AppText>
              <Pressable onPress={closeModal} hitSlop={8}>
                <AppText variant="small" muted>Close</AppText>
              </Pressable>
            </View>

            {modalMode === 'merge' ? (
              <>
                <AppText muted>Move all historical entries from "{selectedCategory?.name}" into:</AppText>
                <View style={styles.chips}>
                  {activeCategories.filter((item) => item.id !== selectedCategory?.id).map((category) => {
                    const selected = targetCategoryId === category.id;
                    return (
                      <PrimaryButton
                        compact
                        key={category.id}
                        variant={selected ? 'primary' : 'ghost'}
                        onPress={() => setTargetCategoryId(category.id)}
                        style={styles.chip}
                      >
                        {category.name}
                      </PrimaryButton>
                    );
                  })}
                </View>
                <PrimaryButton loading={saving} onPress={mergeCategory}>Merge Category</PrimaryButton>
              </>
            ) : (
              <>
                <FormInput
                  label="Category name"
                  value={name}
                  onChangeText={setName}
                  autoFocus
                />
                {type === 'EXPENSE' ? (
                  <View style={styles.fieldBlock}>
                    <AppText variant="small" muted>Category meaning</AppText>
                    <SegmentedControl
                      compact
                      options={[
                        { label: 'General', value: 'GENERAL' },
                        { label: 'Fixed', value: 'FIXED' },
                        { label: 'Essential', value: 'ESSENTIAL' },
                        { label: 'Optional', value: 'DISCRETIONARY' },
                      ]}
                      value={tag}
                      onChange={(value) => setTag(value as CategoryTag)}
                    />
                  </View>
                ) : null}
                <PrimaryButton loading={saving} onPress={saveCategory}>
                  {modalMode === 'create' ? 'Add Category' : 'Save Category'}
                </PrimaryButton>
              </>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <AppText variant="small" muted>{label}</AppText>
    </View>
  );
}

function IconAction({ icon, onPress, color, compact }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; color: string; compact?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.iconAction, compact && styles.iconActionCompact]}>
      <Ionicons name={icon} size={18} color={color} />
    </Pressable>
  );
}

function usageLabel(category: Category, transactions: Transaction[]) {
  const usageCount = transactions.filter((transaction) => transaction.categoryId === category.id).length;
  if (usageCount === 0) {
    return 'Not used in cash transactions yet';
  }
  return `Used in ${usageCount} cash transaction${usageCount === 1 ? '' : 's'}`;
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  fieldBlock: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,158,110,0.10)',
  },
  iconActionCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  tag: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceMuted,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  panel: {
    gap: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minHeight: 40,
    borderRadius: radius.sm,
  },
});
