'use server';
/**
 * @fileOverview Elite Product Research AI Agent.
 * Generates professional, SEO-optimized product descriptions with strict word counts.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ProductResearchInputSchema = z.object({
  productName: z.string().describe('The name of the product to research.'),
  category: z.string().optional().describe('The product category.'),
});

const ProductResearchOutputSchema = z.object({
  introduction: z.string().describe('Introduction of EXACTLY 30 to 40 words about the product impact.'),
  companyInfo: z.string().describe('Details about the manufacturer and company history, EXACTLY 50 to 60 words.'),
  benefits: z.array(z.string()).min(6).max(10).describe('Exactly 6 to 10 high-impact benefit points.'),
  seoTags: z.array(z.string()).min(15).describe('Exactly 15 relevant SEO tags and keywords.'),
  marketingBanner: z.object({
    headline: z.string(),
    subheadline: z.string(),
    marketingTip: z.string(),
  }),
});

export type ProductResearchInput = z.infer<typeof ProductResearchInputSchema>;
export type ProductResearchOutput = z.infer<typeof ProductResearchOutputSchema>;

export async function researchProduct(input: ProductResearchInput): Promise<ProductResearchOutput> {
  const result = await productResearchFlow(input);
  return result;
}

const prompt = ai.definePrompt({
  name: 'productResearchPrompt',
  input: { schema: ProductResearchInputSchema },
  output: { schema: ProductResearchOutputSchema },
  prompt: `You are an elite market research agent with deep expertise in retail and brand strategy. 
  Your task is to perform deep-dive research for "{{{productName}}}" in the "{{{category}}}" category.

Your requirements are EXTREMELY STRICT:
1. **Introduction**: Write a MINIMUM of 30 words describing the product's role, impact, and consumer appeal. Be authoritative.
2. **Brand & Company Profile**: Write a MINIMUM of 50 words about the manufacturer (e.g., origin, quality standards, and market position).
3. **Benefits**: Provide EXACTLY 6 to 10 high-impact bullet points of specific advantages.
4. **SEO Keywords**: Provide exactly 15 high-volume, relevant tags.
5. **Marketing Banner**: Create a catchy headline and a professional "Pro-Tip" for customers.

Synthesize the best information available to ensure the profile is accurate, professional, and high-quality. Use industry-standard SEO practices.`,
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