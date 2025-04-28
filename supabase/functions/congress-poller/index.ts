import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts' // Assuming shared CORS config

// Define an interface for the structure of bill data from the API (optional but good practice)
interface ApiBill {
  congress: number;
  type: string;
  number: number;
  title: string;
  latestAction?: { text?: string; actionDate?: string };
  updateDate?: string; // Used to track freshness
  originChamber?: string;
  policyArea?: { name?: string };
  url?: string; // Link to congress.gov page for the bill
  // Add other fields as needed from the actual API response
}

// --- Define interface for Vote data from API ---
interface ApiVote {
  congress: number;
  session: number;
  chamber: string; // 'House', 'Senate'
  rollNumber: number;
  voteType?: string; // e.g., 'YEA-AND-NAY'
  question?: string;
  description?: string;
  result?: string;
  date?: string; // Vote timestamp
  bill?: { // Link to bill if available
    congress?: number;
    type?: string;
    number?: number;
  };
  // Add other fields as needed from the actual API response
}

// Define expected type for bill rows used in mapping
type BillIdentifier = { id: string; congress: number; bill_type: string; bill_number: number };

// Define type for the return value of upsertRollCalls
type UpsertResult = { data: any[]; inserted: number; updated: number; errors: number };

// Interface for individual voter position from API
interface ApiVoterPosition {
    member: { bioguideId?: string; name?: string }; // Assuming bioguideId is the key identifier
    votePosition: string; // e.g., 'Yea', 'No', 'Not Voting'
    // Add other potentially useful fields
}

// Interface for the response of the voters list API
interface ApiVoterListResponse {
    vote: { // Contains details about the roll call
        congress: number;
        session: number;
        chamber: string;
        rollNumber: number;
    };
    memberVotes: ApiVoterPosition[]; // Array of positions
}

// Define expected type for representative rows used in mapping
type RepresentativeIdentifier = { rep_id: string; bioguide_id: string };

// --- Helper Function to Fetch Recent Bills ---
async function fetchRecentBills(apiKey: string | undefined, daysAgo: number = 1): Promise<ApiBill[]> {
  if (!apiKey) {
    // In production, consider more robust error handling or returning empty array
    console.error("Missing CONGRESS_GOV_API_KEY environment variable.");
    throw new Error("Missing CONGRESS_GOV_API_KEY environment variable.");
  }

  const baseUrl = "https://api.congress.gov/v3/bill";
  const limit = 100; // Fetch up to 100 bills per request
  const dateSince = new Date();
  dateSince.setDate(dateSince.getDate() - daysAgo);
  const formattedDate = dateSince.toISOString(); // Format: YYYY-MM-DDTHH:mm:ssZ

  const url = `${baseUrl}?limit=${limit}&sort=updateDate+desc&api_key=${apiKey}&fromDateTime=${formattedDate}`;
  console.log(`Fetching bills from: ${baseUrl} updated since ${formattedDate}`);

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`API Error Response Body: ${errorBody}`);
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.bills)) {
      console.warn("API response format unexpected or missing 'bills' array:", data);
      return [];
    }

    console.log(`Successfully fetched ${data.bills.length} bills.`);
    return data.bills as ApiBill[];

  } catch (error) {
    console.error("Error fetching or parsing bills from API:", error);
    // Don't re-throw here if we want the function to potentially continue partially
    // Or re-throw if failure is critical
    throw error;
  }
}

