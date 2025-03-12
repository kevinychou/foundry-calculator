import {basePrompt} from './basePrompt';
import {endPrompt} from './endPrompt';

export const pricingPrompt = (input: {
  country: string;
  intervention: string;
  disease: string;
  subgroup: string;
}) => 
`${basePrompt(input)}
1. Drug and drug dosage pricing data
2. Interval of drug usage
3. Insurance status and coverage (intervention eligibility status by coverage status, and insurance status by country population e.g private, medicare, medicaid, out of pocket)

Make sure to include your final estimated yearly annual cost in the markdown table, with the metric heading of "Final Cost" 
and that the quoted value is a number indicating the annual cost of the intervention.
${endPrompt(input)}`;