import { describe, it, expect } from "bun:test";
import { scanContent, getSuggestion, Violation } from "./check-design-system";

describe("Design System Auditor", () => {
  it("should detect simple forbidden colors", () => {
    const content = 'const color = "bg-blue-500";';
    const violations: Violation[] = [];
    scanContent(content, "test.tsx", violations);
    
    expect(violations.length).toBe(1);
    expect(violations[0].match).toBe("bg-blue-500");
    expect(violations[0].label).toBe("Literal Color");
  });

  it("should detect variants like dark: and hover:", () => {
    const content = '<div className="dark:bg-white hover:text-black"></div>';
    const violations: Violation[] = [];
    scanContent(content, "test.tsx", violations);
    
    expect(violations.length).toBe(2);
    expect(violations.some(v => v.match === "dark:bg-white")).toBe(true);
    expect(violations.some(v => v.match === "hover:text-black")).toBe(true);
  });

  it("should handle group-hover: and other complex variants", () => {
    const content = '<div className="group-hover:bg-[#ff0000]"></div>';
    const violations: Violation[] = [];
    scanContent(content, "test.tsx", violations);
    
    // Should match Arbitrary Color (group-hover:bg-[#ff0000]) 
    // and NOT match Raw Hex separately because of lookbehind (?<!\[)
    expect(violations.length).toBe(1);
    expect(violations[0].match).toBe("group-hover:bg-[#ff0000]");
    expect(violations[0].prefix).toBe("group-hover:");
  });

  it("should detect classes inside cn() and clsx()", () => {
    const content = 'const classes = cn("text-slate-500", { "bg-red-500": true });';
    const violations: Violation[] = [];
    scanContent(content, "test.tsx", violations);
    
    expect(violations.length).toBe(2);
    expect(violations.some(v => v.match === "text-slate-500")).toBe(true);
    expect(violations.some(v => v.match === "bg-red-500")).toBe(true);
  });

  it("should respect // @ds-ignore directive", () => {
    const content = 'const classes = "bg-red-500"; // @ds-ignore';
    const violations: Violation[] = [];
    scanContent(content, "test.tsx", violations);
    
    expect(violations.length).toBe(0);
  });

  it("should avoid false positives for whitelisted tokens", () => {
    const content = '<div className="bg-primary text-muted-foreground border-border"></div>';
    const violations: Violation[] = [];
    scanContent(content, "test.tsx", violations);
    
    expect(violations.length).toBe(0);
  });

  it("should provide correct suggestions for arbitrary colors", () => {
    const { suggestion, replacement } = getSuggestion("Arbitrary Color", "dark:bg-[#ffffff]");
    expect(suggestion).toBe("dark:bg-background");
    expect(replacement).toBe("dark:bg-background");
  });

  it("should handle multiple variants combined", () => {
    const content = '<div className="dark:hover:bg-white"></div>';
    const violations: Violation[] = [];
    scanContent(content, "test.tsx", violations);
    
    expect(violations.length).toBe(1);
    expect(violations[0].match).toBe("dark:hover:bg-white");
    expect(violations[0].prefix).toBe("dark:hover:");
  });

  it("should detect classes inside cn() with objects and variants", () => {
    const content = 'const classes = cn({ "dark:hover:bg-[#ffffff]": isActive });';
    const violations: Violation[] = [];
    scanContent(content, "test.tsx", violations);
    
    expect(violations.length).toBe(1);
    expect(violations[0].match).toBe("dark:hover:bg-[#ffffff]");
    expect(violations[0].prefix).toBe("dark:hover:");
    expect(violations[0].replacement).toBe("dark:hover:bg-background");
  });

  it("should detect classes inside clsx() with arrays", () => {
    const content = 'const classes = clsx(["bg-black", condition && "text-white"]);';
    const violations: Violation[] = [];
    scanContent(content, "test.tsx", violations);
    
    expect(violations.length).toBe(2);
    expect(violations.some(v => v.match === "bg-black")).toBe(true);
    expect(violations.some(v => v.match === "text-white")).toBe(true);
  });
  it("should detect classes in multiline template literals", () => {
    const content = `
      const styles = \`
        bg-red-500
        text-white
      \`;
    `;
    const violations: Violation[] = [];
    scanContent(content, "test.tsx", violations);
    
    expect(violations.length).toBe(2);
    expect(violations.some(v => v.match === "bg-red-500")).toBe(true);
    expect(violations.some(v => v.match === "text-white")).toBe(true);
  });

  it("should detect classes in objects with multiline keys", () => {
    const content = `
      const classes = cn({
        "bg-[#fff]": 
          isActive,
        "hover:text-black": true
      });
    `;
    const violations: Violation[] = [];
    scanContent(content, "test.tsx", violations);
    
    expect(violations.length).toBe(2);
    expect(violations.some(v => v.match === "bg-[#fff]")).toBe(true);
    expect(violations.some(v => v.match === "hover:text-black")).toBe(true);
  });

  it("should respect // @ds-ignore on the specific line even in multiline contexts", () => {
    const content = `
      const x = "bg-red-500"; // @ds-ignore
      const y = "bg-red-600";
    `;
    const violations: Violation[] = [];
    scanContent(content, "test.tsx", violations);
    
    expect(violations.length).toBe(1);
    expect(violations[0].match).toBe("bg-red-600");
  });
});

