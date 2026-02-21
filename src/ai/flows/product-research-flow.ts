
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
  const result = await productResearchFlow(input);
  return result;
}

const prompt = ai.definePrompt({
  name: 'productResearchPrompt',
  input: { schema: ProductResearchInputSchema },
  output: { schema: ProductResearchOutputSchema },
  prompt: `You are an elite market research agent. Your task is to perform deep-dive research for "{{{productName}}}" in the "{{{category}}}" category.

Your requirements are STRICT:
1. **Introduction**: Write a MINIMUM of 30 words describing the product's role and consumer impact.
2. **Brand & Company Profile**: Write a MINIMUM of 50 words about the manufacturer (e.g., historical context, quality standards, market position).
3. **Benefits**: Provide EXACTLY 6 to 10 high-impact bullet points of specific advantages.
4. **SEO Keywords**: Provide exactly 15 high-volume tags.
5. **Marketing Banner**: Create a catchy headline and a professional "Pro-Tip" for customers.

Search for authoritative information online to ensure the profile is accurate and professional. Use industry-standard SEO practices.`,
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
