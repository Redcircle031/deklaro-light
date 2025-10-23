import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createRouteHandlerSupabaseClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  const supabase = createRouteHandlerSupabaseClient(request, response);

  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return response;
}
