/**
 * Manage standing entries: rent, salary, an internet bill. Each rule writes an ordinary
 * income or expense when it comes due, so everything downstream treats them as normal.
 */
import { useState } from 'react';
import { View } from 'react-native';

import { ModalShell } from '@/components/modal-shell';
import { PageTitle } from '@/components/page-title';
import { RecurringSheet } from '@/components/recurring-sheet';
import { AmountText } from '@/components/ui/amount-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { ListGroup, ListRow } from '@/components/ui/list-row';
import { Text } from '@/components/ui/text';
import { textSize } from '@/constants/typography';
import { useCategorySet } from '@/hooks/use-categories';
import { frequencyLabel } from '@/lib/calc/recurring';
import { useStrings } from '@/lib/i18n';
import { formatTaka } from '@/lib/money';
import type { Recurring } from '@/lib/types';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';
import { confirmDialog, showToast } from '@/stores/ui';

export default function RecurringScreen() {
  const { tokens } = useTheme();
  const strings = useStrings();
  const t = strings.recurringScreen;
  const recurrings = useDataStore((s) => s.recurrings);
  const deleteRecurring = useDataStore((s) => s.deleteRecurring);
  const restoreRecurring = useDataStore((s) => s.restoreRecurring);

  // null = the sheet is closed, {} inside it = "add new".
  const [editing, setEditing] = useState<{ rule?: Recurring } | null>(null);

  const rules = recurrings.filter((r) => !r.isDeleted);
  const running = rules.filter((r) => !r.isPaused);
  const monthlyExpense = running
    .filter((r) => r.kind === 'EXPENSE' && r.frequency === 'MONTHLY')
    .reduce((sum, r) => sum + r.amount, 0);
  const monthlyIncome = running
    .filter((r) => r.kind === 'INCOME' && r.frequency === 'MONTHLY')
    .reduce((sum, r) => sum + r.amount, 0);

  const remove = async (rule: Recurring) => {
    const confirmed = await confirmDialog({
      title: t.deleteTitle,
      message: t.deleteMessage,
      confirmLabel: strings.common.remove,
      destructive: true,
    });
    if (!confirmed) return;
    deleteRecurring(rule.id);
    showToast({
      message: t.deleted,
      actionLabel: strings.common.undo,
      onAction: () => restoreRecurring(rule.id),
    });
  };

  return (
    <ModalShell title={t.title}>
      <PageTitle title={t.title} />

      {rules.length === 0 ? (
        <EmptyState
          icon="repeat-outline"
          title={t.emptyTitle}
          message={t.emptyMessage}
          actionLabel={t.emptyAction}
          onAction={() => setEditing({})}
        />
      ) : (
        <>
          {monthlyExpense > 0 || monthlyIncome > 0 ? (
            <Card soft padding={15} style={{ flexDirection: 'row', gap: 12 }}>
              <Icon name="calendar-number-outline" size={18} color={tokens.muted} />
              <Text style={{ flex: 1, fontSize: textSize.sm, lineHeight: 20, color: tokens.muted }}>
                {t.monthlyPrefix}
                {monthlyIncome > 0 ? (
                  <>
                    {strings.activity.income}{' '}
                    <Text style={{ fontWeight: '700', color: tokens.income }}>{formatTaka(monthlyIncome)}</Text>
                  </>
                ) : null}
                {monthlyIncome > 0 && monthlyExpense > 0 ? ' · ' : ''}
                {monthlyExpense > 0 ? (
                  <>
                    {strings.activity.expense}{' '}
                    <Text style={{ fontWeight: '700', color: tokens.expense }}>{formatTaka(monthlyExpense)}</Text>
                  </>
                ) : null}
              </Text>
            </Card>
          ) : null}

          <ListGroup>
            {rules.map((rule, index) => (
              <RuleRow key={rule.id} rule={rule} divider={index > 0} onPress={() => setEditing({ rule })} />
            ))}
          </ListGroup>


          <Button label={t.addNew} icon="add" variant="secondary" onPress={() => setEditing({})} />
        </>
      )}

      <Text style={{ fontSize: textSize.sm, lineHeight: 19, color: tokens.muted, marginLeft: 2, marginTop: 4 }}>
        {t.footer}
      </Text>

      {editing ? (
        <RecurringSheet
          visible
          onClose={() => setEditing(null)}
          existing={editing.rule}
          onDelete={editing.rule ? () => void remove(editing.rule!) : undefined}
        />
      ) : null}
    </ModalShell>
  );
}

/**
 * The row opens the rule, and pause sits beside it as its own control — nesting one
 * pressable inside another is invalid markup on web.
 */
function RuleRow({ rule, divider, onPress }: { rule: Recurring; divider: boolean; onPress: () => void }) {
  const { tokens } = useTheme();
  const t = useStrings().recurringScreen;
  const categories = useCategorySet(rule.kind);
  const setPaused = useDataStore((s) => s.setRecurringPaused);
  const meta = categories.meta(rule.category);
  const color = rule.isPaused ? tokens.muted : rule.kind === 'EXPENSE' ? tokens.expense : tokens.income;
  const name = rule.note || meta.label;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 8,
        borderTopWidth: divider ? 1 : 0,
        borderTopColor: tokens.line,
      }}>
      <View style={{ flex: 1 }}>
        <ListRow
          title={name}
          subtitle={rule.isPaused ? t.paused(frequencyLabel(rule)) : frequencyLabel(rule)}
          icon={meta.iconName}
          tint={color}
          dim={rule.isPaused}
          onPress={onPress}
          accessibilityHint={t.rowHint}
          trailing={<AmountText paisa={rule.amount} weight="700" color={color} numberOfLines={1} />}
        />
      </View>
      <IconButton
        icon={rule.isPaused ? 'play-outline' : 'pause-outline'}
        label={rule.isPaused ? t.resume(name) : t.pause(name)}
        variant="plain"
        color={tokens.muted}
        onPress={() => setPaused(rule.id, !rule.isPaused)}
      />
    </View>
  );
}
