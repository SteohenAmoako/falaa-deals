'use server';
/**
 * @fileOverview This file implements a Genkit flow for forecasting data usage.
 * It analyzes a user's data bundle purchase history and current data balance
 * to predict when their current bundle will run out and suggest a top-up date.
 *
 * - forecastDataUsage - A function that handles the data usage forecasting process.
 * - DataUsageForecasterInput - The input type for the forecastDataUsage function.
 * - DataUsageForecasterOutput - The return type for the forecastDataUsage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DataUsageForecasterInputSchema = z.object({
  currentDataBalanceGB: z.number().describe('The user\'s current remaining data balance in GB.'),
  currentBundlePurchaseDate: z.string().datetime().describe('The date when the current data bundle was purchased (ISO 8601 format).'),
  purchaseHistory: z.array(z.object({
    gigabytes: z.number().describe('Size of the data bundle in GB.'),
    purchaseDate: z.string().datetime().describe('The date when this bundle was purchased (ISO 8601 format).'),
    daysLasted: z.number().describe('The number of days this bundle lasted until depletion or next purchase.'),
  })).describe('A chronological list of past data bundle purchases, including their size, purchase date, and how many days each bundle lasted.'),
});
export type DataUsageForecasterInput = z.infer<typeof DataUsageForecasterInputSchema>;

const DataUsageForecasterOutputSchema = z.object({
  estimatedDepletionDate: z.string().describe('The estimated date when the current data bundle will be completely depleted, based on historical usage patterns (YYYY-MM-DD format).'),
  recommendedTopUpDate: z.string().describe('The recommended date to top up the wallet to ensure continuous data access (YYYY-MM-DD format). This should be a few days before the estimated depletion date.'),
  averageDailyConsumptionGB: z.number().describe('The calculated average daily data consumption in GB based on the provided history, rounded to two decimal places.'),
  explanation: z.string().describe('A detailed explanation of how the forecast was derived, including the calculation of average daily consumption and the reasoning for the recommended top-up date.'),
});
export type DataUsageForecasterOutput = z.infer<typeof DataUsageForecasterOutputSchema>;

export async function forecastDataUsage(input: DataUsageForecasterInput): Promise<DataUsageForecasterOutput> {
  return dataUsageForecasterFlow(input);
}

const dataUsageForecasterPrompt = ai.definePrompt({
  name: 'dataUsageForecasterPrompt',
  input: { schema: DataUsageForecasterInputSchema },
  output: { schema: DataUsageForecasterOutputSchema },
  prompt: `You are an AI data usage forecaster for FalaaData. Your task is to analyze a user's past data bundle purchase history and their current data balance to predict when their current bundle will run out and recommend an efficient top-up date.\n\nToday's Date: {{currentDate}}\n\nUser's Current Data Balance: {{currentDataBalanceGB}} GB\nCurrent Bundle Purchased On: {{currentBundlePurchaseDate}}\n\nPast Data Purchase History (chronological order):\n{{#each purchaseHistory}}\n- Purchased {{gigabytes}} GB on {{purchaseDate}}, which lasted for approximately {{daysLasted}} days.\n{{/each}}\n\nBased on this information, perform the following steps:\n1. Calculate the average daily data consumption in GB from the 'Past Data Purchase History'. Sum up all 'gigabytes' and all 'daysLasted' from the history, then divide the total gigabytes by the total days lasted. Round this average daily consumption to two decimal places.\n2. Using the calculated average daily consumption and the 'User's Current Data Balance', estimate how many days the current balance will last.\n3. Determine the 'Estimated Depletion Date' by adding the estimated days remaining to 'Today's Date'. Format this as YYYY-MM-DD.\n4. Determine the 'Recommended Top-Up Date'. This should be 2-3 days BEFORE the 'Estimated Depletion Date' to ensure the user doesn't run out of data. Format this as YYYY-MM-DD.\n5. Provide a clear and concise 'Explanation' of your forecast, detailing the average daily consumption calculation, how many days the current balance is expected to last, and the logic behind both the estimated depletion date and the recommended top-up date.\n\nAssume data consumption is consistent based on historical patterns. If the purchase history is empty or insufficient to calculate average usage, make a reasonable estimate and explain your assumptions. Always provide dates in YYYY-MM-DD format.`,
});

const dataUsageForecasterFlow = ai.defineFlow(
  {
    name: 'dataUsageForecasterFlow',
    inputSchema: DataUsageForecasterInputSchema,
    outputSchema: DataUsageForecasterOutputSchema,
  },
  async (input) => {
    const currentDate = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    const { output } = await dataUsageForecasterPrompt({ ...input, currentDate });
    return output!;
  }
);