// --- Helper Function to Upsert Bills into Supabase ---
async function upsertBills(supabaseClient: SupabaseClient, bills: ApiBill[]) {
    if (!bills || bills.length === 0) {
        console.log("No bills to upsert.");
        return { inserted: 0, updated: 0, errors: 0 };
    }

    // Map API data to database schema
    const billsToUpsert = bills.map(bill => ({
        congress: bill.congress,
        bill_type: bill.type?.toLowerCase(), // Ensure consistent casing
        bill_number: bill.number,
        title: bill.title,
        latest_action_text: bill.latestAction?.text,
        // Safely parse dates, handle potential invalid formats
        latest_action_date: bill.latestAction?.actionDate ? new Date(bill.latestAction.actionDate).toISOString() : null,
        policy_area: bill.policyArea?.name,
        congress_gov_url: bill.url, // Assuming bill.url is the congress.gov link
        // Add mapping for 'status' if available directly from API or derive it
        // status: mapApiStatusToDbStatus(bill.someStatusField),
        // official_id: constructOfficialId(bill), // If needed
        last_fetched_at: new Date().toISOString(), // Mark when we fetched it
    }));

    console.log(`Attempting to upsert ${billsToUpsert.length} bills...`);

    try {
        const { data, error, count } = await supabaseClient
            .from('bills')
            .upsert(billsToUpsert, {
                onConflict: 'congress, bill_type, bill_number', // Specify conflict columns based on unique constraint
                // ignoreDuplicates: false // Default is false, ensures updates happen
            })
            .select(); // Optionally select to confirm results or get counts

        if (error) {
            console.error("Supabase upsert error:", error);
            // Depending on the error, you might retry or handle specific conflicts
            throw error; // Re-throw to indicate failure
        }

        // Supabase upsert response doesn't easily distinguish inserted vs updated count
        // The `count` variable might represent affected rows, but check documentation
        console.log(`Supabase upsert successful. Affected rows (approx): ${count ?? data?.length}`);
        return { inserted: data?.length ?? 0, updated: 0, errors: 0 }; // Simplified return

    } catch (error) {
        console.error("Error during Supabase bills upsert:", error);
        throw error; // Re-throw the error
    }
}

// --- Helper Function to Fetch Recent Votes ---
async function fetchRecentVotes(apiKey: string | undefined, daysAgo: number = 1): Promise<ApiVote[]> {
  if (!apiKey) {
    console.error("Missing CONGRESS_GOV_API_KEY environment variable for votes.");
    throw new Error("Missing CONGRESS_GOV_API_KEY environment variable.");
  }

  const baseUrl = "https://api.congress.gov/v3/vote";
  const limit = 100; // Adjust limit as needed
  const dateSince = new Date();
  dateSince.setDate(dateSince.getDate() - daysAgo);
  const formattedDate = dateSince.toISOString();

  // Fetch votes updated since 'formattedDate', sort by date descending
  const url = `${baseUrl}?limit=${limit}&sort=date+desc&api_key=${apiKey}&fromDateTime=${formattedDate}`;
  console.log(`Fetching votes from: ${baseUrl} updated since ${formattedDate}`);

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Vote API Error Response Body: ${errorBody}`);
      throw new Error(`Vote API request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.votes)) {
      console.warn("Vote API response format unexpected or missing 'votes' array:", data);
      return [];
    }

    console.log(`Successfully fetched ${data.votes.length} votes.`);
    return data.votes as ApiVote[];

  } catch (error) {
    console.error("Error fetching or parsing votes from API:", error);
    throw error;
  }
}

// --- Helper Function to Upsert Roll Calls into Supabase ---
// Return type adjusted to reflect the data structure needed later
type RollCallDbData = { id: string; congress: number; session_number: number; chamber: string; roll_call_number: number };
type RollCallUpsertResult = { data: RollCallDbData[]; inserted: number; updated: number; errors: number };

