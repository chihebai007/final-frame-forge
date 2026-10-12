import { describe, expect, it } from "vitest";
import "../../public/image-url.js";

const images = (globalThis as unknown as { MitinanImages: { safeImageUrl: (v: string) => string } }).MitinanImages;

describe("Admin image URLs", () => {
  it("accepts photos uploaded from the device", () => {
    const photo = "data:image/jpeg;base64,/9j/AA==";
    expect(images.safeImageUrl(photo)).toBe(photo);
  });
  it("allows existing and hosted photos", () => {
    expect(images.safeImageUrl("/images/photo.jpg")).toBe("/images/photo.jpg");
    expect(images.safeImageUrl("https://example.com/photo.jpg")).toBe("https://example.com/photo.jpg");
  });
  it("rejects executable image sources", () => {
    expect(images.safeImageUrl("javascript:alert(1)")).toBe("");
    expect(images.safeImageUrl("data:image/svg+xml;base64,AAAA")).toBe("");
    expect(images.safeImageUrl("//example.com/photo.jpg")).toBe("");
  });
});