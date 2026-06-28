export type ApiError = {
  error: string;
};

export function jsonResponse<T>(body: T, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store"
    }
  });
}

export function errorResponse(error: string, status: number): Response {
  return jsonResponse<ApiError>({ error }, status);
}
