/**
 * LedgerFlow: Power BI-Style Cross-Filtering Utilities
 *
 * Provides color manipulation (dimming / highlighting for unselected elements),
 * label formatters, and multi-predicate filtering helpers.
 */

/**
 * Dim an RGB/RGBA/Hex color to 20-25% opacity for Power BI-style unselected visual ghosting.
 */
export function dimColor(color: string, opacity: number = 0.22): string {
  if (!color) return color;
  const trimmed = color.trim();

  // If already rgba(r, g, b, a), replace alpha
  if (trimmed.startsWith('rgba(')) {
    const parts = trimmed.slice(5, -1).split(',').map((p) => p.trim());
    if (parts.length >= 3) {
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${opacity})`;
    }
  }

  // If rgb(r, g, b), convert to rgba with opacity
  if (trimmed.startsWith('rgb(')) {
    const parts = trimmed.slice(4, -1).split(',').map((p) => p.trim());
    if (parts.length >= 3) {
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${opacity})`;
    }
  }

  // If 6-digit or 3-digit hex (#3b82f6 or #fff)
  if (trimmed.startsWith('#')) {
    let hex = trimmed.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
  }

  return color;
}

/**
 * Cleanly format filter dimensions and values into human-readable titles.
 */
export function formatDimensionLabel(dimension: string, value: string): string {
  if (dimension === 'month') {
    try {
      const [y, m] = value.split('-');
      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      const mIdx = parseInt(m, 10) - 1;
      if (mIdx >= 0 && mIdx < 12) {
        return `${monthNames[mIdx]} ${y}`;
      }
    } catch {
      return value;
    }
  }

  if (dimension === 'productLine') {
    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  if (dimension === 'department') {
    const deptLabels: Record<string, string> = {
      engineering: 'Engineering & R&D',
      sales: 'Sales & Growth',
      'g&a': 'General & Administrative',
      marketing: 'Marketing',
      operations: 'Fintech Operations',
      support: 'Customer Support',
    };
    return deptLabels[value.toLowerCase()] || value.charAt(0).toUpperCase() + value.slice(1);
  }

  if (dimension === 'customerTier') {
    const tierLabels: Record<string, string> = {
      enterprise: 'Enterprise Tier',
      pro: 'Professional Plan',
      starter: 'Starter Tier',
      free: 'Self-Serve & Free',
    };
    return tierLabels[value.toLowerCase()] || value.charAt(0).toUpperCase() + value.slice(1);
  }

  if (dimension === 'agingBucket') {
    const bucketLabels: Record<string, string> = {
      current: 'Current (0-30 Days)',
      days_31_60: '31-60 Days Overdue',
      days_61_90: '61-90 Days Overdue',
      days_90_plus: '90+ Days Delinquent',
    };
    return bucketLabels[value] || value;
  }

  if (dimension === 'declineCode') {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return value;
}

export const formatFilterLabel = formatDimensionLabel;
