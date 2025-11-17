// supabase/functions/delete-account/index.ts
import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!jwt) return new Response('Unauthorized', { status: 401 });

  // Verifiera vem som ringer
  const client = createClient(supabaseUrl, jwt, { auth: { persistSession: false } });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return new Response('Unauthorized', { status: 401 });

  // 1) Rensa användarens data (kallar RPC ovan)
  await client.rpc('api_delete_my_data');

  // 2) Radera auth-user
  const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
  if (delErr) return new Response(delErr.message, { status: 500 });

  return new Response('ok', { status: 200 });
});