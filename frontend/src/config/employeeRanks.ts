export const EMPLOYEE_RANKS = [
  { value: "BOD", label: "Ban lãnh đạo", order: 0 },
  { value: "Executive", label: "Ban điều hành", order: 1 },
  { value: "Manager", label: "Quản lý", order: 2 },
  { value: "Team Leader", label: "Trưởng nhóm", order: 3 },
  { value: "Staff", label: "Nhân viên", order: 4 },
  { value: "Intern", label: "Thực tập sinh", order: 5 },
] as const;

export const EMPLOYEE_RANK_OPTIONS = EMPLOYEE_RANKS.map(({ value, label }) => ({
  value,
  label,
}));

const rankByValue = new Map<string, (typeof EMPLOYEE_RANKS)[number]>(
  EMPLOYEE_RANKS.map((rank) => [rank.value, rank]),
);

export function getEmployeeRankLabel(rank?: string): string {
  return (rank && rankByValue.get(rank)?.label) || "Chưa cập nhật";
}

export function getEmployeeRankOrder(rank?: string): number {
  if (!rank) return Number.MAX_SAFE_INTEGER;
  return rankByValue.get(rank)?.order ?? Number.MAX_SAFE_INTEGER;
}

export function sortEmployeesByRank<T extends { rank?: string; joinDate?: string }>(
  employees: T[],
): T[] {
  return [...employees].sort((left, right) => {
    const rankDifference =
      getEmployeeRankOrder(left.rank) - getEmployeeRankOrder(right.rank);
    if (rankDifference !== 0) return rankDifference;

    const leftDate = left.joinDate ? new Date(left.joinDate).getTime() : 0;
    const rightDate = right.joinDate ? new Date(right.joinDate).getTime() : 0;
    return rightDate - leftDate;
  });
}
