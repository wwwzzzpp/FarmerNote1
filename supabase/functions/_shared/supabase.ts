import { createClient } from 'npm:@supabase/supabase-js@2';

import { getEnv } from './env.ts';

export function createServiceClient() {
  return createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
