export const basePrompt = (input: {
    country: string;
    intervention: string;
    disease: string;
    subgroup: string;
  }) => 
  `I'm a healthcare strategy consultant for Foundry Health based in Australia - we handle strategy projects for healthcare organizations, startups, and investors to help them navigate the complex healthcare landscape and drive innovation.
  
  I am estimating the market size for ${input.intervention} for its use in ${input.disease} ${input.subgroup ? `in ${input.subgroup}` : ''} in ${input.country}.

  Please output your results as a Markdown table with columns: Metric, Value, and Source.

  Can you extract and compile data regarding the following:`