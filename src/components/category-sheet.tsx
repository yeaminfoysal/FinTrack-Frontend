/**
 * Add or rename one of the user's own categories: a name, an icon from the grid, save.
 * Used both from the add-entry forms (where saving also selects the new category) and
 * from the manage screen.
 *
 * Mount it only while it is open (or give it a key): the fields start from `existing`
 * and are not reset when `visible` flips.
 */
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { CATEGORY_ICON_CHOICES, DEFAULT_CATEGORY_ICON, type CategorySet } from '@/constants/categories';
import { withAlpha } from '@/constants/tokens';
import type { Category } from '@/lib/types';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';
import { showToast } from '@/stores/ui';

const MAX_LABEL = 40;

interface CategorySheetProps {
  visible: boolean;
  onClose: () => void;
  /** Built-ins + the user's own, for the duplicate-name check. Its `kind` is what gets created. */
  set: CategorySet;
  /** Rename this category; omit to create a new one. */
  existing?: Category;
  /** The saved category's key — a new id, or the edited one's. */
  onSaved?: (key: string) => void;
  /**
   * Shows a delete button while editing. The sheet closes first and then calls this: a
   * confirm dialog is rendered by the root DialogHost and would otherwise sit under the sheet.
   */
  onDelete?: () => void;
}

export function CategorySheet({ visible, onClose, set, existing, onSaved, onDelete }: CategorySheetProps) {
  const isExpense = set.kind === 'EXPENSE';
  const noun = isExpense ? 'ক্যাটাগরি' : 'উৎস';
  const { tokens } = useTheme();
  const addCategory = useDataStore((s) => s.addCategory);
  const updateCategory = useDataStore((s) => s.updateCategory);

  const [label, setLabel] = useState(existing?.label ?? '');
  const [iconName, setIconName] = useState(existing?.iconName ?? DEFAULT_CATEGORY_ICON.iconName);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const trimmed = label.trim();
    if (!trimmed) {
      setError(`${noun}র নাম লিখুন।`);
      return;
    }
    if (set.hasLabel(trimmed, existing?.id)) {
      setError(`"${trimmed}" নামে একটি ${noun} আগে থেকেই আছে।`);
      return;
    }
    if (existing) {
      updateCategory(existing.id, { label: trimmed, iconName });
      showToast({ message: `${noun} আপডেট হয়েছে` });
      onSaved?.(existing.id);
    } else {
      const id = addCategory({ kind: set.kind, label: trimmed, iconName });
      showToast({ message: `${noun} যোগ হয়েছে · ${trimmed}` });
      onSaved?.(id);
    }
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={existing ? `${noun} এডিট করুন` : `নতুন ${noun}`}
      scroll
      gap={14}>
      <Field
        label={`${noun}র নাম`}
        value={label}
        onChangeText={(v) => {
          setLabel(v);
          setError(null);
        }}
        placeholder={isExpense ? 'যেমন: মোবাইল রিচার্জ' : 'যেমন: টিউশন'}
        maxLength={MAX_LABEL}
        autoFocus
        error={error}
      />
      <View style={{ gap: 8 }}>
        <FieldLabel>আইকন</FieldLabel>
        <IconGrid value={iconName} onChange={setIconName} />
      </View>
      <Button label={existing ? 'পরিবর্তন সেভ করুন' : `${noun} যোগ করুন`} icon="checkmark" onPress={save} />
      {existing && onDelete ? (
        <Button
          label="ডিলিট করুন"
          icon="trash-outline"
          variant="outline"
          color={tokens.expense}
          onPress={() => {
            onClose();
            onDelete();
          }}
        />
      ) : null}
    </BottomSheet>
  );
}

function IconGrid({ value, onChange }: { value: string; onChange: (iconName: string) => void }) {
  const { tokens } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="আইকন" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {CATEGORY_ICON_CHOICES.map(({ iconName, icon }) => {
        const selected = iconName === value;
        return (
          <Pressable
            key={iconName}
            onPress={() => onChange(iconName)}
            accessibilityRole="radio"
            accessibilityLabel={icon}
            accessibilityState={{ checked: selected }}
            style={({ pressed }) => ({
              width: 46,
              height: 46,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 13,
              borderWidth: 1,
              backgroundColor: selected ? withAlpha(tokens.primary, 0.12) : tokens.surface,
              borderColor: selected ? tokens.primary : tokens.line,
              opacity: pressed ? 0.8 : 1,
            })}>
            <Icon name={iconName} size={21} color={selected ? tokens.primary : tokens.muted} />
          </Pressable>
        );
      })}
    </View>
  );
}
