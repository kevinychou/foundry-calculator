import {basePrompt} from './basePrompt';
import {endPrompt} from './endPrompt';

export const epidemiologyPrompt = (input: {
  country: string;
  intervention: string;
  disease: string;
  subgroup: string;
}) => 
`${basePrompt(input)}
1. Disease definition. Find the relevant ICD or SNOMED codes for ${input.disease}. Include the code, description, classification, and any adidtional relevant information.
2. Prevalence. Give the accurate data of the prevalence of ${input.disease} in ${input.country}. Make sure to indicate source, and only use high quality sources were available. Make sure to include the following information: Sample Number, % Prevalence, Source.
3. Demographic/subset of population. Estimate the prevalence of ${input.disease} ${input.subgroup ? `in ${input.subgroup}` : '>18 years old'} in ${input.country}. Again, make sure to only use high quality sources where available.
${endPrompt(input)}`;
