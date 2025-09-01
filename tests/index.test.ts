import { greet } from "../src/index";

test("greet returns the right message", () => {
  expect(greet("world")).toBe("Hello, world");
});
