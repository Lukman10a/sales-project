// Mock Authentication Service
// In production, this would connect to a real backend API

export type StaffRole = "sales-assistant" | "manager" | "checkout" | "inventory";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "owner" | "apprentice" | "investor";
  staffRole?: StaffRole;
  businessName: string;
  avatar?: string;
  investorId?: string; // For investors, link to their profile
}

export interface LoginCredentials {
  email: string;
  password: string;
  role: "owner" | "apprentice" | "investor";
}

export interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "owner" | "apprentice" | "investor";
  businessName: string;
}

// Mock users database
const MOCK_USERS: Record<string, { password: string; user: User }> = {
  "ahmed@luxa.com": {
    password: "admin123",
    user: {
      id: "1",
      email: "ahmed@luxa.com",
      firstName: "Ahmed",
      lastName: "Hassan",
      role: "owner",
      businessName: "Prime Store",
      avatar: "",
    },
  },
  "ibrahim@luxa.com": {
    password: "staff123",
    user: {
      id: "2",
      email: "ibrahim@luxa.com",
      firstName: "Ibrahim",
      lastName: "Musa",
      role: "apprentice",
      staffRole: "manager",
      businessName: "Hassan Electronics",
      avatar: "",
    },
  },
  "fatima@investor.com": {
    password: "investor123",
    user: {
      id: "inv-1",
      email: "fatima@investor.com",
      firstName: "Fatima",
      lastName: "Adeyemi",
      role: "investor",
      businessName: "Prime Store",
      avatar: "",
      investorId: "inv-1",
    },
  },
  "karim@investor.com": {
    password: "investor123",
    user: {
      id: "inv-2",
      email: "karim@investor.com",
      firstName: "Karim",
      lastName: "Okafor",
      role: "investor",
      businessName: "Prime Store",
      avatar: "",
      investorId: "inv-2",
    },
  },
};

const AUTH_STORAGE_KEY = "luxa_auth_user";
const ROLE_STORAGE_KEY = "luxa_last_role";
const REGISTERED_USERS_KEY = "luxa_registered_users";

export class AuthService {
  // Login user
  static async login(credentials: LoginCredentials): Promise<User> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // First check dynamic registered users
    const registered = this.getRegisteredUsers();
    const regRecord = registered.find((u) => u.email === credentials.email);
    if (regRecord) {
      if (regRecord.password !== credentials.password) {
        throw new Error("Invalid email or password");
      }
      if (regRecord.user.role !== credentials.role) {
        throw new Error(`You don't have ${credentials.role} access`);
      }
      this.setUser(regRecord.user);
      this.setLastRole(credentials.role);
      return regRecord.user;
    }

    // Fallback to mock users
    const userRecord = MOCK_USERS[credentials.email];
    if (!userRecord || userRecord.password !== credentials.password) {
      throw new Error("Invalid email or password");
    }
    if (userRecord.user.role !== credentials.role) {
      throw new Error(`You don't have ${credentials.role} access`);
    }
    this.setUser(userRecord.user);
    this.setLastRole(credentials.role);
    return userRecord.user;
  }

  // Logout user
  static logout(): void {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    // Keep last role for convenience
  }

  // Update current user
  static updateUser(updates: Partial<User>): User {
    const user = this.getUser();
    if (!user) throw new Error("No user logged in");
    
    const updatedUser = { ...user, ...updates };
    
    // Don't persist avatar to localStorage to avoid quota issues
    // Avatar is stored in profile-specific storage instead
    if (updates.avatar) {
      // Just return the updated user without persisting
      return updatedUser;
    }
    
    this.setUser(updatedUser);
    return updatedUser;
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    return this.getUser() !== null;
  }

  // Get last selected role
  static getLastRole(): "owner" | "apprentice" | "investor" {
    if (typeof window === "undefined") return "owner";
    return (localStorage.getItem(ROLE_STORAGE_KEY) as "owner" | "apprentice" | "investor") || "owner";
  }

  // Set last selected role
  static setLastRole(role: "owner" | "apprentice" | "investor"): void {
    localStorage.setItem(ROLE_STORAGE_KEY, role);
  }

  // Persist user session in localStorage
  static setUser(user: User): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  }

  // Retrieve current user from localStorage
  static getUser(): User | null {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;

    try {
      return JSON.parse(stored) as User;
    } catch (error) {
      // Clear bad data to avoid repeated failures
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  }

  // Check if user has specific role
  static hasRole(role: "owner" | "apprentice" | "investor"): boolean {
    const user = this.getUser();
    return user?.role === role;
  }

  // Get user display name
  static getUserDisplayName(): string {
    const user = this.getUser();
    return user ? `${user.firstName} ${user.lastName}` : "";
  }

  // Registration support
  static register(data: SignupData): Promise<User> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Validate email uniqueness
        const registered = this.getRegisteredUsers();
        const existsInRegistered = registered.some((u) => u.email === data.email);
        const existsInMock = !!MOCK_USERS[data.email];
        if (existsInRegistered || existsInMock) {
          reject(new Error("Email already exists"));
          return;
        }

        const newUser: User = {
          id: `${Date.now()}`,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          staffRole: data.role === "apprentice" ? "sales-assistant" : undefined,
          businessName: data.businessName,
          avatar: "",
        };

        const record = { password: data.password, user: newUser };
        const updated = [...registered, { email: data.email, ...record }];
        this.setRegisteredUsers(updated);

        this.setUser(newUser);
        this.setLastRole(data.role);
        resolve(newUser);
      }, 800);
    });
  }

  private static getRegisteredUsers(): Array<{ email: string; password: string; user: User }> {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      localStorage.removeItem(REGISTERED_USERS_KEY);
      return [];
    }
  }

  private static setRegisteredUsers(users: Array<{ email: string; password: string; user: User }>): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
  }
}
