import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SYSTEM_PROMPT_MEAL, SYSTEM_PROMPT_SETS } from "@/lib/parse/prompts";
import { stripJsonFences, validateParseResult } from "@/lib/parse/validateParseResult";

const DEFAULT_MODEL = "deepseek/deepseek-chat";
const MAX_TEXT_LENGTH = 1000;
const TIMEOUT_MS = 15000;

interface ParseBody {
  kind: "sets" | "meal";
  text: string;
}

function isValidBody(value: unknown): value is ParseBody {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  return (
    (body.kind === "sets" || body.kind === "meal") &&
    typeof body.text === "string" &&
    body.text.trim().length > 0 &&
    body.text.length <= MAX_TEXT_LENGTH
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!isValidBody(body)) {
    return NextResponse.json(
      { error: "body must be { kind: 'sets' | 'meal', text: string } with text non-empty and ≤ 1000 chars" },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "parse no configurado" }, { status: 500 });
  }

  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  const systemPrompt = body.kind === "sets" ? SYSTEM_PROMPT_SETS : SYSTEM_PROMPT_MEAL;

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: body.text },
        ],
        temperature: 0,
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return NextResponse.json({ error: "parse timeout" }, { status: 504 });
    }
    return NextResponse.json({ error: "no se pudo contactar al servicio de parse" }, { status: 502 });
  }

  if (!upstreamRes.ok) {
    return NextResponse.json({ error: "el servicio de parse devolvió un error" }, { status: 502 });
  }

  const upstreamJson = await upstreamRes.json();
  const content: unknown = upstreamJson.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    return NextResponse.json({ error: "respuesta de parse malformada" }, { status: 422 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(content));
  } catch {
    return NextResponse.json({ error: "respuesta de parse no es JSON válido" }, { status: 422 });
  }

  const result =
    body.kind === "sets" ? validateParseResult("sets", parsed) : validateParseResult("meal", parsed);

  if (result === null) {
    return NextResponse.json({ error: "respuesta de parse con estructura inesperada" }, { status: 422 });
  }

  return NextResponse.json(result, { status: 200 });
}
