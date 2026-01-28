import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { executeWhoisQuery } from "./whois-query";
import { EventEmitter } from "events";

// Create a mock socket instance that will be reused
let mockSocket: EventEmitter & {
  connect: ReturnType<typeof vi.fn>;
  write: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  setTimeout: ReturnType<typeof vi.fn>;
};

// Mock the net module
vi.mock("net", () => {
  return {
    Socket: vi.fn(function (this: typeof mockSocket) {
      // Return the mock socket instance
      return mockSocket;
    }),
  };
});

describe("executeWhoisQuery", () => {
  beforeEach(() => {
    // Create a fresh mock socket with EventEmitter capabilities
    mockSocket = Object.assign(new EventEmitter(), {
      connect: vi.fn(),
      write: vi.fn(),
      destroy: vi.fn(),
      setTimeout: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockSocket.removeAllListeners();
  });

  describe("successful queries", () => {
    it("should execute a successful WHOIS query", async () => {
      const testResponse = "Domain Name: example.com\nRegistrar: Test Registrar";

      // Start the query
      const queryPromise = executeWhoisQuery("whois.example.com", "example.com");

      // Simulate successful connection
      mockSocket.emit("connect");

      // Simulate data response
      mockSocket.emit("data", Buffer.from(testResponse));

      // Simulate end of response
      mockSocket.emit("end");

      const result = await queryPromise;

      expect(result).toBe(testResponse);
      expect(mockSocket.connect).toHaveBeenCalledWith(43, "whois.example.com");
      expect(mockSocket.write).toHaveBeenCalledWith("example.com\r\n");
      expect(mockSocket.destroy).toHaveBeenCalled();
    });

    it("should handle multiple data chunks", async () => {
      const chunk1 = "Domain Name: example.com\n";
      const chunk2 = "Registrar: Test Registrar\n";
      const chunk3 = "Created Date: 2020-01-01";

      const queryPromise = executeWhoisQuery("whois.example.com", "example.com");

      mockSocket.emit("connect");
      mockSocket.emit("data", Buffer.from(chunk1));
      mockSocket.emit("data", Buffer.from(chunk2));
      mockSocket.emit("data", Buffer.from(chunk3));
      mockSocket.emit("end");

      const result = await queryPromise;

      expect(result).toBe(chunk1 + chunk2 + chunk3);
    });

    it("should use custom timeout when provided", async () => {
      const customTimeout = 5000;

      const queryPromise = executeWhoisQuery(
        "whois.example.com",
        "example.com",
        customTimeout,
      );

      mockSocket.emit("connect");
      mockSocket.emit("data", Buffer.from("test data"));
      mockSocket.emit("end");

      await queryPromise;

      expect(mockSocket.setTimeout).toHaveBeenCalledWith(customTimeout);
    });

    it("should use default timeout when not provided", async () => {
      const queryPromise = executeWhoisQuery("whois.example.com", "example.com");

      mockSocket.emit("connect");
      mockSocket.emit("data", Buffer.from("test data"));
      mockSocket.emit("end");

      await queryPromise;

      expect(mockSocket.setTimeout).toHaveBeenCalledWith(10000);
    });
  });

  describe("error handling", () => {
    it("should reject on connection error", async () => {
      const testError = new Error("Connection refused");

      const queryPromise = executeWhoisQuery("whois.example.com", "example.com");

      mockSocket.emit("error", testError);

      await expect(queryPromise).rejects.toThrow("Connection refused");
      expect(mockSocket.destroy).toHaveBeenCalled();
    });

    it("should reject on timeout", async () => {
      const queryPromise = executeWhoisQuery(
        "whois.example.com",
        "example.com",
        1000,
      );

      mockSocket.emit("connect");
      mockSocket.emit("timeout");

      await expect(queryPromise).rejects.toThrow("WHOIS query timeout");
      expect(mockSocket.destroy).toHaveBeenCalled();
    });

    it("should reject on socket error after connection", async () => {
      const testError = new Error("Socket error");

      const queryPromise = executeWhoisQuery("whois.example.com", "example.com");

      mockSocket.emit("connect");
      // Emit error immediately after connection
      mockSocket.emit("error", testError);

      await expect(queryPromise).rejects.toThrow("Socket error");
      expect(mockSocket.destroy).toHaveBeenCalled();
    });

    it("should handle network errors gracefully", async () => {
      const networkError = new Error("ENOTFOUND");

      const queryPromise = executeWhoisQuery("invalid.server", "example.com");

      mockSocket.emit("error", networkError);

      await expect(queryPromise).rejects.toThrow("ENOTFOUND");
    });
  });

  describe("query formats", () => {
    it("should properly format query with CRLF", async () => {
      const queryPromise = executeWhoisQuery("whois.example.com", "test.com");

      mockSocket.emit("connect");
      mockSocket.emit("data", Buffer.from("response"));
      mockSocket.emit("end");

      await queryPromise;

      expect(mockSocket.write).toHaveBeenCalledWith("test.com\r\n");
    });

    it("should handle queries with special characters", async () => {
      const specialQuery = "xn--e1afmkfd.xn--p1ai"; // IDN domain

      const queryPromise = executeWhoisQuery("whois.example.com", specialQuery);

      mockSocket.emit("connect");
      mockSocket.emit("data", Buffer.from("response"));
      mockSocket.emit("end");

      await queryPromise;

      expect(mockSocket.write).toHaveBeenCalledWith(`${specialQuery}\r\n`);
    });
  });

  describe("socket lifecycle", () => {
    it("should destroy socket after successful query", async () => {
      const queryPromise = executeWhoisQuery("whois.example.com", "example.com");

      mockSocket.emit("connect");
      mockSocket.emit("data", Buffer.from("response"));
      mockSocket.emit("end");

      await queryPromise;

      expect(mockSocket.destroy).toHaveBeenCalledTimes(1);
    });

    it("should destroy socket on timeout", async () => {
      const queryPromise = executeWhoisQuery("whois.example.com", "example.com");

      mockSocket.emit("timeout");

      await expect(queryPromise).rejects.toThrow();
      expect(mockSocket.destroy).toHaveBeenCalledTimes(1);
    });

    it("should destroy socket on error", async () => {
      const queryPromise = executeWhoisQuery("whois.example.com", "example.com");

      mockSocket.emit("error", new Error("test error"));

      await expect(queryPromise).rejects.toThrow();
      expect(mockSocket.destroy).toHaveBeenCalledTimes(1);
    });
  });

  describe("empty responses", () => {
    it("should handle empty response", async () => {
      const queryPromise = executeWhoisQuery("whois.example.com", "example.com");

      mockSocket.emit("connect");
      mockSocket.emit("end");

      const result = await queryPromise;

      expect(result).toBe("");
    });

    it("should handle response with only whitespace", async () => {
      const queryPromise = executeWhoisQuery("whois.example.com", "example.com");

      mockSocket.emit("connect");
      mockSocket.emit("data", Buffer.from("   \n\n\t  "));
      mockSocket.emit("end");

      const result = await queryPromise;

      expect(result).toBe("   \n\n\t  ");
    });
  });
});
