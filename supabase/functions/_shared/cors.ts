export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function handleCors() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}