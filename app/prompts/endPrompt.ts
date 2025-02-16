export const endPrompt = (input: {
    country: string;
    intervention: string;
    disease: string;
    subgroup: string;
  }) => 
`Make sure all this data is tailored to the ${input.country} population. Make sure to only use data from official web sources - government sources 
or reliable audit data, census data, regulatory bodies, journal publications. 
Make sure to cite each piece of data with the correct reliable source. 
State any assumptions where they are made. 
I want hard numbers only or estimates as an alternative (only where absolutely necessary). 
Find exact data for anything not specified - I'm not taking that as an answer, if you have to do estimates or extrapolations do it.

Please output your results as a Markdown table with columns: Metric, Value, and Source.`