// src/types/result.test.ts
import { describe, it, expect } from "vitest";
import { Result, ErrorCode } from "./result";

describe("Result Type", () => {
  it("ok:true carries data field", () => {
    const result: Result<string> = { ok: true, data: "success" };
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe("success");
    }
  });

  it("ok:false carries error string and ErrorCode", () => {
    const result: Result<string> = { ok: false, error: "failed", code: ErrorCode.FILE_NOT_FOUND };
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("failed");
      expect(result.code).toBe("FILE_NOT_FOUND");
    }
  });

  it("narrowing with result.ok correctly types the data/error field", () => {
    // Force result to be a union type to verify narrowing, instead of a constant with fixed value
    const getResult = (ok: boolean): Result<{ id: number }> => {
      if (ok) return { ok: true, data: { id: 123 } };
      return { ok: false, error: "error", code: ErrorCode.UNKNOWN_ERROR };
    };

    const success = getResult(true);
    if (success.ok) {
      expect(success.data.id).toBe(123);
    }

    const failure = getResult(false);
    if (!failure.ok) {
      expect(failure.error).toBe("error");
      expect(failure.code).toBe("UNKNOWN_ERROR");
    }
  });
});