async function upsertRollCalls(supabaseClient: SupabaseClient, votes: ApiVote[], billsMap: Map<string, string>): Promise<RollCallUpsertResult> {
    if (!votes || votes.length === 0) {
        return { data: [], inserted: 0, updated: 0, errors: 0 };
    }
    const rollCallsToUpsert = votes.map(vote => {
        const billKey = vote.bill ? `${vote.bill.congress}-${vote.bill.type?.toLowerCase()}-${vote.bill.number}` : null;
        const billDbId = billKey ? billsMap.get(billKey) : null;
        return {
            congress: vote.congress,
            session_number: vote.session,
            chamber: vote.chamber,
            roll_call_number: vote.rollNumber,
            vote_timestamp: vote.date ? new Date(vote.date).toISOString() : new Date().toISOString(),
            question_text: vote.question,
            description: vote.description,
            result: vote.result,
            bill_id: billDbId,
        };
    }).filter(rc => rc.chamber === 'House' || rc.chamber === 'Senate');
    if (rollCallsToUpsert.length === 0) {
        return { data: [], inserted: 0, updated: 0, errors: 0 };
    }
    console.log(`Attempting to upsert ${rollCallsToUpsert.length} roll calls...`);
    try {
        const { data, error, count } = await supabaseClient
            .from('roll_calls')
            .upsert(rollCallsToUpsert, { onConflict: 'congress, session_number, chamber, roll_call_number' })
            .select<string, RollCallDbData>('id, congress, session_number, chamber, roll_call_number');
        if (error) throw error;
        console.log(`Supabase roll_calls upsert successful. Affected rows (approx): ${count ?? data?.length}`);
        return { data: data ?? [], inserted: data?.length ?? 0, updated: 0, errors: 0 };
    } catch (error) {
        console.error("Error during Supabase roll_calls upsert:", error);
        throw error;
    }
}

// --- Helper Function to Fetch Vote Positions for a single Roll Call ---
async function fetchVotePositions(apiKey: string, rollCall: RollCallDbData): Promise<ApiVoterPosition[]> {
    const { congress, session_number, chamber, roll_call_number } = rollCall;
    // Construct the specific API endpoint URL
    const url = `https://api.congress.gov/v3/vote/${congress}/${chamber}/${session_number}/${roll_call_number}/voters?api_key=${apiKey}`;
    console.log(`Fetching positions for Roll Call: ${congress}-${chamber}-${session_number}-${roll_call_number}`);

    try {
        const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!response.ok) {
            // Don't throw immediately, log and return empty - one failure shouldn't stop all
            console.error(`API request failed for vote positions (${rollCall.id}): Status ${response.status}`);
            return [];
        }
        const data: ApiVoterListResponse = await response.json();
        if (!data || !Array.isArray(data.memberVotes)) {
            console.warn(`Unexpected format for vote positions (${rollCall.id}):`, data);
            return [];
        }
        return data.memberVotes;
    } catch (error) {
        console.error(`Error fetching positions for Roll Call ${rollCall.id}:`, error);
        return []; // Return empty on error to allow process to continue
    }
}

// --- Helper function to map API position string to DB ENUM ---
// Expand this mapping based on actual API values vs. your ENUM definition
function mapApiPositionToDbEnum(apiPosition: string): string | null {
    const mapping: { [key: string]: string } = {
        'Yea': 'Yea',
        'Aye': 'Yea',
        'No': 'Nay',
        'Nay': 'Nay',
        'Not Voting': 'Not Voting',
        'Present': 'Present'
        // Add mappings for 'Abstain' etc. if needed
    };
    const mapped = mapping[apiPosition];
    if (!mapped) {
        console.warn(`Unmapped vote position found: ${apiPosition}`);
    }
    return mapped ?? null; // Return null if not found
}

// --- Helper Function to Upsert Vote Positions into Supabase ---
type RepresentativeMap = Map<string, string>; // Map bioguideId -> rep_id (uuid)

