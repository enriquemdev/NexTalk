export async function boundedJson(request: Request, maximum = 2048): Promise<unknown> {
  if (Number(request.headers.get("content-length") || 0) > maximum) throw new Error("BODY_TOO_LARGE");
  if (!request.body) throw new Error("INVALID_BODY");
  const reader = request.body.getReader(); const decoder = new TextDecoder(); let size = 0, text = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) { await reader.cancel(); throw new Error("BODY_TOO_LARGE"); }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally { reader.releaseLock(); }
}
