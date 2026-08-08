import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import authMiddleware from "./auth.middleware.js";

process.env.JWT_SECRET = "test-secret";

function createMockReqRes(cookies = {}) {
  const req = { cookies };
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  const next = vi.fn();
  return { req, res, next };
}

describe("authMiddleware", () => {
  it("returns 401 when no token is present", () => {
    const { req, res, next } = createMockReqRes({});
    authMiddleware(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 for an invalid token", () => {
    const { req, res, next } = createMockReqRes({ token: "invalid-token" });
    authMiddleware(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() and attaches user for a valid token", () => {
    const token = jwt.sign({ userId: "123", username: "testuser" }, process.env.JWT_SECRET);
    const { req, res, next } = createMockReqRes({ token });
    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.userId).toBe("123");
  });
});