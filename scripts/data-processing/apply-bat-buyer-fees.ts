import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from '../lib/supabase/admin';

/**
 * Calculate BaT buyer fee: 5% of price, capped at $7,500
 */
function calculateBaTFee(price: number): number {
  const feePercent = 0.05;
  const maxFee = 7500;
  const calculatedFee = price * feePercent;
  return Math.min(calculatedFee, maxFee);
}

async function applyBaTBuyerFees() {
  console.log('Starting BaT buyer fee application...');
  console.log('Fee structure: 5% of sale price, capped at $7,500');
  console.log('----------------------------------------');
  
  // First, get all BaT listings that haven't had fees applied
  const { data: listings, error: fetchError } = await supabaseAdmin
    .from('listings')
    .select('id, source, price, sold_price, buyer_fee_applied')
    .or('source.eq.bring-a-trailer,source.eq.bat')
    .or('buyer_fee_applied.is.null,buyer_fee_applied.eq.false'); // Get listings where fee hasn't been applied yet
  
  if (fetchError) {
    console.error('Error fetching listings:', fetchError);
    return;
  }
  
  if (!listings || listings.length === 0) {
    console.log('No BaT listings found that need fee updates');
    return;
  }
  
  console.log(`Found ${listings.length} BaT listings to update`);
  
  let totalUpdated = 0;
  let totalFailed = 0;
  let totalFeesAdded = 0;
  
  // Process in batches of 50
  const batchSize = 50;
  for (let i = 0; i < listings.length; i += batchSize) {
    const batch = listings.slice(i, Math.min(i + batchSize, listings.length));
    
    const updates = batch.map(listing => {
      // Use sold_price if available, otherwise use price
      const originalPrice = listing.sold_price || listing.price;
      
      if (!originalPrice || originalPrice <= 0) {
        console.log(`Skipping listing ${listing.id} - no valid price`);
        return null;
      }
      
      const buyerFee = calculateBaTFee(originalPrice);
      const finalPrice = originalPrice + buyerFee;
      
      totalFeesAdded += buyerFee;
      
      return {
        id: listing.id,
        price: listing.price ? Math.round(listing.price + calculateBaTFee(listing.price)) : listing.price,
        sold_price: listing.sold_price ? Math.round(finalPrice) : null,
        buyer_fee_amount: Math.round(buyerFee),
        buyer_fee_applied: true,
        price_before_fee: Math.round(originalPrice)
      };
    }).filter(update => update !== null);
    
    // Apply updates to database
    for (const update of updates) {
      const { error: updateError } = await supabaseAdmin
        .from('listings')
        .update({
          price: update.price,
          sold_price: update.sold_price,
          buyer_fee_amount: update.buyer_fee_amount,
          buyer_fee_applied: update.buyer_fee_applied,
          price_before_fee: update.price_before_fee
        })
        .eq('id', update.id);
      
      if (updateError) {
        console.error(`Error updating listing ${update.id}:`, updateError);
        totalFailed++;
      } else {
        totalUpdated++;
        if (totalUpdated % 10 === 0) {
          console.log(`Progress: ${totalUpdated}/${listings.length} listings updated`);
        }
      }
    }
  }
  
  console.log('\n========================================');
  console.log('BaT Buyer Fee Application Complete');
  console.log('========================================');
  console.log(`Total listings processed: ${listings.length}`);
  console.log(`Successfully updated: ${totalUpdated}`);
  console.log(`Failed updates: ${totalFailed}`);
  console.log(`Total fees added: $${totalFeesAdded.toLocaleString()}`);
  console.log(`Average fee per listing: $${(totalFeesAdded / totalUpdated).toFixed(2)}`);
  
  // Show some examples
  const { data: examples, error: exampleError } = await supabaseAdmin
    .from('listings')
    .select('model, trim, year, price_before_fee, buyer_fee_amount, price')
    .eq('source', 'bring-a-trailer')
    .eq('buyer_fee_applied', true)
    .limit(5);
  
  if (examples && examples.length > 0) {
    console.log('\nExample updated listings:');
    examples.forEach(ex => {
      console.log(`  ${ex.year} ${ex.model} ${ex.trim}:`);
      console.log(`    Original: $${ex.price_before_fee?.toLocaleString()}`);
      console.log(`    Fee: $${ex.buyer_fee_amount?.toLocaleString()}`);
      console.log(`    Final: $${ex.price?.toLocaleString()}`);
    });
  }
}

// Run the script
applyBaTBuyerFees().catch(console.error);