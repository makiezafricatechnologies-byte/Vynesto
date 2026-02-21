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
  introduction: z.string().describe('Introduction of at least 30 words about the product impact.'),
  companyInfo: z.string().describe('Details about the manufacturer and company history, minimum 50 words.'),
  benefits: z.array(z.string()).min(6).max(10).describe('Exactly 6 to 10 high-impact benefit points.'),
  seoTags: z.array(z.string()).min(15).describe('At least 15 relevant SEO tags and keywords.'),
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
  prompt: `You are an elite market research agent. 
Perform a deep-dive search for information regarding "{{{productName}}}" in the "{{{category}}}" category.

Your requirements are strict:
1. **Introduction**: Write a minimum of 30 words describing the product's role in the consumer's life.
2. **Product & Company Profile**: Write a minimum of 50 words about the manufacturer (e.g., Pembe Flour Mills for Ajab) including history and quality standards.
3. **Benefits**: Provide exactly 6 to 10 bullet points of specific advantages.
4. **SEO Keywords**: List exactly 15 high-volume search terms.
5. **Marketing Banner**: Create a catchy headline, subheadline, and a "Pro-Tip" for customers.

CRITICAL: If specific data is limited, research the leading brand in this specific industry to provide an authoritative profile.`,
});

const productResearchFlow = ai.defineFlow(
  {
    name: 'productResearchFlow',
    inputSchema: ProductResearchInputSchema,
    outputSchema: ProductResearchOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error('AI research failed to produce structured data.');
    return output;
  }
);