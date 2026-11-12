// Supabase project connection

const SUPABASE_URL = "https://feljupapzbdaxtkhvspa.supabase.co";


const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_sr8lr1zepJ1j0gRJdcr_fQ_3vl0ED1-";

// Create Supabase connection
const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

console.log("BUK Care Supabase connection initialized");