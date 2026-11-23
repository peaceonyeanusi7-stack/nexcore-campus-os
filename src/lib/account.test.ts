import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  passwordMeetsMinimum,
  profilePhotoObjectPath,
  PROFILE_PHOTO_MAX_BYTES,
  validateProfilePhoto,
} from "@/lib/account";

describe("profile photo validation", () => {
  it("accepts supported images up to the 5 MB limit", () => {
    assert.equal(validateProfilePhoto({ type: "image/jpeg", size: PROFILE_PHOTO_MAX_BYTES }), null);
    assert.equal(validateProfilePhoto({ type: "image/png", size: 1024 }), null);
    assert.equal(validateProfilePhoto({ type: "image/webp", size: 1024 }), null);
  });

  it("rejects unsupported types and images larger than 5 MB", () => {
    assert.equal(validateProfilePhoto({ type: "image/gif", size: 1024 }), "Choose a JPG, PNG, or WebP image.");
    assert.equal(
      validateProfilePhoto({ type: "image/png", size: PROFILE_PHOTO_MAX_BYTES + 1 }),
      "The photo must be 5 MB or smaller.",
    );
  });

  it("stores uploaded photos beneath the signed-in user's folder", () => {
    assert.equal(profilePhotoObjectPath("user-123", "upload-1", "image/webp"), "user-123/upload-1.webp");
    assert.equal(profilePhotoObjectPath("user-123", "upload-1", "image/gif"), null);
  });
});

describe("password minimum", () => {
  it("requires at least six characters", () => {
    assert.equal(passwordMeetsMinimum("12345"), false);
    assert.equal(passwordMeetsMinimum("123456"), true);
  });
});