import { apiClient } from '../../../services/api/apiClient';
import { endpoints } from '../../../services/api/endpoints';
import type { Category, CategoryType } from '../../../shared/types/api';

interface CreateCategoryPayload {
  name: string;
  type: CategoryType;
  icon?: string | null;
  color?: string | null;
}

export const categoryService = {
  async list(type?: CategoryType) {
    const { data } = await apiClient.get<Category[]>(endpoints.categories, { params: { type } });
    return data;
  },
  async create(payload: CreateCategoryPayload) {
    const { data } = await apiClient.post<Category>(endpoints.categories, payload);
    return data;
  },
};
