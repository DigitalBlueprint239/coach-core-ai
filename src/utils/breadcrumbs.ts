export interface Breadcrumb {
  at: number;
  category: 'navigation' | 'action' | 'error' | 'performance';
  message: string;
  data?: Record<string, unknown>;
}

const MAX_BREADCRUMBS = 40;
const crumbs: Breadcrumb[] = [];

export const addBreadcrumb = (crumb: Breadcrumb): void => {
  crumbs.unshift(crumb);
  if (crumbs.length > MAX_BREADCRUMBS) crumbs.length = MAX_BREADCRUMBS;
};

export const getBreadcrumbs = (): Breadcrumb[] => [...crumbs];

export const clearBreadcrumbs = (): void => {
  crumbs.length = 0;
};
