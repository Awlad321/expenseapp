import { apiClient } from '../../../services/api/apiClient';
import { endpoints } from '../../../services/api/endpoints';
import type { AuthResponse, User } from '../../../shared/types/api';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  name: string;
}

export const authService = {
  async login(payload: LoginPayload) {
    const { data } = await apiClient.post<AuthResponse>(endpoints.auth.login, payload);
    return data;
  },
  async register(payload: RegisterPayload) {
    const { data } = await apiClient.post<AuthResponse>(endpoints.auth.register, payload);
    return data;
  },
  async me() {
    const { data } = await apiClient.get<User>(endpoints.auth.me);
    return data;
  },
};
