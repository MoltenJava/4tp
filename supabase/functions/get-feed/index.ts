import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Get Feed function starting...")

// --- Interfaces & Types ---
// Define the structure expected by the iOS App Feed
interface FeedItem {
    vote_position_id: string; // Assuming vote_positions has an ID, or use composite key?
    position: string; // Yea, Nay, etc.
    representative: {
        rep_id: string;
        full_name: string;
        party: string | null;
        photo_url: string | null;
        chamber: string | null;
        state: string | null;
        district: string | null;
    };
    roll_call: {
        roll_call_id: string;
        vote_timestamp: string;
        question: string | null;
        description: string | null;
        result: string | null;
    };
    bill: {
        bill_id: string | null;
        title: string | null;
        number: string | null; // e.g., H.R. 1234
    } | null; // Bill might be null if vote is not on a specific bill
}

// Helper to get user ID from Supabase client
async function getUserId(supabaseClient: SupabaseClient): Promise<string | null> {
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    if (error) {
        console.error("Error getting user:", error);
        return null;
    }
    return user?.id ?? null;
}

// --- Helper Function to Fetch Personalized Feed Data ---
async function fetchPersonalizedFeed(supabaseClient: SupabaseClient, userId: string, page: number, limit: number) {
    console.log(`Fetching feed for user ${userId}, page: ${page}, limit: ${limit}`);

    // 1. Get followed representative IDs
    const { data: followedRepsData, error: followedRepsError } = await supabaseClient
        .from('followed_representatives')
        .select<{ rep_id: string }>('rep_id')
        .eq('user_id', userId);

    if (followedRepsError) {
        console.error("Error fetching followed representatives:", followedRepsError);
        throw new Error("Could not retrieve followed representatives.");
    }
    if (!followedRepsData || followedRepsData.length === 0) {
        console.log(`User ${userId} follows no representatives.`);
        return []; // Return empty feed if user follows no one
    }

    const followedRepIds = followedRepsData.map((r: { rep_id: string }) => r.rep_id);
    console.log(`User follows ${followedRepIds.length} representatives.`);

    // 2. Calculate pagination range
    const offset = (page - 1) * limit;
    const rangeEnd = offset + limit - 1;

    // 3. Query vote positions and related data
    // Select specific columns to optimize payload size
    const query = `
        *, 
        representatives(rep_id, full_name, party, photo_url, chamber, state_code, district),
        roll_calls(*, bills(bill_id, title, bill_number, bill_type, congress))
    `;

    const { data: feedData, error: feedError } = await supabaseClient
        .from('vote_positions')
        .select(query)
        .in('rep_id', followedRepIds) // Filter by followed representatives
        .order('roll_calls(vote_timestamp)', { ascending: false, referencedTable: 'roll_calls' })
        .range(offset, rangeEnd); // Apply pagination

    if (feedError) {
        console.error("Error fetching personalized feed data:", feedError);
        throw new Error("Could not retrieve personalized feed.");
    }

    console.log(`Fetched ${feedData?.length ?? 0} feed items.`);
    return feedData ?? [];
}

// --- Data Formatting Function ---
function formatFeedData(rawData: any[]): FeedItem[] {
    if (!rawData) return [];

    return rawData.map(item => {
        // Construct the bill number string
        const billNumberString = item.roll_calls?.bills
            ? `${item.roll_calls.bills.bill_type?.toUpperCase()}. ${item.roll_calls.bills.bill_number}`
            : null;

        // Construct the feed item
        const feedItem: FeedItem = {
            // Assuming vote_positions has a primary key id, otherwise construct one
            vote_position_id: item.id, // Adjust if PK is different or composite
            position: item.position,
            representative: {
                rep_id: item.representatives?.rep_id,
                full_name: item.representatives?.full_name,
                party: item.representatives?.party,
                photo_url: item.representatives?.photo_url,
                chamber: item.representatives?.chamber,
                state: item.representatives?.state_code, // Assuming state_code was added
                district: item.representatives?.district,
            },
            roll_call: {
                roll_call_id: item.roll_calls?.id,
                vote_timestamp: item.roll_calls?.vote_timestamp,
                question: item.roll_calls?.question_text,
                description: item.roll_calls?.description,
                result: item.roll_calls?.result,
            },
            bill: item.roll_calls?.bills ? {
                bill_id: item.roll_calls.bills.bill_id,
                title: item.roll_calls.bills.title,
                number: billNumberString,
            } : null,
        };
        return feedItem;
    });
}

async function handler(req: Request): Promise<Response> {
    console.log("Handling request for Get Feed...");

    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Create Supabase client with user's auth context
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
        if (!supabaseUrl || !supabaseAnonKey) {
             throw new Error("Missing Supabase URL or Anon Key environment variables.");
        }

        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: req.headers.get('Authorization')! } },
            // Instructs the client to be specific about the schema where RLS is enforced
            // db: { schema: 'public' }
        });

        // Get the user ID from the request context
        const userId = await getUserId(supabaseClient);
        if (!userId) {
            return new Response(JSON.stringify({ error: 'User not authenticated' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401, // Unauthorized
            });
        }

        console.log(`Authenticated user: ${userId}`);

        // --- Get Pagination Params from Request URL ---
        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const limit = parseInt(url.searchParams.get('limit') || '20', 10);
        // Add validation for page/limit if needed (e.g., min/max values)

        // --- Subtask 15.2: Fetch Raw Data ---
        const rawFeedData = await fetchPersonalizedFeed(supabaseClient, userId, page, limit);

        // --- Subtask 15.3: Format Response Data ---
        const formattedFeed = formatFeedData(rawFeedData);
        const responseData = { feed: formattedFeed };

        return new Response(JSON.stringify(responseData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error("Error in Get Feed handler:", error);
        const errorMsg = (error instanceof Error) ? error.message : "An unknown error occurred";
        return new Response(JSON.stringify({ error: errorMsg }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
}

// Start the Deno server
serve(handler)

/*
To deploy: supabase functions deploy get-feed --no-verify-jwt

To invoke locally (example GET): supabase functions serve
Then call (replace ANON_KEY and JWT): curl -i --location --request GET 'http://localhost:54321/functions/v1/get-feed' \
  --header 'Authorization: Bearer USER_JWT_TOKEN' \
  --header 'apikey: YOUR_SUPABASE_ANON_KEY'

*/ 