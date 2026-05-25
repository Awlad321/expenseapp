import { localDatabase } from '../../../services/api/localDatabase';
import type { CategoryTag, CategoryType } from '../../../shared/types/api';

interface CreateCategoryPayload {
  name: string;
  type: CategoryType;
  tag?: CategoryTag;
  icon?: string | null;
  color?: string | null;
}

interface UpdateCategoryPayload {
  name: string;
  tag?: CategoryTag;
  icon?: string | null;
  color?: string | null;
}

export const categoryService = {
  async list(type?: CategoryType, options?: { includeInactive?: boolean }) {
    return localDatabase.listCategories(type, options);
  },
  async create(payload: CreateCategoryPayload) {
    return localDatabase.createCategory(payload);
  },
  async update(id: number, payload: UpdateCategoryPayload) {
    return localDatabase.updateCategory(id, payload);
  },
  async archive(id: number) {
    return localDatabase.archiveCategory(id);
  },
  async merge(sourceId: number, targetId: number) {
    return localDatabase.mergeCategories(sourceId, targetId);
  },
};
