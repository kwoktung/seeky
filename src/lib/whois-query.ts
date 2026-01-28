import { Socket } from "net";

const WHOIS_PORT = 43;
const TIMEOUT = 10000; // 10 seconds

/**
 * Execute a WHOIS query against a WHOIS server
 *
 * @param server - The WHOIS server hostname
 * @param query - The domain or query string
 * @param timeout - Optional timeout in milliseconds (default: 10000)
 * @returns Promise that resolves with the raw WHOIS response
 */
export async function executeWhoisQuery(
  server: string,
  query: string,
  timeout: number = TIMEOUT,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    let data = "";

    socket.setTimeout(timeout);

    socket.on("connect", () => {
      socket.write(`${query}\r\n`);
    });

    socket.on("data", (chunk) => {
      data += chunk.toString();
    });

    socket.on("end", () => {
      socket.destroy();
      resolve(data);
    });

    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("WHOIS query timeout"));
    });

    socket.on("error", (err) => {
      socket.destroy();
      reject(err);
    });

    socket.connect(WHOIS_PORT, server);
  });
}
