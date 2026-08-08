import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";

const app = express();
app.get("/", (req, res) => {
  res.json({ message: "Atlas API çalışıyor" });
});

describe("Health check", () => {
  it("should return a success message", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Atlas API çalışıyor");
  });
});