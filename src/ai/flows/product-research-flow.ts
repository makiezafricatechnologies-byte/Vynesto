'use server';
/**
 * @fileOverview Elite Product Research AI Agent.
 * Performs deep-dive research to generate professional, SEO-optimized product descriptions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ProductResearchInputSchema = z.object({
  productName: z.string().describe('The name of the product to research.'),
  category: z.string().optional().describe('The product category.'),
});

const ProductResearchOutputSchema = z.object({
  introduction: z.string().describe('Introduction of at least 30 words about the product.'),
  companyInfo: z.string().describe('Details about the manufacturer/company of at least 50 words.'),
  benefits: z.array(z.string()).min(6).max(10).describe('6 to 10 high-impact benefit points.'),
  seoTags: z.array(z.string()).min(15).describe('At least 15 relevant SEO tags.'),
  marketingBanner: z.object({
    headline: z.string(),
    subheadline: z.string(),
    marketingTip: z.string(),
  }),
});

export type ProductResearchInput = z.infer<typeof ProductResearchInputSchema>;
export type ProductResearchOutput = z.infer<typeof ProductResearchOutputSchema>;

export async function researchProduct(input: ProductResearchInput): Promise<ProductResearchOutput> {
  return productResearchFlow(input);
}

const prompt = ai.definePrompt({
  name: 'productResearchPrompt',
  input: { schema: ProductResearchInputSchema },
  output: { schema: ProductResearchOutputSchema },
  prompt: `You are an elite market research agent and SEO copywriter. 
Act as if you are searching the live web to find deep insights about "{{{productName}}}" (Category: {{{category}}}).

Your mission is to provide an authoritative, high-conversion description for Frewsie Shop.

1. **Introduction**: Write EXACTLY 30-50 words introducing the product. Focus on its lifestyle impact and why it is essential. Use an engaging, professional tone.
2. **Product & Company Profile**: Write EXACTLY 50-80 words detailing the manufacturing standards, the reputation of the company that makes "{{{productName}}}", and the technical origin of the product.
3. **High-Impact Benefits**: Provide exactly 6 to 10 bullet points. Each point must be a specific value proposition that solves a customer problem.
4. **SEO & Visibility**: Provide exactly 15 highly-searched keywords and SEO tags.
5. **Creative Marketing Banner**: 
   - Headline: A catchy 3-5 word hook.
   - Subheadline: A value-driven secondary line.
   - Marketing Tip: A "pro-tip" or "secret" about the product that makes it irresistible.

CRITICAL: Do not give short, generic answers. Every section must meet the word count requirements exactly. If you are unsure of the specific company, research the most likely industry leader for this product type.`,
});

const productResearchFlow = ai.defineFlow(
  {
    name: 'productResearchFlow',
    inputSchema: ProductResearchInputSchema,
    outputSchema: ProductResearchOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error('AI failed to generate a comprehensive research profile.');
    return output;
  }
);
