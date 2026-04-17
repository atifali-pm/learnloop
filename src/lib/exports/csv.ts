import Papa from "papaparse";

export function toCsv<T extends Record<string, unknown>>(rows: T[]): string {
  return Papa.unparse(rows, { header: true });
}

export function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
