import { MilestoneOptionModel } from '../../../../../core/models/work-groups';

export interface MilestoneOption extends MilestoneOptionModel {
  label: string;
}

export interface MilestoneOptionGroup {
  label: string;
  items: MilestoneOption[];
}

export function toMilestoneOption(milestone: MilestoneOptionModel): MilestoneOption {
  return {
    ...milestone,
    label: `${milestone.groupTitle} / ${milestone.title}`,
  };
}

export function groupMilestones(milestones: MilestoneOption[]): MilestoneOptionGroup[] {
  const grouped = new Map<string, MilestoneOption[]>();
  for (const milestone of milestones) {
    const items = grouped.get(milestone.groupTitle) ?? [];
    items.push(milestone);
    grouped.set(milestone.groupTitle, items);
  }

  return [...grouped].map(([label, items]) => ({ label, items }));
}

export function uniqueMilestones(items: MilestoneOption[]): MilestoneOption[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}
