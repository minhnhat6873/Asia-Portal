import {
  EMPLOYEE_RANK_OPTIONS_UI,
  getEmployeeRankLabel,
} from "@/components/ui/employee-rank-options";

export { getEmployeeRankLabel };

export const EMPLOYEE_RANKS = EMPLOYEE_RANK_OPTIONS_UI.map((rank, order) => ({
  ...rank,
  order,
}));

/** @deprecated Import EMPLOYEE_RANK_OPTIONS_UI từ components/ui cho code mới. */
export const EMPLOYEE_RANK_OPTIONS = EMPLOYEE_RANK_OPTIONS_UI;

const rankOrder = new Map(EMPLOYEE_RANKS.map(({ value, order }) => [value, order]));

export function getEmployeeRankOrder(rank?: string): number {
  if (!rank) return Number.MAX_SAFE_INTEGER;
  return rankOrder.get(rank as (typeof EMPLOYEE_RANKS)[number]["value"]) ?? Number.MAX_SAFE_INTEGER;
}

export function sortEmployeesByRank<T extends { rank?: string; joinDate?: string }>(
  employees: T[],
): T[] {
  return [...employees].sort((left, right) => {
    const rankDifference = getEmployeeRankOrder(left.rank) - getEmployeeRankOrder(right.rank);
    if (rankDifference !== 0) return rankDifference;

    const leftDate = left.joinDate ? new Date(left.joinDate).getTime() : 0;
    const rightDate = right.joinDate ? new Date(right.joinDate).getTime() : 0;
    return rightDate - leftDate;
  });
}
