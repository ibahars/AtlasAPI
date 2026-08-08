import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "./auth.validators.js";

describe("registerSchema", () => {
  it("accepts valid registration data", () => {
    const result = registerSchema.safeParse({
      username: "testuser",
      email: "test@test.com",
      password: "123456",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a password shorter than 6 characters", () => {
    const result = registerSchema.safeParse({
      username: "testuser",
      email: "test@test.com",
      password: "123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email format", () => {
    const result = registerSchema.safeParse({
      username: "testuser",
      email: "not-an-email",
      password: "123456",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a username shorter than 3 characters", () => {
    const result = registerSchema.safeParse({
      username: "ab",
      email: "test@test.com",
      password: "123456",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid login data", () => {
    const result = loginSchema.safeParse({
      email: "test@test.com",
      password: "anyvalue",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email format", () => {
    const result = loginSchema.safeParse({
      email: "notanemail",
      password: "123456",
    });
    expect(result.success).toBe(false);
  });
});