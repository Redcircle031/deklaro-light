import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();

vi.mock("openai", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: createMock,
        },
      },
    })),
  };
});

import { extractInvoiceData } from "@/lib/ai/extractor";

describe("extractInvoiceData", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
    createMock.mockReset();
  });

  it("parses structured JSON", async () => {
    createMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              supplier: { name: "ABC", vatId: "123", address: "Warszawa", confidence: 0.9 },
              buyer: { name: "XYZ", vatId: "456", address: "Kraków", confidence: 0.92 },
              header: { number: "FV/1", issueDate: "2025-01-02", dueDate: "2025-01-16", currency: "PLN", confidence: 0.88 },
              totals: { subtotal: 1000, tax: 230, total: 1230, currency: "PLN", confidence: 0.9 },
              lineItems: [
                {
                  description: "Usluga",
                  quantity: 10,
                  unitPrice: 100,
                  total: 1000,
                  confidence: 0.87,
                },
              ],
              notes: [],
              locale: "pl-PL",
              model: "gpt-4.1-mini",
              confidenceOverall: 0.9,
              rawText: "FV",
            }),
          },
        },
      ],
    });

    const result = await extractInvoiceData("FV", { model: "gpt-4.1-mini", locale: "pl-PL" });

    expect(result.supplier.name).toBe("ABC");
    expect(createMock).toHaveBeenCalledOnce();
  });

  it("throws on empty response", async () => {
    createMock.mockResolvedValueOnce({ choices: [{ message: { content: "" } }] });

    await expect(extractInvoiceData("FV"))
      .rejects.toThrow(/empty response/i);
  });
});