async function upsertVotePositions(supabaseClient: SupabaseClient, rollCallId: string, positions: ApiVoterPosition[], repMap: RepresentativeMap) {
    if (!positions || positions.length === 0) {
        console.log(`No positions to upsert for Roll Call ${rollCallId}.`);
        return { processed: 0, errors: 0 };
    }

    const positionsToUpsert = positions
        .map(pos => {
            const bioguideId = pos.member?.bioguideId;
            const repId = bioguideId ? repMap.get(bioguideId) : null;
            const dbPosition = mapApiPositionToDbEnum(pos.votePosition);

            if (!repId) {
                // console.warn(`Could not find rep_id for Bioguide ID: ${bioguideId}`);
                return null; // Skip if we can't link the representative
            }
            if (!dbPosition) {
                 console.warn(`Could not map position '${pos.votePosition}' for ${bioguideId} on roll call ${rollCallId}`);
                 return null; // Skip if position mapping fails
            }

            return {
                roll_call_id: rollCallId,
                rep_id: repId,
                position: dbPosition // Use the mapped ENUM value
            };
        })
        .filter(p => p !== null); // Remove null entries

    if (positionsToUpsert.length === 0) {
        console.log(`No valid positions to upsert for Roll Call ${rollCallId} after filtering.`);
        return { processed: 0, errors: 0 };
    }

    console.log(`Attempting to upsert ${positionsToUpsert.length} vote positions for Roll Call ${rollCallId}...`);

    try {
        const { error, count } = await supabaseClient
            .from('vote_positions')
            .upsert(positionsToUpsert, { onConflict: 'roll_call_id, rep_id' });

        if (error) {
            console.error(`Supabase vote_positions upsert error for Roll Call ${rollCallId}:`, error);
            // Don't re-throw, just count the error
            return { processed: positionsToUpsert.length, errors: 1 };
        }

        console.log(`Successfully upserted/updated ${count ?? positionsToUpsert.length} positions for Roll Call ${rollCallId}.`);
        return { processed: positionsToUpsert.length, errors: 0 };

    } catch (error) {
        console.error(`Error during Supabase vote_positions upsert for Roll Call ${rollCallId}:`, error);
        return { processed: positionsToUpsert.length, errors: 1 }; // Count as error
    }
}

// --- Helper function for introducing delay ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Main Handler Function ---
console.log("Congress Poller function starting...")

