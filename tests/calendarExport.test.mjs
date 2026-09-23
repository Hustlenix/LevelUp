import { test } from "node:test";
import assert from "node:assert/strict";
import { generateICSContent } from "../lib/calendarExport.ts";

const at = (s) => new Date(`2026-09-23T${s}Z`);

test("ICS escapes commas, semicolons and backslashes in SUMMARY", () => {
  const out = generateICSContent([
    {
      title: `Deep Work, Part "1"; 50% \\ focus`,
      description: "one",
      start: at("09:00:00"),
      end: at("09:50:00"),
    },
  ]);
  assert.ok(out.includes("SUMMARY:Deep Work\\, Part \"1\"\\; 50% \\\\ focus"));
});

test("ICS escapes newlines in SUMMARY and DESCRIPTION per RFC 5545", () => {
  const out = generateICSContent([
    {
      title: "Line one\nLine two",
      description: "part 1\r\npart 2\rpart 3",
      start: at("09:00:00"),
      end: at("09:50:00"),
    },
  ]);
  assert.ok(out.includes("SUMMARY:Line one\\nLine two"));
  assert.ok(out.includes("DESCRIPTION:part 1\\npart 2\\npart 3"));
});

test("no bare carriage returns or line feeds survive inside event lines", () => {
  const out = generateICSContent([
    {
      title: "A\nB",
      description: "C\r\nD\rE",
      start: at("09:00:00"),
      end: at("09:50:00"),
    },
  ]);
  for (const line of out.split("\r\n")) {
    if (line.startsWith("SUMMARY:") || line.startsWith("DESCRIPTION:")) {
      assert.ok(!line.includes("\r"), "surviving carriage return");
      assert.ok(!line.includes("\n"), "surviving line feed");
    }
  }
});