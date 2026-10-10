import { supabase } from './supabase.js';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export async function connectDb() {
  const { error } = await supabase.from('profiles').select('id').limit(1);
  if (error) throw new Error(`Não foi possível ligar ao Supabase: ${error.message}`);
  logger.info('Supabase ligado.');
}
