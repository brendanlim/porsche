import { createClient } from '@supabase/supabase-js';
import { normalizeOptions } from './options-normalizer';

/**
 * Processes options for a listing - normalizes text and creates relational entries
 * This is the DRY central function for all options processing
 */
export async function processListingOptions(
  listingId: string,
  optionsText: string | null | undefined
): Promise<void> {
  if (!optionsText) return;

  // Create Supabase client inside the function to ensure env vars are loaded
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Normalize the options text using Gemini
    const normalizedOptions = await normalizeOptions(optionsText);
    
    if (normalizedOptions.length === 0) return;

    // 2. Get all existing options from the database
    const { data: existingOptions } = await supabase
      .from('options')
      .select('id, name');

    if (!existingOptions) return;

    // 3. Create a map for quick lookup (normalize spaces and hyphens)
    const normalizeForMatching = (str: string) => 
      str.toLowerCase()
        .replace(/[-–—]/g, ' ')  // Replace all types of dashes with spaces
        .replace(/\s+/g, ' ')    // Normalize multiple spaces to single space
        .trim();
    
    const optionsMap = new Map(
      existingOptions.map(opt => [normalizeForMatching(opt.name), opt.id])
    );

    // 4. Find matching options and prepare batch insert
    const listingOptionsToInsert: Array<{ listing_id: string; option_id: string }> = [];
    const unmatchedOptions: string[] = [];

    for (const optionName of normalizedOptions) {
      const normalizedKey = normalizeForMatching(optionName);
      const optionId = optionsMap.get(normalizedKey);
      
      if (optionId) {
        listingOptionsToInsert.push({
          listing_id: listingId,
          option_id: optionId
        });
      } else {
        unmatchedOptions.push(optionName);
      }
    }

    // 5. Delete existing options for this listing (to handle updates)
    await supabase
      .from('listing_options')
      .delete()
      .eq('listing_id', listingId);

    // 6. Insert new options relationships
    if (listingOptionsToInsert.length > 0) {
      const { error } = await supabase
        .from('listing_options')
        .insert(listingOptionsToInsert);

      if (error) {
        console.error(`Error inserting options for listing ${listingId}:`, error);
      } else {
        console.log(`✅ Saved ${listingOptionsToInsert.length} options for listing ${listingId}`);
      }
    }

    // 7. Log unmatched options for potential addition to options table
    if (unmatchedOptions.length > 0) {
      console.log(`⚠️ Unmatched options for listing ${listingId}:`, unmatchedOptions);
    }

  } catch (error) {
    console.error(`Failed to process options for listing ${listingId}:`, error);
  }
}

/**
 * Process options for multiple listings in batch
 */
export async function processMultipleListingOptions(
  listings: Array<{ id: string; options_text: string | null }>
): Promise<void> {
  console.log(`Processing options for ${listings.length} listings...`);
  
  let processed = 0;
  let failed = 0;

  for (const listing of listings) {
    if (listing.options_text) {
      try {
        await processListingOptions(listing.id, listing.options_text);
        processed++;
        
        // Add delay to avoid overwhelming Gemini API
        if (processed % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Failed to process listing ${listing.id}:`, error);
        failed++;
      }
    }
  }

  console.log(`✅ Processed options for ${processed} listings, ${failed} failed`);
}