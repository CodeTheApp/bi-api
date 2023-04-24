export interface CreateUserRequest {
  email: Email;
  password: Password;
  username: Username;
}

export interface LoginRequest {
  email: Email;
  password: Password;
}

export interface Email {
  value: string;
  isValid: boolean;
}

export interface Password {
  value: string;
  isValid: boolean;
}

export interface Username {
  value: string;
}
