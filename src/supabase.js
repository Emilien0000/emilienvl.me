// src/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://netijudyxisipmcszjty.supabase.co';
const supabaseKey = 'sb_publishable_sIUI2NF0aNTbBVRVTk-B6g_EVKgp00j';

export const supabase = createClient(supabaseUrl, supabaseKey);