async function handler(req: Request): Promise<Response> {
    console.log("Handling request for Congress Poller...");
    let billsFetched = 0;
    let billsUpserted = 0;
    let votesFetched = 0;
    let rollCallsUpserted = 0;
    let positionsProcessed = 0;
    let positionErrors = 0;
    let errorMsg: string | null = null;
    let statusCode = 200;
    const CONCURRENCY_LIMIT = 5; // Process 5 roll calls concurrently
    const DELAY_MS = 200; // Optional delay between batches

    try {
        // --- Environment Variable Checks ---
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const apiKey = Deno.env.get('gov_api_key');
        if (!supabaseUrl || !serviceRoleKey || !apiKey) {
            throw new Error("Missing required environment variables.");
        }

        const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

        // --- Fetch and Upsert Bills (Task 13) ---
        console.log("--- Starting Bill Fetch --- ");
        const fetchedBills = await fetchRecentBills(apiKey, 1);
        billsFetched = fetchedBills.length;
        if (billsFetched > 0) {
            const billUpsertResult = await upsertBills(supabaseClient, fetchedBills);
            billsUpserted = billUpsertResult.inserted; // Using simplified result for now
        }

        // --- Fetch and Upsert Votes/Roll Calls (Subtask 14.1) ---
        console.log("--- Starting Vote Fetch --- ");
        const fetchedVotes = await fetchRecentVotes(apiKey, 1);
        votesFetched = fetchedVotes.length;
        let processedRollCalls: RollCallDbData[] = [];
        if (votesFetched > 0) {
            const { data: billsFromDb, error: billError } = await supabaseClient
                .from('bills')
                .select<string, BillIdentifier>('id, congress, bill_type, bill_number');
            if (billError) throw billError;
            const billsMap = new Map<string, string>(billsFromDb?.map((b: BillIdentifier) => [`${b.congress}-${b.bill_type}-${b.bill_number}`, b.id]) ?? []);
            const voteUpsertResult = await upsertRollCalls(supabaseClient, fetchedVotes, billsMap);
            rollCallsUpserted = voteUpsertResult.inserted;
            processedRollCalls = voteUpsertResult.data; // Get the roll calls including their DB IDs
        }

        // --- Fetch and Upsert Vote Positions (Subtask 14.2 & 14.3) ---
        if (processedRollCalls.length > 0) {
            console.log(`--- Starting Vote Position Fetch for ${processedRollCalls.length} roll calls (Concurrency: ${CONCURRENCY_LIMIT}) ---`);

            const { data: repsData, error: repError } = await supabaseClient
                .from('representatives')
                .select<string, RepresentativeIdentifier>('rep_id, bioguide_id')
                .not('bioguide_id', 'is', null);
            if (repError) throw repError;
            const repMap: RepresentativeMap = new Map(repsData?.map((r: RepresentativeIdentifier) => [r.bioguide_id, r.rep_id]) ?? []);
            console.log(`Created map for ${repMap.size} representatives.`);

            // Process roll calls in batches with concurrency limit
            for (let i = 0; i < processedRollCalls.length; i += CONCURRENCY_LIMIT) {
                const batch = processedRollCalls.slice(i, i + CONCURRENCY_LIMIT);
                console.log(`Processing batch of ${batch.length} roll calls (starting index ${i})...`);

                const promises = batch.map(async (rollCall) => {
                    try {
                        const positions = await fetchVotePositions(apiKey, rollCall);
                        if (positions.length > 0) {
                            const result = await upsertVotePositions(supabaseClient, rollCall.id, positions, repMap);
                            return { processed: result.processed, errors: result.errors };
                        } else {
                            return { processed: 0, errors: 0 };
                        }
                    } catch (batchError) {
                        console.error(`Error processing roll call ${rollCall.id} in batch:`, batchError);
                        return { processed: 0, errors: 1 }; // Count as an error for this roll call
                    }
                });

                // Wait for all promises in the batch to settle
                const results = await Promise.allSettled(promises);

                // Aggregate results from the batch
                results.forEach(result => {
                    if (result.status === 'fulfilled') {
                        positionsProcessed += result.value.processed;
                        positionErrors += result.value.errors;
                    } else {
                        // Handle rejected promises (should be caught within the map ideally, but safety net)
                        console.error("Unhandled promise rejection in batch:", result.reason);
                        positionErrors += 1; // Count the entire roll call as an error
                    }
                });

                // Optional delay before the next batch
                if (i + CONCURRENCY_LIMIT < processedRollCalls.length) {
                    await delay(DELAY_MS);
                }
            }
            console.log(`--- Finished Vote Position Fetching. Total Processed: ${positionsProcessed}, Total Errors: ${positionErrors} ---`);
        }

    } catch (error) {
        console.error("Error in Congress Poller handler:", error);
        if (error instanceof Error) {
             errorMsg = error.message;
        } else {
             errorMsg = "An unknown error occurred";
        }
        statusCode = 500;
    }

    // Construct detailed response
    const responseData = {
        message: errorMsg
            ? `Congress Poller failed: ${errorMsg}`
            : `Congress Poller executed successfully. Summary: Bills Fetched: ${billsFetched}, Bills Upserted: ${billsUpserted}. Votes Fetched: ${votesFetched}, Roll Calls Upserted: ${rollCallsUpserted}. Positions Processed: ${positionsProcessed} (Errors: ${positionErrors}).`,
        billsFetched: billsFetched,
        billsUpserted: billsUpserted,
        votesFetched: votesFetched,
        rollCallsUpserted: rollCallsUpserted,
        positionsProcessed: positionsProcessed,
        positionErrors: positionErrors,
    }

    return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
    });
}

// Start the Deno server
serve(handler)

/*
To deploy: supabase functions deploy congress-poller --no-verify-jwt

To invoke locally (optional): supabase functions serve
Then call: curl -i --location --request POST 'http://localhost:54321/functions/v1/congress-poller' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{}'

To schedule (using Supabase dashboard or pg_cron):
SELECT cron.schedule(
  'congress-poller-schedule', -- Unique name for the schedule
  '0 * * * *', -- Cron syntax: e.g., 'Run every hour at minute 0'
  $$
  SELECT net.http_post(
      url:='YOUR_FUNCTION_URL', -- Find in Supabase dashboard -> Edge Functions -> congress-poller
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{}'::jsonb
  )
  $$
);
*/ 