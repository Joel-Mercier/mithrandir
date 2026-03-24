import { APP_REGISTRY, getContainerName } from "@mithrandir/cli/lib/apps";
import { dockerNeedsSudo } from "@mithrandir/cli/lib/shell";
import { createFileRoute } from "@tanstack/react-router";

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
				const cmdArray = useSudo
					? [
							"sudo",
							"docker",
							"logs",
							"--follow",
							"--tail",
							"100",
							"--timestamps",
							containerName,
						]
					: [
							"docker",
							"logs",
							"--follow",
							"--tail",
							"100",
							"--timestamps",
							containerName,
						];

				const stream = new ReadableStream({
					async start(controller) {
						const encoder = new TextEncoder();
						const decoder = new TextDecoder();
						try {
							const proc = Bun.spawn(cmdArray, {
								stdout: "pipe",
								stderr: "pipe",
							});

							const sendLine = (line: string) => {
								controller.enqueue(encoder.encode(`data: ${line}\n\n`));
							};

							const processStream = async (
								readable: ReadableStream<Uint8Array>,
							) => {
								const reader = readable.getReader();
								let buffer = "";
								while (true) {
									const { done, value } = await reader.read();
									if (done) break;
									buffer += decoder.decode(value, { stream: true });
									const lines = buffer.split("\n");
									buffer = lines.pop() ?? "";
									for (const line of lines) {
										if (line.trim()) sendLine(line);
									}
								}
								// Flush remaining buffer
								if (buffer.trim()) sendLine(buffer);
							};

							await Promise.all([
								processStream(proc.stdout as ReadableStream<Uint8Array>),
								processStream(proc.stderr as ReadableStream<Uint8Array>),
							]);

							controller.close();
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
