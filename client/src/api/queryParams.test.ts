import { describe, expect, it } from "vitest";
import { toQueryString } from "./queryParams";

describe("toQueryString", () => {
  it("returns an empty string when there are no params", () => {
    expect(toQueryString({})).toBe("");
  });

  it("omits undefined and empty-string values", () => {
    expect(toQueryString({ page: 1, search: undefined, sortBy: "" })).toBe("?page=1");
  });

  it("builds a query string with multiple params", () => {
    const result = toQueryString({ page: 2, pageSize: 10, search: "react" });
    const params = new URLSearchParams(result.slice(1));
    expect(params.get("page")).toBe("2");
    expect(params.get("pageSize")).toBe("10");
    expect(params.get("search")).toBe("react");
  });
});
