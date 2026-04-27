// src/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'netijudyxisipmcszjty/sql/c84fe803-3d34-4a16-81b6-810eb5769804.supabase.co';
const supabaseKey = 'sb_publishable_sIUI2NF0aNTbBVRVTk-B6g_EVKgp00j';

export const supabase = createClient(supabaseUrl, supabaseKey);