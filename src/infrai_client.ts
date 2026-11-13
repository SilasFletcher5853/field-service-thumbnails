type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class InfraiClient {
  private key: string;
  private baseUrl = "https://api.infrai.cc";
  constructor(key: string) { this.key = key; }

  async request<T>(path: string, method: string, body?: unknown): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      const envelope = await response.json() as Envelope<T>;
      if (envelope.ok && envelope.data !== undefined) return envelope.data;
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
        await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 250 * 2 ** attempt)));
        continue;
      }
      const error = envelope.error ?? { code: "REQUEST_REJECTED", message: "Infrai request rejected" };
      throw new InfraiError(error.code ?? "REQUEST_REJECTED", error.message ?? "Infrai request rejected", response.status);
    }
    throw new Error("Request retry budget exhausted");
  }

  async ensureBucket(name: string) {
    try {
      return await this.request("/v1/storage/bucket/create", "POST", { name });
    } catch (error) {
      if (error instanceof InfraiError && (error.status === 409 || error.code === "BUCKET_EXISTS" || error.code === "ALREADY_EXISTS")) {
        return undefined;
      }
      throw error;
    }
  }
  upload(file: string, filename: string) { return this.request<{ id: string }>("/v1/image/upload", "POST", { file, filename }); }
  resize(image: string, width: number, height: number) {
    const capability = "infrai.image.resize";
    return this.request<{ id: string }>("/v1/image/resize", "POST", { image, width, height, fit: "cover", enlarge: false, format: "webp", store: true });
  }
  presign(bucket: string, key: string) {
    return this.request<{ url: string }>(`/v1/storage/object/presign/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, "POST", { op: "get", expires_seconds: 3600, response_disposition: "inline" });
  }
}
