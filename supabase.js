import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ewpdvixqmeqmsvkuctat.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
