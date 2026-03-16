// @ts-nocheck — This API route uses dynamic imports (execa) and a route path
// that won't be in the generated route tree until first dev server run.
import { createFileRoute } from "@tanstack/react-router";
import { APP_REGISTRY, getContainerName } from "@mithrandir/cli/lib/apps";
import { dockerNeedsSudo } from "@mithrandir/cli/lib/shell";

export const Route = createFileRoute("/api/homelab/logs/$appName")({
  server: {
    handlers: {
      GET: async ({ params }: { params: { appName: string } }) => {
        const { appName } = params;

        const app = APP_REGISTRY.find((a) => a.name === appName);
        if (!app) {
          return new Response("App not found", { status: 404 });
        }

        const containerName = getContainerName(app);
        const useSudo = await dockerNeedsSudo();
        const cmd = useSudo ? "sudo" : "docker";
        const args = useSudo
          ? ["docker", "logs", "--follow", "--tail", "100", "--timestamps", containerName]
          : ["logs", "--follow", "--tail", "100", "--timestamps", containerName];

        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            try {
              const { execa } = await import("execa");
              const proc = execa(cmd, args, {
                stdout: "pipe",
                stderr: "pipe",
                reject: false,
              });

              const sendLine = (line: string) => {
                controller.enqueue(encoder.encode(`data: ${line}\n\n`));
              };

              for (const outputStream of [proc.stdout, proc.stderr]) {
                if (!outputStream) continue;
                let buffer = "";
                outputStream.on("data", (chunk: Buffer) => {
                  buffer += chunk.toString();
                  const lines = buffer.split("\n");
                  buffer = lines.pop() ?? "";
                  for (const line of lines) {
                    if (line.trim()) sendLine(line);
                  }
                });
              }

              proc.on("exit", () => {
                controller.close();
              });
            } catch {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
