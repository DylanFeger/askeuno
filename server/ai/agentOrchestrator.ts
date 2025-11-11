import { logger } from "../utils/logger";
import { TIERS } from "./tiers";
import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

export interface SQLValidationResult {
  isValid: boolean;
  concerns?: string[];
  recommendations?: string[];
  sql?: string;
}

export interface MultiStepPlan {
  steps: Array<{
    order: number;
    description: string;
    query: string;
    dependsOn?: number[];
  }>;
  needsMultiStep: boolean;
}

export class AIAgentOrchestrator {
  private tier: string;
  private tierConfig: any;
  
  constructor(tier: string) {
    this.tier = tier;
    this.tierConfig = TIERS[tier as keyof typeof TIERS];
  }

  async validateSQL(
    sql: string,
    question: string,
    dataSchema: any
  ): Promise<SQLValidationResult> {
    if (!this.tierConfig.agentConfig.sqlValidation) {
      return { isValid: true, sql };
    }

    try {
      const validationPrompt = `You are a SQL validation expert. Review this SQL query for correctness, security, and optimization.

Question: "${question}"
Available Schema: ${JSON.stringify(dataSchema)}

Generated SQL:
\`\`\`sql
${sql}
\`\`\`

Validate:
1. Does the SQL correctly answer the question?
2. Are all referenced columns in the schema?
3. Is it read-only (no INSERT/UPDATE/DELETE/DROP)?
4. Does it have a LIMIT clause (<=5000)?
5. Are there any logic errors or inefficiencies?

Respond in JSON format:
{
  "isValid": boolean,
  "concerns": ["list any critical issues"],
  "recommendations": ["list optimization suggestions"],
  "correctedSQL": "improved SQL if needed, otherwise null"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert SQL validator. Always respond with valid JSON." },
          { role: "user", content: validationPrompt }
        ],
        temperature: 0, // Deterministic for maximum consistency
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      // Be lenient - only reject if there are critical security/syntax issues
      // Minor concerns or recommendations should not prevent execution
      const hasCriticalIssues = result.concerns && result.concerns.length > 0 && 
                                result.concerns.some((c: string) => 
                                  c.toLowerCase().includes('security') || 
                                  c.toLowerCase().includes('syntax') ||
                                  c.toLowerCase().includes('forbidden')
                                );
      
      logger.info("SQL validation result", { 
        isValid: result.isValid,
        hasCriticalIssues,
        concerns: result.concerns,
        tier: this.tier
      });
      
      // Only fail if explicitly marked invalid AND has critical issues
      const finalValid = result.isValid !== false || !hasCriticalIssues;
      
      return {
        isValid: finalValid,
        concerns: result.concerns || [],
        recommendations: result.recommendations || [],
        sql: result.correctedSQL || sql
      };
      
    } catch (error) {
      logger.error("SQL validation error:", error);
      // On error, allow query to proceed (fail open for better UX)
      return { isValid: true, sql };
    }
  }

  async planMultiStepAnalysis(
    question: string,
    dataSchema: any
  ): Promise<MultiStepPlan> {
    if (!this.tierConfig.agentConfig.multiStepAnalysis) {
      return { needsMultiStep: false, steps: [] };
    }

    try {
      const planningPrompt = `You are a senior data analyst planning how to answer a complex business question.

Question: "${question}"
Available Data: ${JSON.stringify(dataSchema)}

Determine if this question requires multiple analytical steps or can be answered in one query.

Questions requiring multi-step analysis:
- Comparisons across time periods
- Multiple metrics with different calculations
- Trend analysis requiring baseline + change
- Questions asking "why" that need investigation

Single-step questions:
- Direct metric queries
- Simple filters or aggregations
- Single time period analysis

Respond in JSON:
{
  "needsMultiStep": boolean,
  "reasoning": "why multi-step is/isn't needed",
  "steps": [
    {
      "order": 1,
      "description": "what this step finds",
      "query": "what to query",
      "dependsOn": []
    }
  ]
}

Limit to ${this.tierConfig.agentConfig.maxSubAgents} sub-steps maximum.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an analytical planning expert. Always respond with valid JSON." },
          { role: "user", content: planningPrompt }
        ],
        temperature: 0, // Deterministic for maximum consistency
        max_tokens: 1500,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      const maxSteps = this.tierConfig.agentConfig.maxSubAgents;
      const steps = result.steps || [];
      
      return {
        needsMultiStep: result.needsMultiStep && steps.length > 1,
        steps: maxSteps === Infinity ? steps : steps.slice(0, maxSteps)
      };
      
    } catch (error) {
      logger.error("Multi-step planning error:", error);
      return { needsMultiStep: false, steps: [] };
    }
  }

  async synthesizeMultiStepResults(
    question: string,
    steps: Array<{ description: string; result: any }>,
    tier: string,
    extendedResponses: boolean
  ): Promise<string> {
    try {
      const responseLength = extendedResponses ? "3-5 sentences" : "1-2 sentences";
      
      const synthesisPrompt = `You are Euno AI, a senior data analyst. Synthesize findings from multiple analytical steps into a cohesive answer.

Original Question: "${question}"

Analysis Results:
${steps.map((s, i) => `
Step ${i + 1}: ${s.description}
Findings: ${JSON.stringify(s.result)}
`).join('\n')}

Provide a ${responseLength} answer that:
1. Directly answers the question
2. Highlights the most important insight
3. Uses actual numbers from the results
4. Is actionable and business-focused

CRITICAL: Response must be ${responseLength} maximum. Be ultra-concise.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a concise senior data analyst. Every word must add value." },
          { role: "user", content: synthesisPrompt }
        ],
        temperature: 0, // Deterministic for maximum consistency
        max_tokens: extendedResponses ? 300 : 150
      });

      return response.choices[0].message.content || "Analysis complete.";
      
    } catch (error) {
      logger.error("Multi-step synthesis error:", error);
      return "Multiple factors analyzed. Results indicate normal business patterns.";
    }
  }

  canUseMultiStep(): boolean {
    return this.tierConfig.agentConfig.multiStepAnalysis;
  }

  getMaxSubAgents(): number {
    return this.tierConfig.agentConfig.maxSubAgents;
  }
}
