import type { RateLimitSnapshot } from "../../../types";
import { formatRelativeTime } from "../../../utils/time";

type UsageLabels = {
  sessionPercent: number | null;
  weeklyPercent: number | null;
  sessionResetLabel: string | null;
  weeklyResetLabel: string | null;
  creditsLabel: string | null;
  subscriptionLabel: string | null;
  showWeekly: boolean;
};

const clampPercent = (value: number) =>
  Math.min(Math.max(Math.round(value), 0), 100);

function formatResetLabel(resetsAt?: number | null) {
  if (typeof resetsAt !== "number" || !Number.isFinite(resetsAt)) {
    return null;
  }
  const resetMs = resetsAt > 1_000_000_000_000 ? resetsAt : resetsAt * 1000;
  const relative = formatRelativeTime(resetMs).replace(/^in\s+/i, "");
  return `Resets ${relative}`;
}

function formatCreditsLabel(accountRateLimits: RateLimitSnapshot | null) {
  const credits = accountRateLimits?.credits ?? null;
  if (!credits?.hasCredits) {
    return null;
  }
  if (credits.unlimited) {
    return "Credits: Unlimited";
  }
  const balance = credits.balance?.trim() ?? "";
  if (!balance) {
    return null;
  }
  const intValue = Number.parseInt(balance, 10);
  if (Number.isFinite(intValue) && intValue > 0) {
    return `Credits: ${intValue} credits`;
  }
  const floatValue = Number.parseFloat(balance);
  if (Number.isFinite(floatValue) && floatValue > 0) {
    const rounded = Math.round(floatValue);
    return rounded > 0 ? `Credits: ${rounded} credits` : null;
  }
  return null;
}

function formatPlanType(planType: string): string {
  const normalized = planType.trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  if (normalized === "pro") {
    return "Pro";
  }
  if (normalized === "plus") {
    return "Plus";
  }
  if (normalized === "team") {
    return "Team";
  }
  if (normalized === "enterprise") {
    return "Enterprise";
  }
  if (normalized === "free") {
    return "Free";
  }
  return normalized
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatSubscriptionLabel(
  accountPlanType: string | null | undefined,
  accountRateLimits: RateLimitSnapshot | null,
): string | null {
  const rawPlanType = accountPlanType?.trim() || accountRateLimits?.planType?.trim() || "";
  if (!rawPlanType) {
    return null;
  }
  const readablePlan = formatPlanType(rawPlanType);
  if (!readablePlan) {
    return null;
  }
  return `Plan: ${readablePlan}`;
}

export function getUsageLabels(
  accountRateLimits: RateLimitSnapshot | null,
  showRemaining: boolean,
  accountPlanType?: string | null,
): UsageLabels {
  const usagePercent = accountRateLimits?.primary?.usedPercent;
  const globalUsagePercent = accountRateLimits?.secondary?.usedPercent;
  const sessionPercent =
    typeof usagePercent === "number"
      ? showRemaining
        ? 100 - clampPercent(usagePercent)
        : clampPercent(usagePercent)
      : null;
  const weeklyPercent =
    typeof globalUsagePercent === "number"
      ? showRemaining
        ? 100 - clampPercent(globalUsagePercent)
        : clampPercent(globalUsagePercent)
      : null;

  return {
    sessionPercent,
    weeklyPercent,
    sessionResetLabel: formatResetLabel(accountRateLimits?.primary?.resetsAt),
    weeklyResetLabel: formatResetLabel(accountRateLimits?.secondary?.resetsAt),
    creditsLabel: formatCreditsLabel(accountRateLimits),
    subscriptionLabel: formatSubscriptionLabel(accountPlanType, accountRateLimits),
    showWeekly: Boolean(accountRateLimits?.secondary),
  };
}
