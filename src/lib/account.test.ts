import { describe, expect, it } from "bun:test";
import { passwordMeetsMinimum, PROFILE_PHOTO_MAX_BYTES, validateProfilePhoto } from "@/lib/account";

describe("profile photo validation", () => {
  it("accepts supported images up to the 5 MB limit", () => {
    expect(validateProfilePhoto({ type: "image/jpeg", size: PROFILE_PHOTO_MAX_BYTES })).toBeNull();
    expect(validateProfilePhoto({ type: "image/png", size: 1024 })).toBeNull();
    expect(validateProfilePhoto({ type: "image/webp", size: 1024 })).toBeNull();
  });

  it("rejects unsupported types and images larger than 5 MB", () => {
    expect(validateProfilePhoto({ type: "image/gif", size: 1024 })).toBe("Choose a JPG, PNG, or WebP image.");
    expect(validateProfilePhoto({ type: "image/png", size: PROFILE_PHOTO_MAX_BYTES + 1 })).toBe(
      "The photo must be 5 MB or smaller.",
    );
  });
});

describe("password minimum", () => {
  it("requires at least six characters", () => {
    expect(passwordMeetsMinimum("12345")).toBe(false);
    expect(passwordMeetsMinimum("123456")).toBe(true);
  });
});