import { localDatabase } from '../../../services/api/localDatabase';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  name: string;
}

export const authService = {
  async login(payload: LoginPayload) {
    return localDatabase.login(payload);
  },
  async register(payload: RegisterPayload) {
    return localDatabase.register(payload);
  },
  async me() {
    return localDatabase.me();
  },
};
