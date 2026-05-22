import { localDatabase } from '../../../services/api/localDatabase';
import type { CategoryType } from '../../../shared/types/api';

interface CreateCategoryPayload {
  name: string;
  type: CategoryType;
  icon?: string | null;
  color?: string | null;
}

export const categoryService = {
  async list(type?: CategoryType) {
    return localDatabase.listCategories(type);
  },
  async create(payload: CreateCategoryPayload) {
    return localDatabase.createCategory(payload);
  },
};
