import {basePrompt} from './basePrompt';
import {endPrompt} from './endPrompt';

export const interventionPrompt = (input: {
  country: string;
  intervention: string;
  disease: string;
  subgroup: string;
}) => 
`${basePrompt(input)}
1. Intervention utilisation by clinical practice guidelines - how is the drug being used by physicians. Give detail on the indications, adverse events, use in different populations including pregnancy, paediatrics, geriatric. Include rates of adverse events.
2. Physician prescribing data - give accurate data on how the drug is being prescribed in the US by physicians. Get the exact prescribing data from regulatory bodies or other publications - I want yearly trends of how many prescriptions were given. 
3. Real-world utilisation and patient utilisation data - give accurate numbers for how many people are using the drug and how they are using the drug e.g. what frequency, dosing, what percentage are using each dose. Give me the proportion of patients taking each dose, rates of discontinuation, summation of total users.
4. Contraindication data - what are the main contraindications, how many people are affected. Give the exact calculations and final number of people who would be affected by the side effect, using up to date data.

${endPrompt(input)}`